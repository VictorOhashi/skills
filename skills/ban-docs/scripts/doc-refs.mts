// Lists references in Markdown files that no longer resolve: relative links and anchors, local paths
// cited in inline code, and package scripts run through pnpm, npm, yarn or bun.
// With --cited-by, lists instead every line outside each given file and its symlinks that names one of them.
// Usage: node doc-refs.mts <repo> [--cited-by] [-- <file>...]   (no files: every tracked or new .md/.mdx file)
// Requires Node 22.18+ (type stripping) and git.
import { execFile } from "node:child_process";
import { realpathSync } from "node:fs";
import { readdir, readFile, readlink, stat } from "node:fs/promises";
import path from "node:path";
import { parseArgs, promisify } from "node:util";

export type Kind = "link" | "anchor" | "path" | "script";
/** A line outside the cited file that names it, or a symlink to it, by file name. */
export type Citation = { cited: string; file: string; line: number; text: string };
const CITATION_TEXT = 200;
export type Finding = { file: string; line: number; kind: Kind; target: string; reason: string };
/**
 * What the repository can run by name: scripts of every package.json, and the binaries pnpm and yarn run in
 * place of a missing script. `bins` is undefined when nothing is installed, so a shorthand like `pnpm tsc` is unknown.
 */
export type Runnables = { scripts: Set<string>; bins: Set<string> | undefined };
/** `shorthand` marks the forms that run a binary when no script has that name: `pnpm <name>`, `yarn [run] <name>`, `bun run <name>`. */
export type ScriptRef = { name: string; shorthand: boolean };

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
  // Forwarded to npm.
  "access", "adduser", "bugs", "cache", "completion", "deprecate", "dist-tag", "docs", "edit", "info", "login", "logout",
  "org", "owner", "ping", "prefix", "profile", "repo", "search", "star", "stars", "team", "token", "unpublish", "version",
  "view", "whoami",
]);
const YARN_BUILTINS = new Set([
  "add", "audit", "autoclean", "bin", "cache", "check", "config", "constraints", "create", "dedupe", "dlx", "exec",
  "explain", "generate-lock-entry", "global", "import", "info", "init", "install", "licenses", "link", "list", "login",
  "logout", "node", "npm", "outdated", "owner", "pack", "patch", "plugin", "policies", "publish", "rebuild", "remove",
  "set", "tag", "team", "unlink", "up", "upgrade", "version", "why", "workspace", "workspaces",
]);

