// Runs a reviewer role in a separate read-only Codex session; the briefing comes on stdin.
// Usage: node codex-review.mts <role> <output-dir> [prior-round-dir] --repo <path> [--effort <level>]
import { execFile, spawn } from "node:child_process";
import { realpathSync } from "node:fs";
import { lstat, mkdir, mkdtemp, open, readFile, realpath, rm, type FileHandle } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { parseArgs, promisify } from "node:util";

const exec = promisify(execFile);
/** Reviewer roles are the Codex agents named `<name>-reviewer`; other agents (observers, candidates) cannot run here. */
export function isReviewerRole(name: string): boolean {
  return /^[a-z0-9]+(-[a-z0-9]+)*-reviewer$/.test(name);
}
/** Where the profile rule keeps artifacts (follows `HOME`); reviewer output must stay inside it. */
export const DEFAULT_ROOT = path.join(os.homedir(), ".agents", "artifacts");

/**
 * Lighter efforts a caller may pick per role, besides the TOML's own. The caller can only lower effort
 * within this list: `review-loop` sizes the review by its diff, and the council always runs at full effort.
 */
const LIGHTER_EFFORTS: Readonly<Record<string, readonly string[]>> = {
  "loop-reviewer": ["medium"],
};

export function reviewerEffort(role: string, defined: string, requested: string | undefined): string {
  if (requested === undefined || requested === defined) return defined;
  const lighter = LIGHTER_EFFORTS[role] ?? [];
  if (!lighter.includes(requested)) {
    throw new Error(`Effort ${requested} is not allowed for ${role}; use ${[defined, ...lighter].join(" or ")}`);
  }
  return requested;
}

export type ReviewerSpec = { model: string; effort: string; instructions: string };

const NEEDED_KEYS = new Set(["model", "model_reasoning_effort", "developer_instructions"]);

/**
 * Reads the top-level keys a reviewer needs from its agent TOML. Scripts carry no dependencies, so this
 * accepts only the subset the role files use (single-line basic strings parsed as JSON, multiline basic strings without escapes)
 * and rejects anything else instead of guessing.
 */
export function parseReviewerToml(text: string): ReviewerSpec {
  const values = new Map<string, string>();
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? "";
    if (/^\s*\[/.test(line)) break;
    const match = /^([A-Za-z0-9_-]+)\s*=\s*(.*)$/.exec(line);
    if (!match?.[1] || match[2] === undefined || !NEEDED_KEYS.has(match[1])) continue;
    const [, key, raw] = match;
    if (raw.startsWith('"""')) {
      const body: string[] = [];
      let rest = raw.slice(3);
      while (!rest.includes('"""')) {
        body.push(rest);
        i += 1;
        if (i >= lines.length) throw new Error(`Unterminated string for ${key}`);
        rest = lines[i] ?? "";
      }
      body.push(rest.slice(0, rest.indexOf('"""')));
      // TOML trims the newline right after the opening delimiter.
      const value = (body[0] === "" ? body.slice(1) : body).join("\n");
      if (value.includes("\\")) throw new Error(`Unsupported escape in ${key}`);
      values.set(key, value);
    } else {
      const basic = /^("(?:[^"\\]|\\.)*")\s*(?:#.*)?$/.exec(raw);
      if (!basic?.[1]) throw new Error(`Unsupported value for ${key}`);
      values.set(key, JSON.parse(basic[1]) as string);
    }
  }
  const model = values.get("model");
  const effort = values.get("model_reasoning_effort");
  const instructions = values.get("developer_instructions");
  if (!model || !effort || !instructions) throw new Error("Invalid reviewer definition");
  return { model, effort, instructions };
}

function runtimeHeader(log: string): Map<string, string> | undefined {
  const lines = log.split(/\r?\n/);
  if (lines[0] === "Reading prompt from stdin..." || lines[0] === "Reading additional input from stdin...") lines.shift();
  if (!lines[0]?.startsWith("OpenAI Codex v") || lines[1] !== "--------") return undefined;
  const end = lines.indexOf("--------", 2);
  if (end === -1) return undefined;
  const fields = new Map<string, string>();
  for (const line of lines.slice(2, end)) {
    const match = /^([^:]+): (.+)$/.exec(line);
    if (!match?.[1] || !match[2] || fields.has(match[1])) return undefined;
    fields.set(match[1], match[2]);
  }
  return fields;
}

