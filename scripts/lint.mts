import { realpathSync } from "node:fs";
import { lstat, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";

export type Harness = "claude" | "codex";
export const HARNESSES: Harness[] = ["claude", "codex"];
/** Placeholders the profile build fills in `SKILL.md`, code blocks included. */
export const PLACEHOLDERS = ["{{ARTIFACTS_DIR}}", "{{SCRIPTS_DIR}}"];
export const DEFAULT_SKILLS = path.join(path.dirname(import.meta.dirname), "skills");

export type LintIssue = { harness: Harness; file: string; message: string };

/** A file of the compiled skill: its path inside the skill and its source on disk. */
export type SkillFile = { rel: string; abs: string };

/** A skill as the build compiles it for one harness: core `SKILL.md` plus the harness extension, and its files. */
export type CompiledSkill = { name: string; text: string; files: SkillFile[] };

const NAME = /^[a-z0-9]+(-[a-z0-9]+)*$/;
// Limits of the Agent Skills format read by both harnesses.
const MAX_NAME = 64;
const MAX_DESCRIPTION = 1024;
const LINK = /!?\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
const PLACEHOLDER = /\{\{[A-Z_]+\}\}/g;
const EXTENSIONS = "extensions";
const SCRIPT_TEST = /\.test\.m?ts$/;

/** Same merge as the profile build: the extension text closes the core text. */
export function mergeMarkdown(core: string, extension: string): string {
  return `${core.trimEnd()}\n\n${extension.trim()}\n`;
}

/** Reads every skill in `skillsDir` as the build would compile it for `harness`. */
export async function compileCatalog(skillsDir: string, harness: Harness): Promise<CompiledSkill[]> {
  const skills: CompiledSkill[] = [];
  for (const name of (await readdir(skillsDir)).sort()) {
    const source = path.join(skillsDir, name);
    if (name.startsWith(".") || !(await lstat(source)).isDirectory()) continue;
    const skillPath = path.join(source, "SKILL.md");
    const core = await readFile(skillPath, "utf8").catch(() => undefined);
    if (core === undefined) continue;
    const files = (await walk(source, EXTENSIONS)).filter((file) => !(file.rel.startsWith("scripts/") && SCRIPT_TEST.test(file.rel)));
    const extDir = path.join(source, EXTENSIONS, harness);
    let text = core;
    for (const file of await walk(extDir).catch(() => [])) {
      if (file.rel === "SKILL.md") text = mergeMarkdown(core, await readFile(file.abs, "utf8"));
      else if (!file.rel.startsWith("agents/") || (harness === "codex" && file.rel === "agents/openai.yaml")) files.push(file);
    }
    skills.push({ name, text, files });
  }
  return skills;
}

/**
 * Checks what the build can prove about the catalog: the frontmatter both harnesses require,
 * relative links and anchors that resolve inside the compiled skill or its siblings, and placeholders the build fills.
 */
export async function lintCatalog(skillsDir: string, harnesses: Harness[] = HARNESSES): Promise<LintIssue[]> {
  const issues: LintIssue[] = [];
  for (const harness of harnesses) {
    const skills = await compileCatalog(skillsDir, harness);
    const catalog = new Map(skills.map((skill) => [skill.name, skill]));
    for (const skill of skills) {
      for (const issue of await lintSkill(skill, catalog)) issues.push({ harness, ...issue });
    }
  }
  // The same core problem shows once per harness; keep one.
  const seen = new Set<string>();
  return issues.filter((issue) => {
    const key = `${issue.file}\0${issue.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function lintSkill(skill: CompiledSkill, catalog: Map<string, CompiledSkill>): Promise<Array<Omit<LintIssue, "harness">>> {
  const issues: Array<Omit<LintIssue, "harness">> = [];
  const { name, files } = skill;
  const skillFile = `${name}/SKILL.md`;
  const frontmatter = parseFrontmatter(skill.text);
  if (!frontmatter) {
    issues.push({ file: skillFile, message: "missing frontmatter (--- name, description ---)" });
  } else {
    const skillName = frontmatter.get("name");
    if (skillName !== name) issues.push({ file: skillFile, message: `frontmatter name "${skillName ?? ""}" must match the folder "${name}"` });
    if (!NAME.test(name) || name.length > MAX_NAME) issues.push({ file: skillFile, message: `name must be lowercase words joined by hyphens, up to ${MAX_NAME} characters` });
    const description = frontmatter.get("description")?.trim() ?? "";
    if (!description) issues.push({ file: skillFile, message: "frontmatter description is empty" });
    if (description.length > MAX_DESCRIPTION) issues.push({ file: skillFile, message: `description has ${description.length} characters; the limit is ${MAX_DESCRIPTION}` });
  }

  const texts = new Map<string, string>([["SKILL.md", skill.text]]);
  for (const file of files) {
    if (file.rel !== "SKILL.md" && file.rel.endsWith(".md")) texts.set(file.rel, await readFile(file.abs, "utf8"));
  }
  const headings = new Map<string, Set<string>>();
  const headingsOf = async (owner: CompiledSkill, rel: string): Promise<Set<string> | undefined> => {
    const key = `${owner.name}/${rel}`;
    if (!headings.has(key)) {
      const file = owner.files.find((entry) => entry.rel === rel);
      const text = rel === "SKILL.md" ? owner.text : owner === skill ? texts.get(rel) : file && (await readFile(file.abs, "utf8"));
      if (text === undefined) return undefined;
      headings.set(key, anchors(text));
    }
    return headings.get(key);
  };

  for (const [rel, text] of texts) {
    for (const match of text.matchAll(PLACEHOLDER)) {
      if (!PLACEHOLDERS.includes(match[0])) issues.push({ file: `${name}/${rel}`, message: `unknown placeholder ${match[0]}` });
      else if (rel !== "SKILL.md") issues.push({ file: `${name}/${rel}`, message: `placeholder ${match[0]} is filled only in SKILL.md` });
    }
    for (const match of stripCode(text).matchAll(LINK)) {
      const target = match[1] ?? "";
      if (/^[a-z][a-z0-9+.-]*:/i.test(target)) continue;
      const [rawPath = "", anchor] = target.split("#", 2);
      let decoded: string;
      try {
        decoded = decodeURIComponent(rawPath);
      } catch {
        issues.push({ file: `${name}/${rel}`, message: `malformed link ${target}` });
        continue;
      }
      const resolved = decoded ? path.posix.normalize(path.posix.join(path.posix.dirname(rel), decoded)) : rel;
      // Skills are siblings in the build, so `../<skill>/...` reaches another skill of the catalog.
      const [ownerName, fileRel] = resolved.startsWith("../") ? splitSibling(resolved) : [name, resolved];
      const owner = ownerName === name ? skill : catalog.get(ownerName);
      if (!owner || !owner.files.some((file) => file.rel === fileRel)) {
        issues.push({ file: `${name}/${rel}`, message: `broken link ${target}` });
        continue;
      }
      if (anchor && fileRel.endsWith(".md")) {
        const found = await headingsOf(owner, fileRel);
        if (found && !found.has(anchor)) issues.push({ file: `${name}/${rel}`, message: `broken anchor ${target}` });
      }
    }
  }
  return issues;
}

function splitSibling(resolved: string): [string, string] {
  const [, skill = "", ...rest] = resolved.split("/");
  return [skill, rest.join("/")];
}

export function parseFrontmatter(text: string): Map<string, string> | undefined {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text);
  if (!match) return undefined;
  const fields = new Map<string, string>();
  for (const line of (match[1] ?? "").split(/\r?\n/)) {
    const field = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line);
    if (field?.[1]) fields.set(field[1], unquote((field[2] ?? "").trim()));
  }
  return fields;
}

function unquote(value: string): string {
  if (value.length >= 2 && value.startsWith("'") && value.endsWith("'")) return value.slice(1, -1).replaceAll("''", "'");
  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
    try {
      return JSON.parse(value) as string;
    } catch {
      // YAML escapes that JSON lacks; the raw text still shows whether the value is empty or too long.
      return value.slice(1, -1);
    }
  }
  return value;
}

/** GitHub heading anchors: lowercase, punctuation dropped, spaces as hyphens, repeats numbered. */
export function anchors(text: string): Set<string> {
  const seen = new Map<string, number>();
  const out = new Set<string>();
  for (const line of stripFences(text).split("\n")) {
    const heading = /^#{1,6}\s+(.+?)\s*#*\s*$/.exec(line);
    if (!heading?.[1]) continue;
    const slug = heading[1].replace(/`/g, "").toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, "").replace(/\s/g, "-");
    const count = seen.get(slug) ?? 0;
    seen.set(slug, count + 1);
    out.add(count === 0 ? slug : `${slug}-${count}`);
  }
  return out;
}

