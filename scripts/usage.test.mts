import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, utimes, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import { areaReport, busiestSessions, checkOf, checkReport, commandSignature, failureKind, failureReport, ingestUsage, isCorrection, main, parseTranscript, repoReport, skillReport, versionReport } from "./usage.mts";

const roots: string[] = [];
after(async () => {
  for (const root of roots) await rm(root, { recursive: true, force: true });
});

const base = { sessionId: "s1", cwd: "/work/app/.claude/worktrees/feature-x" };
let counter = 0;
const uuid = (): string => `u${counter++}`;

function human(text: string, timestamp: string) {
  return { ...base, type: "user", origin: { kind: "human" }, timestamp, uuid: uuid(), message: { role: "user", content: text } };
}

function skillLoad(name: string, body: string, timestamp: string, toolUse?: string) {
  return {
    ...base,
    type: "user",
    isMeta: true,
    timestamp,
    uuid: `load-${name}-${timestamp}`,
    ...(toolUse ? { sourceToolUseID: toolUse } : {}),
    message: { role: "user", content: [{ type: "text", text: `Base directory for this skill: /home/u/.claude/skills/${name}\n\n${body}` }] },
  };
}

function assistant(id: string, timestamp: string, outputTokens: number, content: object[]) {
  return { ...base, type: "assistant", timestamp, uuid: uuid(), message: { id, role: "assistant", content, usage: { output_tokens: outputTokens } } };
}

const bash = (id: string, command: string) => ({ type: "tool_use", id, name: "Bash", input: { command } });

function toolResult(timestamp: string, toolUseId: string, isError: boolean, content = "Exit code 1") {
  return { ...base, type: "user", timestamp, uuid: uuid(), toolUseResult: {}, message: { role: "user", content: [{ type: "tool_result", tool_use_id: toolUseId, is_error: isError, content }] } };
}

const bashBg = (id: string, command: string) => ({ type: "tool_use", id, name: "Bash", input: { command, run_in_background: true } });

const noticeText = (toolUseId: string, exitCode: number, status = "completed") =>
  `<task-notification>\n<task-id>x</task-id>\n<tool-use-id>${toolUseId}</tool-use-id>\n<status>${status}</status>\n<summary>Background command "run until exit code 0" completed (exit code ${exitCode})</summary>\n</task-notification>`;

/** The three records Claude Code writes for a completion notice. */
function notice(timestamp: string, toolUseId: string, exitCode: number, form: "user" | "queue" | "attachment" = "user", status = "completed") {
  const text = noticeText(toolUseId, exitCode, status);
  if (form === "queue") return { type: "queue-operation", operation: "enqueue", timestamp, sessionId: "s1", content: text };
  if (form === "attachment") return { ...base, type: "attachment", timestamp, uuid: uuid(), attachment: { type: "queued_command", prompt: text, commandMode: "task-notification" } };
  return { ...base, type: "user", timestamp, uuid: uuid(), message: { role: "user", content: text } };
}

const jsonl = (lines: object[]): string => lines.map((line) => JSON.stringify(line)).join("\n");

test("a skill turn ends at the next human prompt, which classifies the reaction", () => {
  const { runs, prompts } = parseTranscript("/t/s1.jsonl", jsonl([
    human("open the PR", "2026-11-01T10:00:00.000Z"),
    skillLoad("send", "# Send", "2026-11-01T10:00:02.000Z", "toolu_1"),
    // Same message split into two records: tokens count once.
    assistant("m2", "2026-11-01T10:00:03.000Z", 100, [bash("b1", "pnpm test")]),
    assistant("m2", "2026-11-01T10:00:03.500Z", 100, [bash("b2", "pnpm lint")]),
    toolResult("2026-11-01T10:00:04.000Z", "b1", true),
    skillLoad("pr-format", "# Format", "2026-11-01T10:00:05.000Z", "toolu_2"),
    assistant("m3", "2026-11-01T10:00:10.000Z", 30, []),
    human("não, está errado o título", "2026-11-01T10:05:00.000Z"),
  ]));
  assert.deepEqual(runs.map((run) => [run.skill, run.trigger, run.repo, run.outputTokens, run.toolCalls, run.toolErrors, run.reaction, run.endedAt]), [
    ["send", "model", "app", 130, 2, 1, "correction", "2026-11-01T10:00:10.000Z"],
    ["pr-format", "model", "app", 30, 0, 0, "correction", "2026-11-01T10:00:10.000Z"],
  ]);
  assert.deepEqual(prompts.map((prompt) => prompt.kind), ["other", "correction"]);
});

