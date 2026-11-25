// Fixes the review scope of a review-loop run: base commit, changed files (tracked and untracked),
// diff size and the reviewer level (light or full) that size calls for. Prints JSON and a briefing header.
// Usage: node review-scope.mts <repo> [--base <ref>] [--security] [-- <path>...]
// Requires Node 22.18+ (type stripping) and git.
import { execFile } from "node:child_process";
import { realpathSync } from "node:fs";
import { lstat, readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

export type Change = { path: string; added: number; deleted: number; binary: boolean; untracked: boolean };
/** `light` gets the lighter reviewer; each harness section of the skill maps the level to its effort. */
export type Tier = "light" | "full";
export type Scope = {
  repo: string;
  base: string;
  baseRef: string;
  paths: string[];
  changes: Change[];
  counted: { files: number; lines: number };
  risk: { area: string; files: string[] }[];
  tier: Tier;
  reasons: string[];
};

/** A diff at or under both limits, with no risk signal and no security pass, gets the lighter reviewer. */
export const LIGHT_MAX_LINES = 200;
export const LIGHT_MAX_FILES = 8;

/** Lockfiles and snapshots change in bulk without review value; they do not count toward the size. */
const BULK = /(^|\/)(pnpm-lock\.yaml|package-lock\.json|yarn\.lock|bun\.lockb?|Cargo\.lock|Gemfile\.lock|poetry\.lock|go\.sum)$|(^|\/)__snapshots__\/|\.snap$/;

/**
 * Path heuristics for selecting the review tier. Skills cannot import each other's scripts, so
 * `send`'s pr-state script keeps its own copy; change both together. Authentication and payment also
 * match camelCase words (`useAuth.ts`, `PaymentService.ts`).
 */
const RISK: [string, RegExp[]][] = [
  ["CI workflow", [/(^|\/)(\.github\/(workflows|actions)|\.circleci)\/|(^|\/)(\.gitlab-ci\.ya?ml|Jenkinsfile)$/]],
  ["infrastructure or deploy", [/(^|\/)(infra|terraform|k8s|kubernetes|helm|charts|deploy)\/|\.tf$|(^|\/)(Dockerfile[^/]*|docker-compose[^/]*\.ya?ml)$/]],
  ["data migration", [/(^|\/)migrations?\/|\.sql$/]],
  ["authentication or permissions", [
    /(^|[/_.-])(o?auth2?(n|z|enticat\w*|ori[sz]\w*)?|permissions?|rbac|acl)([/_.-]|$)/i,
    /(^|[/a-z0-9])(O?Auth2?(n|z|enticat\w*|ori[sz]\w*)?|Permissions?)([A-Z/_.-]|$)/,
  ]],
  ["payment", [/(^|[/_.-])(payments?|billing)([/_.-]|$)/i, /(^|[/a-z0-9])(Payments?|Billing)([A-Z/_.-]|$)/]],
];

export function riskSignals(files: string[]): { area: string; files: string[] }[] {
  return RISK.flatMap(([area, patterns]) => {
    const hits = files.filter((f) => patterns.some((p) => p.test(f)));
    return hits.length ? [{ area, files: hits }] : [];
  });
}

/** `git diff --numstat -z`: `added\tdeleted\tpath\0`, or `added\tdeleted\t\0old\0new\0` for a rename. */
export function parseNumstat(text: string): Change[] {
  const parts = text.split("\0");
  const out: Change[] = [];
  for (let i = 0; i < parts.length; i++) {
    const head = parts[i];
    if (!head) continue;
    const [added = "", deleted = "", file = ""] = head.split("\t");
    let target = file;
    if (!file) {
      i += 2; // rename: old and new paths follow
      target = parts[i] ?? "";
    }
    const binary = added === "-" || deleted === "-";
    out.push({ path: target, added: binary ? 0 : Number(added), deleted: binary ? 0 : Number(deleted), binary, untracked: false });
  }
  return out;
}

export function classify(changes: Change[], security: boolean): Pick<Scope, "counted" | "risk" | "tier" | "reasons"> {
  const counted = changes.filter((c) => !c.binary && !BULK.test(c.path));
  const lines = counted.reduce((sum, c) => sum + c.added + c.deleted, 0);
  const risk = riskSignals(changes.map((c) => c.path));
  const reasons = [
    lines > LIGHT_MAX_LINES ? `${lines} changed lines (> ${LIGHT_MAX_LINES})` : "",
    counted.length > LIGHT_MAX_FILES ? `${counted.length} changed files (> ${LIGHT_MAX_FILES})` : "",
    ...risk.map((r) => `high-risk path signal: ${r.area}`),
    security ? "security pass" : "",
  ].filter(Boolean);
  return { counted: { files: counted.length, lines }, risk, tier: reasons.length ? "full" : "light", reasons };
}

export function briefingHeader(scope: Scope): string {
  const paths = scope.paths.length ? scope.paths.join(" ") : ".";
  return [
    `Repo: ${scope.repo}. Base: ${scope.base}. Scope: ${paths}.`,
    `See: git diff ${scope.base} -- ${paths}; git status --short -- ${paths} (read scoped untracked files).`,
  ].join("\n");
}

export function parseArgs(argv: string[]): { repo: string; base: string | undefined; security: boolean; paths: string[] } {
  const split = argv.indexOf("--");
  const own = split === -1 ? argv : argv.slice(0, split);
  const paths = split === -1 ? [] : argv.slice(split + 1);
  let base: string | undefined;
  let security = false;
  const positional: string[] = [];
  for (let i = 0; i < own.length; i++) {
    const arg = own[i] ?? "";
    if (arg === "--security") security = true;
    else if (arg === "--base") {
      base = own[++i];
      if (!base) throw new Error("--base expects a ref");
    } else if (arg.startsWith("--")) throw new Error(`Unknown option: ${arg}`);
    else positional.push(arg);
  }
  const [repo] = positional;
  if (!repo || positional.length > 1) throw new Error("usage: review-scope.mts <repo> [--base <ref>] [--security] [-- <path>...]");
  return { repo: path.resolve(repo), base, security, paths };
}

// --- Effects ---

const exec = promisify(execFile);

async function git(repo: string, args: string[]): Promise<string> {
  try {
    return (await exec("git", ["-C", repo, ...args], { maxBuffer: 64 * 1024 * 1024 })).stdout;
  } catch (error) {
    const stderr = typeof error === "object" && error !== null && "stderr" in error ? String(error.stderr).trim() : "";
    throw new Error(stderr || (error instanceof Error ? error.message : String(error)));
  }
}

/**
 * The default branch on origin, or HEAD only when the repository has no remote (local work). A remote
 * without a known default branch fails: falling back to HEAD would drop the task's commits from the review.
 */
async function defaultBase(repo: string): Promise<string> {
  if (!(await git(repo, ["remote"])).trim()) return "HEAD";
  const remoteHead = (await git(repo, ["symbolic-ref", "--quiet", "--short", "refs/remotes/origin/HEAD"]).catch(() => "")).trim();
  if (!remoteHead) throw new Error("origin/HEAD is not set; pass --base <ref of the base branch>");
  return remoteHead;
}

async function untracked(repo: string, paths: string[]): Promise<Change[]> {
  const listed = (await git(repo, ["ls-files", "--others", "--exclude-standard", "-z", "--", ...paths])).split("\0").filter(Boolean);
  return Promise.all(listed.map(async (file): Promise<Change> => {
    // A nested repository or a symlink is not text to count; it is listed and left out of the size.
    if (!(await lstat(path.join(repo, file))).isFile()) return { path: file, added: 0, deleted: 0, binary: true, untracked: true };
    const data = await readFile(path.join(repo, file));
    const binary = data.subarray(0, 8000).includes(0);
    const text = data.toString("utf8");
    const added = binary ? 0 : text.split("\n").length - (text.endsWith("\n") ? 1 : 0);
    return { path: file, added, deleted: 0, binary, untracked: true };
  }));
}

async function main(argv: string[]): Promise<number> {
  const args = parseArgs(argv);
  const repo = (await git(args.repo, ["rev-parse", "--show-toplevel"])).trim();
  const baseRef = args.base ?? await defaultBase(repo);
  const base = (await git(repo, ["merge-base", "HEAD", baseRef])).trim();
  const tracked = parseNumstat(await git(repo, ["diff", "--numstat", "-z", base, "--", ...args.paths]));
  const changes = [...tracked, ...await untracked(repo, args.paths)];
  const scope: Scope = { repo, base, baseRef, paths: args.paths, changes, ...classify(changes, args.security) };
  console.log(JSON.stringify({ ...scope, briefing: briefingHeader(scope) }, null, 2));
  return 0;
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