function stripFences(text: string): string {
  return text.replace(/^(```|~~~)[\s\S]*?^\1/gm, "");
}

function stripCode(text: string): string {
  return stripFences(text).replace(/`[^`\n]*`/g, "");
}

async function walk(root: string, skipTop?: string): Promise<SkillFile[]> {
  const out: SkillFile[] = [];
  const visit = async (dir: string, rel: string): Promise<void> => {
    for (const entry of (await readdir(dir, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.name.startsWith(".") || (rel === "" && entry.name === skipTop)) continue;
      const childRel = rel === "" ? entry.name : `${rel}/${entry.name}`;
      if (entry.isDirectory()) await visit(path.join(dir, entry.name), childRel);
      else if (entry.isFile()) out.push({ rel: childRel, abs: path.join(dir, entry.name) });
    }
  };
  await visit(root, "");
  return out;
}

export async function main(argv: string[], print: (line: string) => void = console.log): Promise<number> {
  const { values } = parseArgs({ args: argv, options: { skills: { type: "string" } } });
  const issues = await lintCatalog(values.skills ?? DEFAULT_SKILLS);
  for (const issue of issues) print(`${issue.file}: ${issue.message} (${issue.harness})`);
  if (issues.length === 0) print("skills lint: ok");
  return issues.length === 0 ? 0 : 1;
}

if (process.argv[1] && realpathSync(process.argv[1]) === import.meta.filename) {
  main(process.argv.slice(2)).then(
    (code) => { process.exitCode = code; },
    (error: unknown) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    },
  );
}