test("compaction summaries and repeated records do not end or double a turn", () => {
  const load = skillLoad("send", "# Send", "2026-11-01T10:00:00.000Z", "toolu_1");
  const call = { ...assistant("m1", "2026-11-01T10:00:01.000Z", 10, [bash("b1", "pnpm test")]), uuid: "a1" };
  const result = { ...toolResult("2026-11-01T10:00:02.000Z", "b1", true), uuid: "r1" };
  const compacted = {
    ...base, type: "user", turnOrigin: "human", isCompactSummary: true, timestamp: "2026-11-01T10:30:00.000Z", uuid: "c1",
    message: { role: "user", content: "This session is being continued from a previous conversation. Nao foi isso." },
  };
  const later = { ...assistant("m2", "2026-11-01T10:31:00.000Z", 20, [bash("b2", "pnpm build")]), uuid: "a2" };
  const usage = parseTranscript("/t/s1.jsonl", jsonl([load, call, result, load, call, result, compacted, later]));
  assert.equal(usage.runs.length, 1);
  assert.deepEqual(
    [usage.runs[0]?.toolCalls, usage.runs[0]?.toolErrors, usage.runs[0]?.outputTokens, usage.runs[0]?.endedAt, usage.runs[0]?.reaction],
    [2, 1, 30, "2026-11-01T10:31:00.000Z", "none"],
  );
  assert.deepEqual(usage.prompts, []);
  assert.equal(usage.failures.length, 1);
});

test("slash-command loads count as user runs and interruptions are recorded", () => {
  const { runs, prompts } = parseTranscript("/t/s1.jsonl", jsonl([
    human("<command-name>/send-full</command-name>", "2026-11-01T10:00:00.000Z"),
    skillLoad("send-full", "# Full send", "2026-11-01T10:00:01.000Z"),
    { ...base, type: "user", timestamp: "2026-11-01T10:00:09.000Z", uuid: uuid(), message: { role: "user", content: [{ type: "text", text: "[Request interrupted by user]" }] } },
  ]));
  assert.deepEqual([runs[0]?.trigger, runs[0]?.interrupted, runs[0]?.reaction], ["user", true, "none"]);
  assert.deepEqual(prompts.map((prompt) => prompt.kind), ["other", "interrupt"]);
});

test("subagent briefings are not human prompts and a session keeps the repository it started in", () => {
  const briefing = { type: "user", sessionId: "s1", cwd: "/work/app", timestamp: "2026-11-01T10:00:00.000Z", uuid: uuid(), message: { role: "user", content: "Nao edite arquivos. Revise o diff." } };
  const subagent = parseTranscript("/t/s1/subagents/agent-1.jsonl", jsonl([
    briefing,
    { ...briefing, uuid: uuid(), message: { role: "user", content: [{ type: "text", text: "[Request interrupted by user]" }] } },
  ]));
  assert.deepEqual(subagent.prompts, []);

  const moved = parseTranscript("/t/s2.jsonl", jsonl([
    { ...human("comeca", "2026-11-01T10:00:00.000Z"), cwd: "/work/app" },
    { ...human("nao, errado", "2026-11-01T10:01:00.000Z"), cwd: "/work/app/packages/api" },
  ]));
  assert.deepEqual(moved.prompts.map((prompt) => [prompt.repo, prompt.kind]), [["app", "other"], ["app", "correction"]]);
});

test("invocation arguments do not change the skill version", () => {
  const version = (body: string) => parseTranscript("/t/a.jsonl", jsonl([skillLoad("send", body, "2026-11-01T10:00:00.000Z")])).runs[0]?.version;
  assert.equal(version("# Send\n"), version("# Send\n\n\nARGUMENTS: PR 12"));
  assert.notEqual(version("# Send v2\n"), version("# Send\n"));
});

