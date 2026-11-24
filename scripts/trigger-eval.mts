import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { realpathSync } from "node:fs";
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";
import { compileCatalog, DEFAULT_SKILLS, parseFrontmatter, type CompiledSkill } from "./lint.mts";

/** The cases live in the catalog checkout; the installed build has no `evals/`. */
export const DEFAULT_CASES = path.join(path.dirname(import.meta.dirname), "evals", "triggers.json");
export const DEFAULT_RESULTS = path.join(os.homedir(), ".agents", "usage", "trigger-evals");
export const DEFAULT_INSTRUCTIONS = path.join(os.homedir(), ".claude", "CLAUDE.md");

/**
 * `expect: null` means no catalog skill should load; `accept` lists other skills that also count as right.
 * `avoid` names skills a near prompt must not load, so `--skill` runs the case for them too.
 */
export type TriggerCase = { prompt: string; expect: string | null; accept?: string[]; avoid?: string[] };

export type TriggerResult = TriggerCase & {
  picked: string | null;
  pass: boolean;
  error?: string;
  /** Set when the case ran again after a miss or a change from the baseline: every pick, and it passes by majority. */
  picks?: Array<string | null>;
};

export type TriggerRun = {
  createdAt: string;
  /** Hash of the compiled skill texts, so a run tells which catalog state it measured. */
  catalogHash: string;
  /** The `--model` asked for; null runs the account default. */
  model: string | null;
  /** The model the CLI reported, so a change of the account default does not read as a catalog effect. */
  resolvedModel?: string | null;
  /** Hash of the profile instructions the cases ran with; null when there were none. */
  instructionsHash?: string | null;
  results: TriggerResult[];
};

export type SkillScore = { skill: string; cases: number; hits: number; wrongPicks: number };

const TIMEOUT_MS = 180_000;
/** Extra runs of a case that missed or changed from the baseline, so one noisy pick does not decide it. */
export const DEFAULT_RETRIES = 2;

export function parseCases(text: string, invocable: string[]): TriggerCase[] {
  const raw = JSON.parse(text) as { cases?: unknown };
  if (!Array.isArray(raw.cases)) throw new Error('Trigger cases file must be { "cases": [...] }');
  return raw.cases.map((item, index) => {
    const value = item as Partial<TriggerCase>;
    if (typeof value.prompt !== "string" || !value.prompt.trim()) throw new Error(`Case ${index}: prompt is required`);
    if (value.expect !== null && typeof value.expect !== "string") throw new Error(`Case ${index}: expect must be a skill name or null`);
    for (const field of ["accept", "avoid"] as const) {
      const list = value[field];
      if (list !== undefined && (!Array.isArray(list) || !list.every((skill) => typeof skill === "string"))) {
        throw new Error(`Case ${index}: ${field} must be a list of skill names`);
      }
    }
    for (const skill of [value.expect, ...(value.accept ?? []), ...(value.avoid ?? [])]) {
      if (skill !== null && skill !== undefined && !invocable.includes(skill)) throw new Error(`Case ${index}: ${skill} is not a model-invocable catalog skill`);
    }
    if (value.avoid?.some((skill) => skill === value.expect || value.accept?.includes(skill))) throw new Error(`Case ${index}: avoid names an expected skill`);
    return { prompt: value.prompt, expect: value.expect, ...(value.accept ? { accept: value.accept } : {}), ...(value.avoid ? { avoid: value.avoid } : {}) };
  });
}

/** Skills the model can load by itself; `disable-model-invocation` skills only load by command. */
export function invocableSkills(skills: CompiledSkill[]): string[] {
  return skills.filter((skill) => parseFrontmatter(skill.text)?.get("disable-model-invocation") !== "true").map((skill) => skill.name);
}

/** First catalog skill the model loads in a `--output-format stream-json` transcript; other skills count as none. */
export function pickedSkill(stream: string, catalog: string[]): string | null {
  for (const raw of stream.split("\n")) {
    let event: { type?: string; message?: { content?: Array<{ type?: string; name?: string; input?: { skill?: unknown } }> } };
    try {
      event = JSON.parse(raw);
    } catch {
      continue;
    }
    if (event.type !== "assistant") continue;
    for (const block of event.message?.content ?? []) {
      if (block.type !== "tool_use" || block.name !== "Skill" || typeof block.input?.skill !== "string") continue;
      const name = block.input.skill.split(":").pop() ?? "";
      return catalog.includes(name) ? name : null;
    }
  }
  return null;
}

