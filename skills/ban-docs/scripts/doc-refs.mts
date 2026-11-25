// Lists references in Markdown files that no longer resolve: relative links and anchors, local paths
// cited in inline code, and package scripts run through pnpm, npm, yarn or bun.
// Usage: node doc-refs.mts <repo> [-- <file>...]   (no files: every tracked or new .md/.mdx file)
// Requires Node 22.18+ (type stripping) and git.
import { execFile } from "node:child_process";
import { realpathSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { parseArgs, promisify } from "node:util";

export type Kind = "link" | "anchor" | "path" | "script";
export type Finding = { file: string; line: number; kind: Kind; target: string; reason: string };

const exec = promisify(execFile);
const LINK = /!?\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
const CODE_SPAN = /`([^`\n]+)`/g;
const FENCE = /^\s*(```|~~~)\s*([\w-]*)/;
const SHELL_FENCES = new Set(["", "bash", "sh", "shell", "zsh", "console"]);
/** A path-like token: two or more segments, no spaces, placeholders, globs or line suffixes. */
const PATH_LIKE = /^(\.{1,2}\/)?[\w.@-]+(\/[\w.@-]+)+\/?$/;
const MARKDOWN = /\.mdx?$/;
/** Flags that send the command to another package; its scripts are not the ones beside the file. */
const OTHER_PACKAGE = new Set(["-C", "--dir", "--filter", "-F", "-r", "--recursive", "-w", "--workspace", "--workspace-root", "--prefix", "--cwd"]);
const PNPM_BUILTINS = new Set([
  "add", "approve-builds", "audit", "bin", "c", "config", "create", "dedupe", "deploy", "dlx", "doctor", "env", "exec",
  "fetch", "help", "i", "import", "init", "install", "install-test", "it", "licenses", "link", "list", "ln", "ls",
  "outdated", "pack", "patch", "patch-commit", "prune", "publish", "rb", "rebuild", "remove", "rm", "root", "self-update",
  "server", "setup", "store", "un", "uninstall", "unlink", "up", "update", "upgrade", "why", "x",
]);
const YARN_BUILTINS = new Set([
  "add", "audit", "autoclean", "bin", "cache", "check", "config", "constraints", "create", "dedupe", "dlx", "exec",
  "explain", "generate-lock-entry", "global", "import", "info", "init", "install", "licenses", "link", "list", "login",
  "logout", "node", "npm", "outdated", "owner", "pack", "patch", "plugin", "policies", "publish", "rebuild", "remove",
  "set", "tag", "team", "unlink", "up", "upgrade", "version", "why", "workspace", "workspaces",
]);

/** The script a package-manager command runs, or undefined when it runs a built-in or another package. */
export function scriptOf(command: string): string | undefined {
  const [tool, ...args] = command.trim().split(/\s+/);
  if (args.some((arg) => OTHER_PACKAGE.has(arg.split("=")[0] ?? ""))) return undefined;
  const [first, second] = args;
  let name: string | undefined;
  if (first === "run" || first === "run-script") name = second;
  else if (tool === "npm") name = first === "test" || first === "start" ? first : undefined;
  else if (tool === "pnpm") name = first && !PNPM_BUILTINS.has(first) ? first : undefined;
  else if (tool === "yarn") name = first && !YARN_BUILTINS.has(first) ? first : undefined;
  if (!name || name.startsWith("-") || /[<>{}$]/.test(name)) return undefined;
  return name;
}