test("corrections are told apart from approvals and new requests", () => {
  for (const text of ["Não, era outro arquivo", "na verdade quero o outro", "está errado", "reverte isso", "you broke the build"]) {
    assert.equal(isCorrection(text), true, text);
  }
  for (const text of ["pode mergear", "status?", "agora implementa o próximo", "faltou algo?"]) {
    assert.equal(isCorrection(text), false, text);
  }
});

test("reviewer findings keep severity and repository path, once per finding line", () => {
  const report = [
    "VERDICT: CHANGES",
    "R1 [should] /work/app/.claude/worktrees/feature-x/src/api/user.ts:12-20 — returns stale data.",
    "- R2 [blocker] `src/api/auth.ts:3` — token logged.",
    "R3 [nit] README.md — typo.",
    "R4 [should] — no file for this one.",
  ].join("\n");
  const handBack = { ...base, type: "assistant", timestamp: "2026-11-01T10:00:00.000Z", uuid: uuid(), message: { id: "m", content: [{ type: "tool_use", id: "h", name: "SubagentHandback", input: { report: report.replace(/\n/g, "\n  ") } }] } };
  const quoted = { ...base, type: "user", timestamp: "2026-11-01T10:00:01.000Z", uuid: uuid(), toolUseResult: {}, message: { content: [{ type: "tool_result", tool_use_id: "h", content: report }] } };
  const unprefixed = { ...quoted, uuid: uuid(), message: { content: [{ type: "text", text: "R2 [blocker] `src/api/auth.ts:3` — token logged." }] }, type: "assistant" };
  const { findings } = parseTranscript("/t/s1.jsonl", jsonl([handBack, quoted, unprefixed]));
  const unique = new Map(findings.map((finding) => [finding.id, finding]));
  assert.deepEqual([...unique.values()].map((finding) => [finding.severity, finding.path, finding.repo]), [
    ["should", "src/api/user.ts", "app"],
    ["blocker", "src/api/auth.ts", "app"],
    ["nit", "README.md", "app"],
    ["should", "", "app"],
  ]);
  assert.deepEqual(areaReport([...unique.values()]).map((area) => [area.area, area.blockers, area.shoulds]), [
    ["src/api", 1, 1],
    ["(no path)", 0, 1],
  ]);
});

test("failed commands keep their kind and structure, never their arguments", () => {
  assert.equal(failureKind("Exit code 127\nzsh: command not found: pnpmx"), "not-found");
  assert.equal(failureKind("Exit code 1\ncat: x.md: No such file or directory"), "missing-path");
  assert.equal(failureKind("<tool_use_error>Blocked: sleep 60 followed by: gh pr checks"), "blocked");
  assert.equal(failureKind("Permission for this action was denied by the Claude Code auto mode"), "denied");
  assert.equal(failureKind("This session is isolated in the worktree /w; use paths inside it"), "outside-worktree");
  assert.equal(failureKind("Exit code 2\nFAIL src/a.test.ts"), "exit");

  assert.equal(commandSignature("cd /repo && PORT=3000 pnpm --filter web test -- --run && gh pr view 12"), "pnpm test && gh pr");
  assert.equal(commandSignature("B=/tmp/x; python3 - <<'EOF'\nimport json\nfor x in y: print(x)\nEOF\nnode \"$B/run.mts\" 'a; b'"), "python3 && node");
  assert.equal(commandSignature("for f in *.ts; do grep -n foo \"$f\"; done"), "grep");
  assert.equal(commandSignature("kubectl -n prod-ns get pods && git -c user.name=x commit -m y && git --git-dir /abs/repo log"), "kubectl get && git commit && git log");
  assert.equal(commandSignature("kubectl get-contexts/x && npm ./scripts/run.sh"), "kubectl && npm");

  const { failures } = parseTranscript("/t/s1.jsonl", jsonl([
    assistant("m1", "2026-11-01T10:00:00.000Z", 1, [bash("b1", "grep -rn secret-token src"), bash("b2", "pnpm test --filter api")]),
    toolResult("2026-11-01T10:00:01.000Z", "b1", true),
    toolResult("2026-11-01T10:00:02.000Z", "b2", true, "Exit code 1\n2 failed"),
  ]));
  assert.deepEqual(failures.map((failure) => [failure.kind, failure.command]), [["probe", "grep"], ["exit", "pnpm test"]]);
  assert.ok(!JSON.stringify(failures).includes("secret-token"));
  assert.deepEqual(failureReport(failures).map((stats) => [stats.kind, stats.count]), [["probe", 1], ["exit", 1]]);
});