export function judge(testCase: TriggerCase, picked: string | null): boolean {
  return picked === testCase.expect || (picked !== null && (testCase.accept ?? []).includes(picked));
}

export function scoreBySkill(results: TriggerResult[]): SkillScore[] {
  const scores = new Map<string, SkillScore>();
  const entry = (skill: string): SkillScore => {
    const existing = scores.get(skill) ?? { skill, cases: 0, hits: 0, wrongPicks: 0 };
    scores.set(skill, existing);
    return existing;
  };
  for (const result of results) {
    if (result.error) continue;
    if (result.expect) {
      const score = entry(result.expect);
      score.cases += 1;
      if (result.pass) score.hits += 1;
    }
    if (!result.pass && result.picked) entry(result.picked).wrongPicks += 1;
  }
  return [...scores.values()].sort((a, b) => a.skill.localeCompare(b.skill));
}

/** Cases a `--skill` run covers: the skill expected or accepted, and near prompts that must not load it. */
export function casesFor(cases: TriggerCase[], skill: string): TriggerCase[] {
  return cases.filter((item) => item.expect === skill || item.accept?.includes(skill) || item.avoid?.includes(skill));
}

/** One result from several runs of a case: the most frequent pick, passing when most runs passed. */
export function combine(testCase: TriggerCase, picks: Array<string | null>): TriggerResult {
  const counts = new Map<string | null, number>();
  for (const pick of picks) counts.set(pick, (counts.get(pick) ?? 0) + 1);
  const picked = [...counts].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const passes = picks.filter((pick) => judge(testCase, pick)).length;
  return { ...testCase, picked, pass: passes * 2 > picks.length, picks };
}

/** Cases whose outcome changed since a previous run of the same prompts. */
export function flips(previous: TriggerRun, current: TriggerRun): TriggerResult[] {
  const before = new Map(previous.results.map((result) => [result.prompt, result]));
  return current.results.filter((result) => {
    const old = before.get(result.prompt);
    return old !== undefined && !old.error && !result.error && old.pass !== result.pass;
  });
}

/**
 * Runs each case in a throwaway project that holds only these skills and the given instructions.
 * `--setting-sources project` keeps the user's installed skills and settings out; the only tool is Skill,
 * so a case can load a skill and nothing else.
 */