/** GitHub heading anchors: lowercase, punctuation dropped, spaces as hyphens, repeats numbered. */
export function anchors(text: string): Set<string> {
  const seen = new Map<string, number>();
  const out = new Set<string>();
  let fence: string | undefined;
  for (const line of text.split("\n")) {
    const open = FENCE.exec(line)?.[1];
    if (open && (!fence || open === fence)) {
      fence = fence ? undefined : open;
      continue;
    }
    if (fence) continue;
    const heading = /^#{1,6}\s+(.+?)\s*#*\s*$/.exec(line);
    if (!heading?.[1]) continue;
    const slug = heading[1].replace(/`/g, "").toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, "").replace(/\s/g, "-");
    const count = seen.get(slug) ?? 0;
    seen.set(slug, count + 1);
    out.add(count === 0 ? slug : `${slug}-${count}`);
  }
  return out;
}

async function exists(abs: string): Promise<boolean> {
  return stat(abs).then(() => true, () => false);
}

/**
 * Checks one Markdown file of `repo`; `rel` is its path from the repository root. `scripts` holds the script
 * names of every package.json in the repository, since a doc may tell the reader to run them from another folder.
 */
export async function checkFile(repo: string, rel: string, scripts?: Set<string>): Promise<Finding[]> {
  const abs = path.join(repo, rel);
  const dir = path.dirname(abs);
  const text = await readFile(abs, "utf8");
  const findings: Finding[] = [];
  const add = (line: number, kind: Kind, target: string, reason: string) => findings.push({ file: rel, line, kind, target, reason });
  let fence: { mark: string; shell: boolean } | undefined;

  const checkScript = (line: number, command: string) => {
    if (!/^(pnpm|npm|yarn|bun)\s/.test(command.trim()) || !scripts) return;
    const name = scriptOf(command);
    if (name && !scripts.has(name)) add(line, "script", command.trim(), `no package.json in the repository has a "${name}" script`);
  };

  const lines = text.split("\n");
  for (const [index, line] of lines.entries()) {
    const number = index + 1;
    const open = FENCE.exec(line);
    if (open?.[1] && (!fence || open[1] === fence.mark)) {
      fence = fence ? undefined : { mark: open[1], shell: SHELL_FENCES.has((open[2] ?? "").toLowerCase()) };
      continue;
    }
    if (fence) {
      if (fence.shell) checkScript(number, line.replace(/^\s*\$\s*/, ""));
      continue;
    }

    for (const match of line.replace(CODE_SPAN, "").matchAll(LINK)) {
      const target = match[1] ?? "";
      if (/^[a-z][a-z0-9+.-]*:/i.test(target)) continue;
      const [rawPath = "", anchor] = target.split("#", 2);
      let decoded: string;
      try {
        decoded = decodeURIComponent(rawPath);
      } catch {
        add(number, "link", target, "malformed link");
        continue;
      }
      const resolved = !decoded ? abs : decoded.startsWith("/") ? path.join(repo, decoded) : path.join(dir, decoded);
      if (!(await exists(resolved))) {
        add(number, "link", target, "target does not exist");
        continue;
      }
      if (anchor && MARKDOWN.test(resolved)) {
        const found = resolved === abs ? anchors(text) : anchors(await readFile(resolved, "utf8"));
        if (!found.has(anchor)) add(number, "anchor", target, "no heading with this anchor");
      }
    }

    for (const match of line.matchAll(CODE_SPAN)) {
      const span = (match[1] ?? "").trim();
      checkScript(number, span);
      const reason = await missingPath(repo, dir, span);
      if (reason) add(number, "path", span, reason);
    }
  }
  return findings;
}

/**
 * A cited path is local when it starts with `./` or `../`, or when its first segment exists from the file's
 * folder or the repository root. Tokens like `owner/repo` or `@scope/pkg` resolve nowhere and are skipped.
 */
async function missingPath(repo: string, dir: string, span: string): Promise<string | undefined> {
  if (!PATH_LIKE.test(span) || span.startsWith("@") || span.split("/").includes("...")) return undefined;
  if (span.startsWith("./") || span.startsWith("../")) {
    return (await exists(path.join(dir, span))) ? undefined : "relative path does not exist";
  }
  const first = span.split("/")[0] ?? "";
  for (const base of [dir, repo]) {
    if (await exists(path.join(base, span))) return undefined;
  }
  for (const base of [dir, repo]) {
    if (await exists(path.join(base, first))) return `"${first}" exists but the full path does not`;
  }
  return undefined;
}

/** Script names of every tracked or new package.json; undefined when the repository has none. */
export async function repoScripts(repo: string): Promise<Set<string> | undefined> {
  const manifests = await gitFiles(repo, ["package.json", "**/package.json"]);
  if (!manifests.length) return undefined;
  const names = new Set<string>();
  for (const manifest of manifests) {
    try {
      const parsed = JSON.parse(await readFile(path.join(repo, manifest), "utf8")) as { scripts?: Record<string, string> };
      for (const name of Object.keys(parsed.scripts ?? {})) names.add(name);
    } catch {
      // A broken manifest shows up in the project's own tooling; its scripts just do not count here.
    }
  }
  return names;
}

async function gitFiles(repo: string, patterns: string[]): Promise<string[]> {
  const { stdout } = await exec("git", ["-C", repo, "ls-files", "-z", "--cached", "--others", "--exclude-standard", "--", ...patterns], { maxBuffer: 64 * 1024 * 1024 });
  return [...new Set(stdout.split("\0").filter(Boolean))].sort();
}

export async function main(argv: string[], print: (line: string) => void = console.log): Promise<number> {
  const { positionals } = parseArgs({ args: argv, allowPositionals: true, options: {} });
  const [repoArg, ...fileArgs] = positionals;
  if (!repoArg) throw new Error("usage: node doc-refs.mts <repo> [-- <file>...]");
  const repo = path.resolve(repoArg);
  const files = fileArgs.length ? fileArgs.map((file) => path.relative(repo, path.resolve(repo, file))) : await gitFiles(repo, ["*.md", "*.mdx"]);
  const scripts = await repoScripts(repo);
  let count = 0;
  for (const file of files) {
    for (const finding of await checkFile(repo, file, scripts)) {
      count++;
      print(`${finding.file}:${finding.line}: ${finding.kind} ${finding.target}: ${finding.reason}`);
    }
  }
  print(count ? `doc-refs: ${count} broken reference(s) in ${files.length} file(s)` : `doc-refs: ok (${files.length} file(s))`);
  return count ? 1 : 0;
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