test("verification commands are classified by the step that runs them", () => {
  const kind = (command: string) => checkOf(command)?.kind;
  assert.equal(kind("cd apps/web && pnpm --filter test-kit build"), "build", "a flag value is a target, not the check");
  assert.equal(kind("pnpm lint && pnpm --filter web test"), "test", "the broadest check of the command wins");
  assert.equal(kind("set -o pipefail; node tooling/ci/preflight.mjs | tail"), "preflight");
  assert.equal(kind("npx playwright test --project chromium"), "e2e");
  assert.equal(kind("node --test scripts/x.test.mts"), "test");
  assert.equal(kind("timeout 600 pnpm test"), "test");
  assert.equal(kind("env CI=1 pnpm lint"), "lint");
  assert.equal(kind("git add -A && git commit -m x && git push -u origin feat"), "push");
  assert.deepEqual(checkOf("pnpm preflight && git push"), { kind: "preflight", masked: false, pushes: true }, "the gate right before the push still counts the push");
  assert.equal(kind("gh pr checks 12 --watch"), "ci-wait");
  assert.equal(kind("node ~/.agents/build/claude/scripts/pr-state.mts 12 dir --wait"), "ci-wait");
  for (const command of [
    "gh pr checks 12",
    "grep -rn test src && cat README.md",
    "git log -- test/",
    "cat <<'EOF'\npnpm test\nEOF",
    "node ~/.agents/build/claude/scripts/usage.mts repos",
    "node ~/.agents/build/claude/scripts/pr-state.mts 12 dir",
    "pnpm add -D eslint",
    "npm i -D @playwright/test",
    "pnpm why vitest",
    "npx playwright install chromium",
    "uv pip install pytest",
  ]) assert.equal(kind(command), undefined, command);
});

test("a check whose exit code the command hides has an unknown outcome", () => {
  const masked = (command: string) => checkOf(command)?.masked;
  assert.equal(masked("pnpm preflight 2>&1 | tail -20"), true);
  assert.equal(masked("pnpm test |& tee out.log"), true);
  assert.equal(masked("pnpm test || true"), true);
  assert.equal(masked("pnpm test && echo PASS || echo FAIL"), true);
  assert.equal(masked("pnpm test; echo $?"), true, "a trivial command after it still sets the exit code");
  assert.equal(masked("pnpm test\ngit status"), true);
  assert.equal(masked("pnpm test && git push"), false, "the push is the broadest check and runs last");
  assert.equal(masked("pnpm lint && pnpm test"), false);
  assert.equal(masked("set -euo pipefail; pnpm test | tail"), false);
  assert.equal(masked("set +o pipefail; pnpm test | tail"), true);
  assert.equal(masked("set -e\npnpm test\ngit status"), false);
  assert.equal(masked("cat <<'EOF'\nset -o pipefail\nEOF\npnpm test | tail"), true, "pipefail in a heredoc does not count");
});