export async function runTriggerEval(options: {
  skills: CompiledSkill[];
  instructions: string | undefined;
  cases: TriggerCase[];
  model: string | undefined;
  concurrency: number;
  /** Extra runs for each case that missed or changed from `baseline`. */
  retries?: number;
  baseline?: TriggerRun;
  claude?: string;
  onResult?: (result: TriggerResult, done: number) => void;
}): Promise<TriggerRun> {
  const workspace = await mkdtemp(path.join(os.tmpdir(), "skills-trigger-eval-"));
  try {
    for (const skill of options.skills) {
      const dest = path.join(workspace, ".claude", "skills", skill.name, "SKILL.md");
      await mkdir(path.dirname(dest), { recursive: true });
      await writeFile(dest, skill.text);
    }
    if (options.instructions !== undefined) await writeFile(path.join(workspace, "CLAUDE.md"), options.instructions);
    const catalog = options.skills.map((skill) => skill.name);
    let resolvedModel: string | null = null;
    let done = 0;
    const pool = async (indexes: number[], each: (result: TriggerResult, index: number) => void): Promise<void> => {
      let next = 0;
      const worker = async (): Promise<void> => {
        while (next < indexes.length) {
          const index = indexes[next++] as number;
          const outcome = await runCase(options.claude ?? "claude", workspace, options.cases[index] as TriggerCase, options.model, catalog);
          resolvedModel ??= outcome.model;
          done += 1;
          each(outcome.result, index);
          options.onResult?.(outcome.result, done);
        }
      };
      await Promise.all(Array.from({ length: Math.max(1, options.concurrency) }, worker));
    };
    const results: TriggerResult[] = new Array(options.cases.length);
    await pool(options.cases.map((_, index) => index), (result, index) => (results[index] = result));

    const before = new Map(options.baseline?.results.map((result) => [result.prompt, result]) ?? []);
    const recheck = results.flatMap((result, index) => {
      const old = before.get(result.prompt);
      return !result.error && (!result.pass || (old !== undefined && !old.error && old.pass !== result.pass)) ? [index] : [];
    });
    const reruns = new Map<number, TriggerResult[]>();
    const retries = options.retries ?? DEFAULT_RETRIES;
    await pool(recheck.flatMap((index) => Array.from({ length: retries }, () => index)), (result, index) => reruns.set(index, [...(reruns.get(index) ?? []), result]));
    for (const [index, extra] of reruns) {
      const first = results[index] as TriggerResult;
      const failed = extra.find((result) => result.error);
      results[index] = failed ?? combine(options.cases[index] as TriggerCase, [first.picked, ...extra.map((result) => result.picked)]);
    }
    return {
      createdAt: new Date().toISOString(),
      catalogHash: catalogHash(options.skills),
      model: options.model ?? null,
      resolvedModel,
      instructionsHash: options.instructions === undefined ? null : createHash("sha256").update(options.instructions).digest("hex").slice(0, 12),
      results,
    };
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
}

function catalogHash(skills: CompiledSkill[]): string {
  const hash = createHash("sha256");
  for (const skill of skills) hash.update(`${skill.name}\0${skill.text}\0`);
  return hash.digest("hex").slice(0, 12);
}

async function runCase(claude: string, cwd: string, testCase: TriggerCase, model: string | undefined, catalog: string[]): Promise<{ result: TriggerResult; model: string | null }> {
  const args = [
    "-p", testCase.prompt,
    "--setting-sources", "project",
    "--tools", "Skill",
    "--strict-mcp-config",
    "--max-turns", "1",
    "--no-session-persistence",
    "--output-format", "stream-json",
    "--verbose",
    ...(model ? ["--model", model] : []),
  ];
  const outcome = await new Promise<{ stdout: string; error?: string }>((resolve) => {
    const child = spawn(claude, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => child.kill("SIGTERM"), TIMEOUT_MS);
    child.stdout.on("data", (chunk: Buffer) => (stdout += chunk.toString()));
    child.stderr.on("data", (chunk: Buffer) => (stderr += chunk.toString()));
    child.on("error", (error) => {
      clearTimeout(timer);
      resolve({ stdout, error: error.message });
    });
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      // --max-turns ends the run with a non-zero code once the first turn is done; only a run with no result failed.
      const finished = stdout.includes('"type":"result"');
      resolve(finished ? { stdout } : { stdout, error: signal ? `killed by ${signal}` : `exit ${code}: ${stderr.trim().slice(0, 300)}` });
    });
  });
  const reported = reportedModel(outcome.stdout);
  if (outcome.error) return { result: { ...testCase, picked: null, pass: false, error: outcome.error }, model: reported };
  const picked = pickedSkill(outcome.stdout, catalog);
  return { result: { ...testCase, picked, pass: judge(testCase, picked) }, model: reported };
}

/** The model named by the CLI's `system` init event. */
export function reportedModel(stream: string): string | null {
  for (const raw of stream.split("\n")) {
    try {
      const event = JSON.parse(raw) as { type?: string; subtype?: string; model?: unknown };
      if (event.type === "system" && event.subtype === "init" && typeof event.model === "string") return event.model;
    } catch {
      continue;
    }
  }
  return null;
}

export async function saveRun(dir: string, run: TriggerRun): Promise<string> {
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, `${run.createdAt.replace(/[:.]/g, "-")}.json`);
  await writeFile(file, `${JSON.stringify(run, null, 2)}\n`);
  return file;
}

/** Latest saved run with the same model, to show which cases the catalog change flipped. */
export async function latestRun(dir: string, model: string | null): Promise<TriggerRun | undefined> {
  const names = await readdir(dir).catch((error: unknown) => {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return [];
    throw error;
  });
  for (const name of names.filter((entry) => entry.endsWith(".json")).sort().reverse()) {
    const run = JSON.parse(await readFile(path.join(dir, name), "utf8")) as TriggerRun;
    if (run.model === model) return run;
  }
  return undefined;
}

const USAGE = `Usage: trigger-eval.mts [--skill <name>] [--model <model>] [--baseline <saved run>] [--retries <n>] [--json] [--dry-run]
Options: --skills <dir> (default: the catalog next to this script), --cases <file>, --instructions <file> (default ~/.claude/CLAUDE.md), --results <dir>, --claude <bin>`;