async function priorSession(previous: string, destination: string, role: string, repo: string,
  model: string, effort: string): Promise<string> {
  const prior = await realpath(previous);
  if (prior === destination || path.dirname(prior) !== path.dirname(destination)) {
    throw new Error("Prior reviewer round must belong to the same artifact run");
  }
  for (const name of ["runtime.json", "review.md"]) {
    if (!(await lstat(path.join(prior, name))).isFile()) throw new Error("Invalid prior reviewer artifact");
  }
  let value: unknown;
  try { value = JSON.parse(await readFile(path.join(prior, "runtime.json"), "utf8")); }
  catch { throw new Error("Invalid prior reviewer record"); }
  if (typeof value !== "object" || value === null || Array.isArray(value)
    || !("sessionId" in value) || typeof value.sessionId !== "string"
    || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.sessionId)
    || !("role" in value) || value.role !== role || !("repo" in value) || value.repo !== repo
    || !("model" in value) || value.model !== model || !("effort" in value) || value.effort !== effort
    || !("sandbox" in value) || value.sandbox !== "read-only" || !("approval" in value) || value.approval !== "never"
    || !("writeProbe" in value) || value.writeProbe !== "denied" || !("exitCode" in value) || value.exitCode !== 0
    || !(await readFile(path.join(prior, "review.md"), "utf8")).trim()) {
    throw new Error("Prior session is not a verified reviewer of the same role, repository and run");
  }
  return value.sessionId;
}

export type ReviewRequest = {
  role: string;
  output: string;
  repo: string;
  previous: string | undefined;
  briefing: string;
  effort: string | undefined;
  /** Artifacts root the output must stay inside. */
  root: string;
  /** Folder with the compiled `<role>.toml` agent files. */
  agentsDir: string;
};