test("check time runs to the result, or to the completion notice in the background", () => {
  const { checks } = parseTranscript("/t/s1.jsonl", jsonl([
    assistant("m1", "2026-11-01T10:00:00.000Z", 1, [bash("t1", "pnpm --filter web test")]),
    toolResult("2026-11-01T10:00:30.000Z", "t1", false, "ok"),
    assistant("m2", "2026-11-01T10:01:00.000Z", 1, [bash("p1", "pnpm preflight 2>&1 | tail -5")]),
    toolResult("2026-11-01T10:03:00.000Z", "p1", false, "ok"),
    assistant("m3", "2026-11-01T10:04:00.000Z", 1, [bashBg("p2", "pnpm preflight")]),
    toolResult("2026-11-01T10:04:01.000Z", "p2", false, "Command running in background with ID: x"),
    assistant("m4", "2026-11-01T10:05:00.000Z", 1, [bash("p3", "git push")]),
    toolResult("2026-11-01T10:07:00.000Z", "p3", false, "Command did not complete within its 120s timeout and was moved to the background (ID: y). Its output is being written to /tmp/y.output."),
    // The queue entry carries the real end; the later copies of the same notice are ignored.
    notice("2026-11-01T10:14:00.000Z", "p2", 1, "queue"),
    notice("2026-11-01T10:14:30.000Z", "p2", 1, "user"),
    notice("2026-11-01T10:15:00.000Z", "p3", 0, "attachment"),
    assistant("m5", "2026-11-01T10:16:00.000Z", 1, [bashBg("p4", "pnpm preflight")]),
    assistant("m6", "2026-11-01T10:17:00.000Z", 1, [bashBg("p5", "pnpm preflight")]),
    notice("2026-11-01T22:17:00.000Z", "p5", 0),
    // A superseded run, a denied call and a tool result that prints a notice are not check results.
    assistant("m7", "2026-11-01T22:20:00.000Z", 1, [bashBg("p6", "pnpm preflight")]),
    notice("2026-11-01T22:21:00.000Z", "p6", 143, "queue", "killed"),
    assistant("m8", "2026-11-01T22:22:00.000Z", 1, [bash("p7", "pnpm test")]),
    toolResult("2026-11-01T22:23:00.000Z", "p7", true, "Permission for this command was denied"),
    assistant("m9", "2026-11-01T22:24:00.000Z", 1, [bashBg("p8", "pnpm lint"), bash("c1", "cat log")]),
    toolResult("2026-11-01T22:24:05.000Z", "c1", false, noticeText("p8", 0)),
    assistant("m10", "2026-11-01T22:25:00.000Z", 1, [bash("p9", "pnpm test")]),
    toolResult("2026-11-01T22:25:10.000Z", "p9", true, "Exit code 1\nError: ENOENT: no such file or directory"),
    assistant("m11", "2026-11-01T22:26:00.000Z", 1, [bash("p10", "pnpm preflight && git push")]),
    toolResult("2026-11-01T22:36:00.000Z", "p10", false, "ok"),
  ]));
  assert.deepEqual(checks.map((check) => [check.kind, check.seconds, check.background, check.outcome]), [
    ["test", 30, false, "ok"],
    ["preflight", 120, false, "unknown"],
    ["preflight", 600, true, "fail"],
    ["push", 600, true, "ok"],
    ["preflight", 43200, true, "ok"],
    ["test", 10, false, "unknown"],
    ["preflight", 600, false, "ok"],
  ], "a background run without a notice yet is left out; a missing file may be another step's failure");
  assert.deepEqual(busiestSessions(checks, "preflight").map((session) => [session.runs, session.pushes]), [[4, 2]]);
  const [preflight] = checkReport(checks);
  assert.deepEqual(preflight && [preflight.kind, preflight.runs, preflight.background, preflight.late, preflight.medianSeconds, Math.round(preflight.totalHours * 100) / 100, preflight.medianPerSession], ["preflight", 4, 2, 1, 600, 0.37, 4], "a notice delivered on resume is late and stays out of the times");
});