export async function main(argv: string[], print: (line: string) => void = console.log, log: (line: string) => void = console.error): Promise<number> {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      skill: { type: "string" },
      model: { type: "string" },
      baseline: { type: "string" },
      retries: { type: "string" },
      json: { type: "boolean" },
      "dry-run": { type: "boolean" },
      skills: { type: "string" },
      cases: { type: "string" },
      instructions: { type: "string" },
      results: { type: "string" },
      claude: { type: "string" },
    },
  });
  if (positionals.length > 0) throw new Error(USAGE);
  const skills = await compileCatalog(values.skills ?? DEFAULT_SKILLS, "claude");
  const all = parseCases(await readFile(values.cases ?? DEFAULT_CASES, "utf8"), invocableSkills(skills));
  const skill = values.skill;
  const cases = skill ? casesFor(all, skill) : all;
  const retries = values.retries === undefined ? DEFAULT_RETRIES : Number(values.retries);
  if (!Number.isInteger(retries) || retries < 0) throw new Error("--retries must be a whole number");
  if (cases.length === 0) throw new Error(`No trigger cases for ${skill}`);
  if (values["dry-run"]) {
    for (const item of cases) print(`${item.expect ?? "(none)"}  ${item.prompt}`);
    print(`dry-run: ${cases.length} claude -p calls, plus ${retries} for each case that misses or changes`);
    return 0;
  }
  const instructionsPath = values.instructions ?? DEFAULT_INSTRUCTIONS;
  const instructions = await readFile(instructionsPath, "utf8").catch((error: unknown) => {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return undefined;
    throw error;
  });
  if (instructions === undefined) log(`warning: ${instructionsPath} not found; running without profile instructions`);
  const resultsDir = values.results ?? DEFAULT_RESULTS;
  const model = values.model ?? null;
  // A retro compares every iteration with the run it started from, not with the last saved one.
  const previous = values.baseline
    ? (JSON.parse(await readFile(values.baseline, "utf8")) as TriggerRun)
    : skill ? undefined : await latestRun(resultsDir, model);
  log(`running ${cases.length} cases with ${values.model ?? "the default model"}`);
  const run = await runTriggerEval({
    skills,
    instructions,
    cases,
    model: values.model,
    concurrency: 4,
    retries,
    ...(previous ? { baseline: previous } : {}),
    ...(values.claude ? { claude: values.claude } : {}),
    onResult: (result, done) => log(`${done > cases.length ? "rerun  " : `${String(done).padStart(3)}/${cases.length}`} ${result.pass ? "pass" : "FAIL"}  ${result.prompt.slice(0, 70)}`),
  });
  const failed = run.results.some((result) => result.error);
  // A run with errored cases would hide their regressions as the next baseline.
  const file = skill || failed ? undefined : await saveRun(resultsDir, run);
  if (values.json) {
    print(JSON.stringify({ ...run, scores: scoreBySkill(run.results), file }, null, 2));
    return failed ? 1 : 0;
  }
  const scored = run.results.filter((result) => !result.error);
  print(`passed ${scored.filter((result) => result.pass).length}/${scored.length}` + (failed ? ` (${run.results.length - scored.length} errors)` : ""));
  const sampled = (result: TriggerResult): string => (result.picks ? ` (${result.picks.filter((pick) => judge(result, pick)).length}/${result.picks.length} runs)` : "");
  for (const result of run.results.filter((item) => !item.pass)) {
    print(`  expected ${result.expect ?? "(none)"}, got ${result.error ? `error: ${result.error}` : (result.picked ?? "(none)")}${sampled(result)}: ${result.prompt}`);
  }
  for (const score of scoreBySkill(run.results).filter((item) => item.hits < item.cases || item.wrongPicks > 0)) {
    print(`  ${score.skill}: ${score.hits}/${score.cases} hits, ${score.wrongPicks} wrong picks`);
  }
  if (previous && (values.baseline || previous.catalogHash !== run.catalogHash)) {
    if (values.baseline) print(`compared with ${values.baseline}`);
    if (previous.resolvedModel && run.resolvedModel && previous.resolvedModel !== run.resolvedModel) print(`  warning: model changed (${previous.resolvedModel} -> ${run.resolvedModel})`);
    if (previous.instructionsHash !== undefined && previous.instructionsHash !== run.instructionsHash) print("  warning: profile instructions changed");
    for (const result of flips(previous, run)) print(`  ${result.pass ? "fixed" : "regressed"}${sampled(result)}: ${result.prompt}`);
  }
  if (file) print(`saved ${file}`);
  return failed ? 1 : 0;
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