/** A separate Codex session owns its sandbox; native subagents would inherit the writer's policy. */
export async function runReview(request: ReviewRequest): Promise<void> {
  const { role, output, repo, previous, briefing } = request;
  if (!isReviewerRole(role)) throw new Error(`Not a reviewer role: ${role}`);
  const roleFile = path.join(request.agentsDir, `${role}.toml`);
  const spec = parseReviewerToml(await readFile(roleFile, "utf8").catch((error: unknown) => {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      throw new Error(`Missing reviewer definition ${roleFile}; run this script from the Codex build`);
    }
    throw error;
  }));
  const effort = reviewerEffort(role, spec.effort, request.effort);
  const target = await realpath(repo);
  const artifacts = path.resolve(request.root);
  const destination = path.resolve(output);
  const relative = path.relative(artifacts, destination);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Reviewer output must be inside the profile artifacts directory");
  }
  const canonicalArtifacts = await realpath(artifacts);
  const parent = await realpath(path.dirname(destination));
  const parentRelative = path.relative(canonicalArtifacts, parent);
  if (parentRelative.startsWith("..") || path.isAbsolute(parentRelative)
    || parent === target || parent.startsWith(target + path.sep)) {
    throw new Error("Reviewer output parent escapes artifacts or points into the reviewed repository");
  }
  // Resolve and validate the existing parent before any directory creation.
  const resolvedDestination = path.join(parent, path.basename(destination));
  await mkdir(resolvedDestination).catch((error: unknown) => {
    if (!(error instanceof Error && "code" in error && error.code === "EEXIST")) throw error;
  });
  const canonical = await realpath(resolvedDestination);
  const canonicalRelative = path.relative(canonicalArtifacts, canonical);
  if (!canonicalRelative || canonicalRelative.startsWith("..") || path.isAbsolute(canonicalRelative)
    || canonical === target || canonical.startsWith(target + path.sep)) {
    throw new Error("Reviewer output must remain outside the reviewed repository and inside artifacts");
  }
  const resume = previous ? await priorSession(previous, canonical, role, target, spec.model, effort) : undefined;
  // Reserve artifacts before starting a model; exclusive descriptors cannot follow a planted symlink.
  const runtimeFile = await open(path.join(canonical, "runtime.json"), "wx", 0o600);
  let reportFile: FileHandle | undefined;
  let isolated: string | undefined;
  try {
    reportFile = await open(path.join(canonical, "review.md"), "wx", 0o600);
    isolated = await mkdtemp(path.join(os.tmpdir(), "agents-review-"));
    const probe = "try { require('node:fs').writeFileSync('probe','probe'); process.exit(3) } catch (e) { if (e.code === 'EPERM' || e.code === 'EACCES') { console.log('READ_ONLY_DENIED'); process.exit(0) } throw e }";
    const check = await exec("codex", ["sandbox", "--permission-profile", ":read-only", "--cd", isolated, process.execPath, "-e", probe], { timeout: 15_000 });
    if (check.stdout.trim() !== "READ_ONLY_DENIED") throw new Error("Read-only sandbox probe failed");
    const args = ["exec", "--ignore-user-config", "--ignore-rules", "--sandbox", "read-only",
      "--model", spec.model, "--color", "never", "--skip-git-repo-check", "--cd", isolated];
    for (const [key, value] of Object.entries({
      approval_policy: "never", model_reasoning_effort: effort,
      developer_instructions: spec.instructions, "agents.enabled": false,
      "features.apps": false, "features.plugins": false, "features.memories": false,
      "features.request_permissions_tool": false, "skills.include_instructions": false,
      "skills.bundled.enabled": false, project_doc_max_bytes: 0,
    })) args.push("-c", `${key}=${JSON.stringify(value)}`);
    if (resume) args.push("resume", resume);
    args.push("-");
    const child = spawn("codex", args, { cwd: isolated, stdio: ["pipe", "pipe", "pipe"] });
    let response = "";
    let stderr = "";
    const field = (name: string): string | undefined => runtimeHeader(stderr)?.get(name);
    child.stdout.setEncoding("utf8").on("data", (chunk: string) => { response += chunk; });
    child.stderr.setEncoding("utf8").on("data", (chunk: string) => {
      stderr += chunk;
      for (const [name, expected] of Object.entries({ model: spec.model, "reasoning effort": effort,
        sandbox: "read-only", approval: "never" })) {
        const actual = field(name);
        if (actual && actual !== expected) child.kill("SIGTERM");
      }
    });
    child.stdin.on("error", () => { /* Startup failures are reported by close/error below. */ });
    child.stdin.end(`Repository to review (use absolute paths and git -C): ${target}\n${briefing}`);
    const deadline = setTimeout(() => { child.kill("SIGTERM"); }, 15 * 60_000);
    let code: number | null;
    try {
      code = await new Promise<number | null>((resolve, reject) => {
        child.once("error", reject);
        child.once("close", resolve);
      });
    } finally {
      clearTimeout(deadline);
    }
    const runtime = { role, sessionId: field("session id"), model: field("model"), effort: field("reasoning effort"),
      sandbox: field("sandbox"), approval: field("approval"), writeProbe: "denied", repo: target, exitCode: code };
    await runtimeFile.writeFile(`${JSON.stringify(runtime, null, 2)}\n`);
    if (code !== 0 || !response.trim()) throw new Error(`Reviewer failed (exit ${code}); no approval recorded`);
    if (runtime.model !== spec.model || runtime.effort !== effort
      || runtime.sandbox !== "read-only" || runtime.approval !== "never" || !runtime.sessionId
      || (resume !== undefined && runtime.sessionId !== resume)) {
      throw new Error("Reviewer runtime did not confirm the required model, effort, sandbox, approvals and session ID");
    }
    await reportFile.writeFile(response);
    console.log(JSON.stringify(runtime));
    console.log(response);
  } finally {
    await runtimeFile.close();
    await reportFile?.close();
    if (isolated) await rm(isolated, { recursive: true, force: true });
  }
}

async function main(argv: string[]): Promise<number> {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: { repo: { type: "string" }, effort: { type: "string" } },
  });
  const [roleArg, output, previous, ...extra] = positionals;
  const role = roleArg !== undefined && isReviewerRole(roleArg) ? roleArg : undefined;
  let briefing = "";
  if (role && output && values.repo && extra.length === 0) {
    for await (const chunk of process.stdin) briefing += String(chunk);
  }
  if (!role || !output || !values.repo || extra.length > 0 || !briefing.trim()) {
    throw new Error(`Usage: codex-review.mts <name>-reviewer <output-dir> [prior-round-dir] --repo <path> [--effort <level>] < briefing.txt`);
  }
  await runReview({
    role, output, repo: values.repo, previous, briefing, effort: values.effort,
    root: DEFAULT_ROOT,
    // Installed next to the compiled Codex agents: <build>/scripts and <build>/agents.
    agentsDir: path.join(path.dirname(import.meta.dirname), "agents"),
  });
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