test("ingest keeps entries of deleted transcripts, drops fork copies and re-reads only changed files", async () => {
  const tmp = await mkdtemp(path.join(os.tmpdir(), "skills-usage-"));
  roots.push(tmp);
  const transcripts = path.join(tmp, "projects");
  const store = path.join(tmp, "usage");
  const first = path.join(transcripts, "p", "s1.jsonl");
  const second = path.join(transcripts, "p", "s2.jsonl");
  const fork = path.join(transcripts, "q", "s1-fork.jsonl");
  await mkdir(path.dirname(first), { recursive: true });
  await mkdir(path.dirname(fork), { recursive: true });
  await writeFile(first, jsonl([skillLoad("send", "# Send", "2026-11-01T10:00:00.000Z")]));
  await writeFile(second, jsonl([skillLoad("mockup", "# Mockup", "2026-11-02T10:00:00.000Z")]));
  // A fork copies the load into another transcript and goes further.
  await writeFile(fork, jsonl([skillLoad("send", "# Send", "2026-11-01T10:00:00.000Z"), assistant("m9", "2026-11-01T10:09:00.000Z", 5, [])]));
  const ingested = await ingestUsage(store, transcripts);
  assert.deepEqual(ingested.runs.map((run) => [run.skill, run.endedAt]), [["send", "2026-11-01T10:09:00.000Z"], ["mockup", "2026-11-02T10:00:00.000Z"]]);

  await rm(first);
  await rm(fork);
  await writeFile(second, jsonl([skillLoad("mockup", "# Mockup", "2026-11-02T10:00:00.000Z"), skillLoad("mockup", "# Mockup", "2026-11-02T11:00:00.000Z")]));
  await utimes(second, new Date(), new Date(Date.now() + 1000));
  assert.deepEqual((await ingestUsage(store, transcripts)).runs.map((run) => run.skill), ["send", "mockup", "mockup"]);

  // A store from another parser version keeps only entries whose transcript is gone, then re-reads the rest.
  const storePath = path.join(store, "usage.json");
  const { readFile } = await import("node:fs/promises");
  const current = JSON.parse(await readFile(storePath, "utf8")) as { runs: unknown[] };
  await writeFile(storePath, JSON.stringify({ version: 1, files: {}, runs: current.runs }));
  assert.deepEqual((await ingestUsage(store, transcripts)).runs.map((run) => run.skill), ["send", "mockup", "mockup"]);
});

test("reports compare skill versions and rank repositories", async () => {
  const runs = [
    ...parseTranscript("/t/a.jsonl", jsonl([skillLoad("send", "v1", "2026-11-01T10:00:00.000Z"), human("ok", "2026-11-01T10:01:00.000Z")])).runs,
    ...parseTranscript("/t/b.jsonl", jsonl([skillLoad("send", "v2", "2026-11-05T10:00:00.000Z"), human("não, errado", "2026-11-05T10:01:00.000Z")])).runs,
    ...parseTranscript("/t/c.jsonl", jsonl([skillLoad("old-skill", "x", "2026-11-05T10:00:00.000Z")])).runs,
  ];
  const report = skillReport(runs, ["send", "mockup"]);
  assert.deepEqual(report.skills.map((stats) => [stats.skill, stats.inCatalog, stats.runs, stats.versions, stats.correctionRate]), [
    ["send", true, 2, 2, 0.5],
    ["old-skill", false, 1, 1, 0],
  ]);
  assert.deepEqual(report.unused, ["mockup"]);
  assert.deepEqual(versionReport(runs, "send").map((stats) => [stats.firstUsed.slice(0, 10), stats.correctionRate]), [["2026-11-01", 0], ["2026-11-05", 1]]);

  const usage = parseTranscript("/t/d.jsonl", jsonl([
    human("faz o fix", "2026-11-05T10:00:00.000Z"),
    assistant("m1", "2026-11-05T10:00:01.000Z", 1, [bash("b1", "pnpm test")]),
    toolResult("2026-11-05T10:00:02.000Z", "b1", true),
    human("não, está errado", "2026-11-05T10:01:00.000Z"),
  ]));
  assert.deepEqual(repoReport(usage).map((stats) => [stats.repo, stats.prompts, stats.correctionRate, stats.failures]), [["app", 2, 0.5, 1]]);
});

test("the CLI ingests and prints the repository report", async () => {
  const tmp = await mkdtemp(path.join(os.tmpdir(), "skills-usage-cli-"));
  roots.push(tmp);
  const transcripts = path.join(tmp, "projects");
  await mkdir(path.join(transcripts, "p"), { recursive: true });
  await writeFile(path.join(transcripts, "p", "s.jsonl"), jsonl([human("oi", new Date().toISOString())]));
  const lines: string[] = [];
  const args = ["--transcripts", transcripts, "--store", path.join(tmp, "usage"), "--catalog", path.join(tmp, "none")];
  assert.equal(await main(["repos", ...args], (line) => lines.push(line)), 0);
  assert.match(lines.join("\n"), /^app\s+1\s+1\s+0%/m);
  await assert.rejects(main(["nope", ...args]), /Usage:/);
});