/** The script a package-manager command runs, or undefined when it runs a built-in or another package. */
export function scriptOf(command: string): ScriptRef | undefined {
  const [tool, ...args] = command.trim().split(/\s+/);
  if (args.some((arg) => OTHER_PACKAGE.has(arg.split("=")[0] ?? ""))) return undefined;
  const [first, second] = args;
  let name: string | undefined;
  let shorthand = false;
  if (first === "run" || first === "run-script") {
    name = second;
    // `yarn run` and `bun run` also run a binary; pnpm and npm require a script.
    shorthand = tool === "yarn" || tool === "bun";
  }
  else if (tool === "npm") name = first === "test" || first === "start" ? first : undefined;
  else if (tool === "pnpm" || tool === "yarn") {
    name = first && !(tool === "pnpm" ? PNPM_BUILTINS : YARN_BUILTINS).has(first) ? first : undefined;
    shorthand = name !== "test" && name !== "start";
  }
  if (!name || name.startsWith("-") || /[<>{}$]/.test(name)) return undefined;
  return { name, shorthand };
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
 * Checks one Markdown file of `repo`; `rel` is its path from the repository root. `runnables` covers every
 * package.json in the repository, since a doc may tell the reader to run a script from another folder.
 */
export async function checkFile(repo: string, rel: string, runnables?: Runnables): Promise<Finding[]> {
  const abs = path.join(repo, rel);
  const dir = path.dirname(abs);
  const text = await readFile(abs, "utf8");
  const findings: Finding[] = [];
  const add = (line: number, kind: Kind, target: string, reason: string) => findings.push({ file: rel, line, kind, target, reason });
  let fence: { mark: string; shell: boolean } | undefined;

  const checkScript = (line: number, command: string) => {
    if (!/^(pnpm|npm|yarn|bun)\s/.test(command.trim()) || !runnables) return;
    const ref = scriptOf(command);
    if (!ref || runnables.scripts.has(ref.name)) return;
    if (ref.shorthand && (!runnables.bins || runnables.bins.has(ref.name))) return;
    const reason = ref.shorthand ? "no script or installed binary" : "no script";
    add(line, "script", command.trim(), `${reason} named "${ref.name}" in the repository`);
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
 * folder or one of its parents up to the repository root. Tokens like `owner/repo` or `@scope/pkg` resolve
 * nowhere and are skipped.
 */
async function missingPath(repo: string, dir: string, span: string): Promise<string | undefined> {
  if (!PATH_LIKE.test(span) || span.startsWith("@") || span.split("/").includes("...")) return undefined;
  if (span.startsWith("./") || span.startsWith("../")) {
    return (await exists(path.join(dir, span))) ? undefined : "relative path does not exist";
  }
  const first = span.split("/")[0] ?? "";
  const bases: string[] = [];
  for (let base = dir; base === repo || base.startsWith(repo + path.sep); base = path.dirname(base)) {
    bases.push(base);
    if (base === repo) break;
  }
  for (const base of bases) {
    if (await exists(path.join(base, span))) return undefined;
  }
  for (const base of bases) {
    if (await exists(path.join(base, first))) return `"${first}" exists but the full path does not`;
  }
  return undefined;
}

/** Scripts and runnable binaries of every tracked or new package.json; undefined when the repository has none. */
export async function repoRunnables(repo: string): Promise<Runnables | undefined> {
  const manifests = await gitFiles(repo, ["package.json", "**/package.json"]);
  if (!manifests.length) return undefined;
  const scripts = new Set<string>();
  const deps = new Set<string>();
  let installed: Set<string> | undefined;
  for (const manifest of manifests) {
    try {
      const parsed = JSON.parse(await readFile(path.join(repo, manifest), "utf8")) as Record<string, Record<string, string> | undefined>;
      for (const name of Object.keys(parsed.scripts ?? {})) scripts.add(name);
      for (const field of ["dependencies", "devDependencies"]) {
        for (const name of Object.keys(parsed[field] ?? {})) deps.add(name.replace(/^@[^/]+\//, ""));
      }
    } catch {
      // A missing or broken manifest shows up in the project's own tooling; it just does not count here.
    }
    const bin = await readdir(path.join(repo, path.dirname(manifest), "node_modules", ".bin")).catch(() => undefined);
    if (bin) installed = new Set([...(installed ?? []), ...bin]);
  }
  return { scripts, bins: installed && new Set([...installed, ...deps]) };
}

async function gitFiles(repo: string, patterns: string[]): Promise<string[]> {
  const { stdout } = await exec("git", ["-C", repo, "ls-files", "-z", "--cached", "--others", "--exclude-standard", "--", ...patterns], { maxBuffer: 64 * 1024 * 1024 });
  return [...new Set(stdout.split("\0").filter(Boolean))].sort();
}

/** Every tracked symlink of the repository, mapped to its target as a path from the repository root. */
export async function repoLinks(repo: string): Promise<Map<string, string>> {
  const { stdout } = await exec("git", ["-C", repo, "ls-files", "-s", "-z"], { maxBuffer: 64 * 1024 * 1024 });
  const links = new Map<string, string>();
  for (const entry of stdout.split("\0")) {
    const link = /^120000 \S+ \d+\t(.+)$/.exec(entry)?.[1];
    if (!link) continue;
    const target = await readlink(path.join(repo, link)).catch(() => undefined);
    if (target) links.set(link, path.relative(repo, path.resolve(repo, path.dirname(link), target)));
  }
  return links;
}

/**
 * Lines of tracked or new files that name `rel` or one of its symlinks by file name, outside those files.
 * When `rel` is itself a symlink, its target and the target's other symlinks count too.
 * A name shared by many files (`README.md`) also matches citations of the others: each line is a candidate.
 */
export async function citationsOf(repo: string, rel: string, links: Map<string, string>): Promise<{ aliases: string[]; citations: Citation[] }> {
  const target = links.get(rel) ?? rel;
  const own = [target, ...[...links].filter(([, to]) => to === target).map(([link]) => link).sort()];
  const names = [...new Set(own.map((file) => path.basename(file)))];
  const args = ["-C", repo, "grep", "--untracked", "-z", "-n", "-I", "-F", ...names.flatMap((name) => ["-e", name]), "--", ".", ...own.map((file) => `:(exclude,top,literal)${file}`)];
  const stdout = await exec("git", args, { maxBuffer: 64 * 1024 * 1024 }).then(
    (result) => result.stdout,
    (error: { code?: number; stdout?: string }) => {
      // git grep exits 1 when nothing matches.
      if (error.code === 1) return "";
      throw error;
    },
  );
  const citations: Citation[] = [];
  // With -z, each hit is `file\0line\0text`.
  for (const hit of stdout.split("\n")) {
    const [file, line, ...rest] = hit.split("\0");
    if (!file || !line) continue;
    const text = rest.join("\0").trim();
    citations.push({ cited: rel, file, line: Number(line), text: text.length > CITATION_TEXT ? `${text.slice(0, CITATION_TEXT)}...` : text });
  }
  return { aliases: own.filter((file) => file !== rel), citations };
}

export async function main(argv: string[], print: (line: string) => void = console.log): Promise<number> {
  const { positionals, values } = parseArgs({ args: argv, allowPositionals: true, options: { "cited-by": { type: "boolean" } } });
  const [repoArg, ...fileArgs] = positionals;
  if (!repoArg) throw new Error("usage: node doc-refs.mts <repo> [--cited-by] [-- <file>...]");
  const repo = path.resolve(repoArg);
  let files: string[];
  if (fileArgs.length) files = fileArgs.map((file) => path.relative(repo, path.resolve(repo, file)));
  else {
    // The index still lists a file deleted in the working tree.
    files = [];
    for (const file of await gitFiles(repo, ["*.md", "*.mdx"])) if (await exists(path.join(repo, file))) files.push(file);
  }
  if (values["cited-by"]) {
    if (!fileArgs.length) throw new Error("--cited-by needs the files to look up after --");
    const links = await repoLinks(repo);
    let total = 0;
    for (const file of files) {
      const { aliases, citations } = await citationsOf(repo, file, links);
      if (aliases.length) print(`${file} aliases: ${aliases.join(", ")}`);
      total += citations.length;
      for (const citation of citations) print(`${citation.cited} <- ${citation.file}:${citation.line}: ${citation.text}`);
    }
    print(`doc-refs: ${total} citation(s) of ${files.length} file(s)`);
    return 0;
  }
  const runnables = await repoRunnables(repo);
  let count = 0;
  for (const file of files) {
    for (const finding of await checkFile(repo, file, runnables)) {
      count++;
      print(`${finding.file}:${finding.line}: ${finding.kind} ${finding.target}: ${finding.reason}`);
    }
  }
  print(count ? `doc-refs: ${count} candidate(s) in ${files.length} file(s)` : `doc-refs: ok (${files.length} file(s))`);
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
