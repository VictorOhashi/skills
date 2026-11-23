import { execFile } from "node:child_process";
import { realpathSync, type Stats } from "node:fs";
import { lstat, mkdir, readdir, readFile, rm, rmdir, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { parseArgs, promisify } from "node:util";

/**
 * Sessions save work artifacts under `<root>/<skill>/<run>/`, where `<run>` is
 * `AAAAMMDD-HHMM-<repo>[-<label>]` and `manifest.json` records repo, branch and head. Only
 * directories at exactly that depth are runs; anything else is left alone so `clean` never guesses.
 */
export const RUN_DEPTH = 2;
/** Where the profile rule keeps artifacts (follows `HOME`); `--root` overrides it. */
export const DEFAULT_ROOT = path.join(os.homedir(), ".agents", "artifacts");
export const DEFAULT_MAX_AGE = "30d";

export type ArtifactRun = {
  dir: string;
  skill: string;
  run: string;
  /** From `manifest.json`; undefined when the run has no valid manifest. */
  repo: string | undefined;
  branch: string | undefined;
  createdAt: Date;
  bytes: number;
};

export type CleanFilter = {
  maxAgeMs: number;
  now: Date;
  skill?: string | undefined;
  repo?: string | undefined;
  branch?: string | undefined;
};

type Manifest = { createdAt: Date | undefined; repo: string | undefined; branch: string | undefined };

const UNITS: Record<string, number> = { h: 3_600_000, d: 86_400_000, w: 604_800_000 };

/** Parses `12h`, `30d` or `2w` into milliseconds. */
export function parseDuration(raw: string): number {
  const match = /^(\d+)([hdw])$/.exec(raw.trim());
  const unit = match?.[2] ? UNITS[match[2]] : undefined;
  if (!match?.[1] || unit === undefined || Number(match[1]) === 0) {
    throw new Error(`Invalid duration: ${raw}. Use <n>h, <n>d or <n>w (for example 30d)`);
  }
  return Number(match[1]) * unit;
}

export async function listRuns(root: string): Promise<ArtifactRun[]> {
  const runs: ArtifactRun[] = [];
  for (const skill of await subdirs(root)) {
    for (const run of await subdirs(path.join(root, skill))) {
      const dir = path.join(root, skill, run);
      try {
        const manifest = await readManifest(dir);
        runs.push({
          dir,
          skill,
          run,
          repo: manifest.repo,
          branch: manifest.branch,
          createdAt: manifest.createdAt ?? (await lstat(dir)).mtime,
          bytes: await sizeOf(dir),
        });
      } catch (error) {
        // The run vanished while scanning (its session or another clean removed it).
        if (!isNotFound(error)) throw error;
      }
    }
  }
  return runs.sort((a, b) => a.dir.localeCompare(b.dir));
}

/** Repo and branch filters need a manifest; a run without one never matches them. */
export function selectStale(runs: ArtifactRun[], filter: CleanFilter): ArtifactRun[] {
  const cutoff = filter.now.getTime() - filter.maxAgeMs;
  return runs.filter(
    (run) =>
      run.createdAt.getTime() < cutoff &&
      (filter.skill === undefined || run.skill === filter.skill) &&
      (filter.repo === undefined || run.repo === filter.repo) &&
      (filter.branch === undefined || run.branch === filter.branch),
  );
}

/** Removes the runs and then the skill directory left empty. */
export async function removeRuns(root: string, runs: ArtifactRun[]): Promise<void> {
  const base = path.resolve(root);
  for (const run of runs) {
    const dir = path.resolve(run.dir);
    if (path.relative(base, dir).split(path.sep).length !== RUN_DEPTH || !dir.startsWith(base + path.sep)) {
      throw new Error(`Refusing to remove ${run.dir}: not a run under ${root}`);
    }
    const info = await lstat(dir);
    if (info.isSymbolicLink() || !info.isDirectory()) throw new Error(`Refusing to remove ${run.dir}: not a directory`);
    await rm(dir, { recursive: true });
    let parent = path.dirname(dir);
    while (parent !== base && parent.startsWith(base + path.sep)) {
      try {
        await rmdir(parent);
      } catch (error) {
        // Not empty (or already gone, e.g. a session wrote a new run meanwhile): keep it.
        if (hasCode(error, "ENOTEMPTY") || hasCode(error, "EEXIST") || hasCode(error, "ENOENT")) break;
        throw error;
      }
      parent = path.dirname(parent);
    }
  }
}

/** What `manifest.json` records about the checkout that produced a run. */
export type Origin = { repo: string; branch: string; head: string | null };
/** Branch value for work outside Git or on a detached HEAD, as the profile rule defines. */
export const LOCAL = "_local";
/** Attempts before `newRun` gives up on finding a free run name in the same minute. */
const MAX_SUFFIX = 50;

/** Lowercase words joined by hyphens; anything that could leave the run directory is dropped. */
export function slug(text: string): string {
  // Accents go before the cut, so "cartão" becomes "cartao" instead of "cart-o".
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

/** `AAAAMMDD-HHMM-<repo>[-<label>]` in local time, the name the profile rule gives a run. */
export function runName(now: Date, repo: string, label?: string): string {
  const pad = (n: number): string => String(n).padStart(2, "0");
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
  const parts = [stamp, slug(repo) || "repo", label === undefined ? "" : slug(label)].filter(Boolean);
  return parts.join("-");
}

const exec = promisify(execFile);

async function git(cwd: string, args: string[]): Promise<string> {
  try {
    // English messages keep the "not a git repository" check working under any locale.
    return (await exec("git", ["-C", cwd, ...args], { env: { ...process.env, LC_ALL: "C", LANGUAGE: "C" } })).stdout.trim();
  } catch (error) {
    const stderr = typeof error === "object" && error !== null && "stderr" in error ? String(error.stderr).trim() : "";
    throw new Error(stderr || (error instanceof Error ? error.message : String(error)));
  }
}

/** Detached HEAD (no branch) and a repository without commits (no head) are expected, not errors. */
async function optional(cwd: string, args: string[]): Promise<string | undefined> {
  return git(cwd, args).then((out) => out || undefined, () => undefined);
}

/**
 * The main repository's name, the same in every worktree (the parent of the common Git dir), with the
 * branch and head of this checkout. Only a folder outside Git gets the folder name and `_local`; any
 * other Git failure throws, so a wrong name never lands in the manifest.
 */
export async function originOf(checkout: string): Promise<Origin> {
  // The script runs from the installed skills, so a relative path would point at the wrong checkout.
  if (!path.isAbsolute(checkout)) throw new Error(`--repo must be an absolute path, got: ${checkout}`);
  const dir = path.normalize(checkout);
  if (!(await stat(dir).catch(() => undefined))?.isDirectory()) throw new Error(`--repo is not a directory: ${dir}`);
  let common: string;
  try {
    common = await git(dir, ["rev-parse", "--path-format=absolute", "--git-common-dir"]);
  } catch (error) {
    if (error instanceof Error && /not a git repository/i.test(error.message)) return { repo: path.basename(dir), branch: LOCAL, head: null };
    throw error;
  }
  const repo = path.basename(path.basename(common) === ".git" ? path.dirname(common) : common.replace(/\.git$/, ""));
  return {
    repo,
    branch: (await optional(dir, ["symbolic-ref", "--quiet", "--short", "HEAD"])) ?? LOCAL,
    head: (await optional(dir, ["rev-parse", "--verify", "--quiet", "HEAD"])) ?? null,
  };
}

/**
 * Creates `<root>/<skill>/<run>/manifest.json` for a new run. A taken name gets a numeric suffix:
 * a run folder is never reused. The skill must be a plain compiled skill name, so the run stays under root.
 */
export async function newRun(root: string, skill: string, origin: Origin, now: Date, label?: string): Promise<string> {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(skill)) throw new Error(`Invalid skill name: ${skill}`);
  const parent = path.join(root, skill);
  await mkdir(parent, { recursive: true });
  const info = await lstat(parent);
  if (info.isSymbolicLink() || !info.isDirectory()) throw new Error(`Refusing to write under ${parent}: not a directory`);
  const base = runName(now, origin.repo, label);
  for (let i = 1; i <= MAX_SUFFIX; i++) {
    const dir = path.join(parent, i === 1 ? base : `${base}-${i}`);
    try {
      await mkdir(dir);
    } catch (error) {
      if (hasCode(error, "EEXIST")) continue;
      throw error;
    }
    const manifest = { skill, repo: origin.repo, branch: origin.branch, head: origin.head, createdAt: now.toISOString() };
    await writeFile(path.join(dir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, { flag: "wx" });
    return dir;
  }
  throw new Error(`No free run name for ${base} after ${MAX_SUFFIX} attempts`);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Directories only; symlinks are skipped so a run can never point outside the root. */
async function subdirs(dir: string): Promise<string[]> {
  let names: string[];
  try {
    names = await readdir(dir);
  } catch (error) {
    if (isNotFound(error)) return [];
    throw error;
  }
  const dirs: string[] = [];
  for (const name of names) {
    if (name.startsWith(".")) continue;
    const info = await lstatOrUndefined(path.join(dir, name));
    if (info?.isDirectory() && !info.isSymbolicLink()) dirs.push(name);
  }
  return dirs.sort();
}

async function readManifest(dir: string): Promise<Manifest> {
  const empty: Manifest = { createdAt: undefined, repo: undefined, branch: undefined };
  let raw: unknown;
  try {
    raw = JSON.parse(await readFile(path.join(dir, "manifest.json"), "utf8"));
  } catch {
    return empty; // Missing or invalid manifest: age falls back to the directory time.
  }
  if (typeof raw !== "object" || raw === null) return empty;
  const field = (key: string): string | undefined => {
    const value: unknown = (raw as Record<string, unknown>)[key];
    return typeof value === "string" && value !== "" ? value : undefined;
  };
  const stamp = field("createdAt");
  // Only ISO 8601 dates count; anything else falls back to the directory time instead of a guessed date.
  const date = stamp === undefined || !/^\d{4}-\d{2}-\d{2}/.test(stamp) ? undefined : new Date(stamp);
  return {
    createdAt: date && !Number.isNaN(date.getTime()) ? date : undefined,
    repo: field("repo"),
    branch: field("branch"),
  };
}

async function sizeOf(dir: string): Promise<number> {
  let total = 0;
  for (const name of await readdir(dir)) {
    const target = path.join(dir, name);
    const info = await lstatOrUndefined(target);
    if (!info || info.isSymbolicLink()) continue;
    total += info.isDirectory() ? await sizeOf(target) : info.size;
  }
  return total;
}

/** Sessions may delete temporary files while we scan; a vanished entry is just skipped. */
async function lstatOrUndefined(target: string): Promise<Stats | undefined> {
  try {
    return await lstat(target);
  } catch (error) {
    if (isNotFound(error)) return undefined;
    throw error;
  }
}

function isNotFound(error: unknown): boolean {
  return hasCode(error, "ENOENT");
}

function hasCode(error: unknown, code: string): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === code;
}

const USAGE = `Usage:
  artifacts.mts new <skill> [label] --repo <absolute checkout path>
  artifacts.mts clean [--older-than 30d] [--skill <name>] [--repo <name>] [--branch <name>] [--yes]
  artifacts.mts status
Options: --root <dir> (default ${DEFAULT_ROOT})`;

export async function main(argv: string[]): Promise<number> {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      root: { type: "string" },
      repo: { type: "string" },
      "older-than": { type: "string" },
      skill: { type: "string" },
      branch: { type: "string" },
      yes: { type: "boolean", short: "y" },
    },
  });
  const root = path.resolve(values.root ?? DEFAULT_ROOT);
  const [command, ...rest] = positionals;
  if (command === "new") {
    const [skill, label, ...extra] = rest;
    if (!skill || !values.repo || extra.length > 0) throw new Error(USAGE);
    // Only the path goes to stdout, so a caller can capture it directly.
    console.log(await newRun(root, skill, await originOf(values.repo), new Date(), label));
    return 0;
  }
  if (command === "clean" && rest.length === 0) {
    const maxAge = values["older-than"] ?? DEFAULT_MAX_AGE;
    const stale = selectStale(await listRuns(root), {
      maxAgeMs: parseDuration(maxAge),
      now: new Date(),
      skill: values.skill,
      repo: values.repo,
      branch: values.branch,
    });
    if (stale.length === 0) {
      console.log(`no artifact runs older than ${maxAge}`);
      return 0;
    }
    for (const run of stale) console.log(`remove  ${run.dir} (${run.createdAt.toISOString().slice(0, 10)}, ${formatBytes(run.bytes)})`);
    const total = formatBytes(stale.reduce((sum, run) => sum + run.bytes, 0));
    // Deleting is irreversible: without --yes it only lists.
    if (!values.yes) {
      console.log(`dry-run: ${stale.length} runs, ${total}; re-run with --yes to remove`);
      return 0;
    }
    await removeRuns(root, stale);
    console.log(`removed ${stale.length} runs, ${total}`);
    return 0;
  }
  if (command === "status" && rest.length === 0) {
    const runs = await listRuns(root);
    const bytes = runs.reduce((sum, run) => sum + run.bytes, 0);
    const stale = selectStale(runs, { maxAgeMs: parseDuration(DEFAULT_MAX_AGE), now: new Date() });
    console.log(`artifacts: ${runs.length} runs, ${formatBytes(bytes)} (${stale.length} older than ${DEFAULT_MAX_AGE})`);
    return 0;
  }
  throw new Error(USAGE);
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
