import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, utimes, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import { turnOf, areaReport, busiestSessions, canonicalRuns, checkOf, DEFAULT_CATALOG, printedExit, repeatedGateRate, RENAMED, checkReport, commandSignature, failureKind, failureReport, ingestUsage, isCorrection, main, parseTranscript, repoReport, skillReport, versionReport } from "./usage.mts";

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
  for (const text of [
    "Não, era outro arquivo", "não.", "Nope, use the other file", "no, the other one", "na verdade quero o outro", "está errado",
    "reverte isso", "volta como estava", "para de mexer nesse arquivo", "pare!", "you broke the build", "isso não funcionou",
    "ainda está quebrado", "continua dando erro no CI", "esqueceu de rodar o lint", "você esqueceu o teste", "tá faltando o print",
    "faltou o teste de borda", "de novo o mesmo erro", "não gostei como ficou", "não ficou legal essa tela",
    "não tínhamos fechado que seria um bottom sheet?", "não é para só adicionar a label", "você quebrou o build", "deu erro",
    "tá tudo errado", "eu pedi pra não commitar", "por que você fez push?", "you forgot the tests", "that's wrong", "it still doesn't work", "stop.",
  ]) {
    assert.equal(isCorrection(text), true, text);
  }
  for (const text of [
    "pode mergear", "status?", "agora implementa o próximo", "faltou algo?", "para deploy em staging, qual o comando?",
    "não esquece de rodar o lint", "pare o dev server quando terminar", "volta pro main e abre outra branch", "não precisa de print",
    "no main já tem isso?", "stop the dev server when done", "o teste ainda está passando?", "continua com o próximo item",
    "para que serve esse script?", "nao sei, decide você", "esqueceu algo?", "tá faltando algum passo?", "o deploy quebrou ontem?",
    "quando deu erro no CI, o que aconteceu?", "estou achando muito bom", "notei que o CI ficou mais rápido, valeu",
    "perfeito, era isso que eu pedi", "faltou pouco! agora abre o PR", "na verdade, pode seguir assim mesmo",
    "como eu pedi antes, agora faz o deploy",
  ]) {
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
  assert.deepEqual(checkOf("pnpm preflight && git push"), { kind: "preflight", masked: false, reported: false, pushes: true }, "the gate right before the push still counts the push");
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
    "python scripts/seed.py",
    "bash -c x",
  ]) assert.equal(kind(command), undefined, command);
  assert.equal(kind("bash scripts/preflight.sh --quick"), "preflight");
  assert.equal(kind("./tooling/preflight.sh"), "preflight");
  assert.equal(kind("python -m pytest -x tests"), "test");
  assert.equal(kind("python3 -m mypy src"), "typecheck");
  assert.equal(kind("./scripts/test.sh"), "test");
  assert.equal(kind("poetry run pytest -q"), "test");
  assert.equal(kind("python manage.py test"), "test");
  assert.equal(kind("node scripts/test-utils.mts"), undefined, "a support script is not a check");
  assert.equal(kind("./scripts/seed-data.sh"), undefined);
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

test("a check that prints its own exit code is judged by the printed code", () => {
  assert.equal(checkOf("pnpm preflight > log 2>&1; echo EXIT $?")?.reported, true);
  assert.equal(checkOf("pnpm test | tail -3")?.reported, false);
  assert.equal(checkOf("pnpm test 2>&1 | tail -5; echo \"exit $?\"")?.reported, false, "$? after a pipe is the code of tail");
  assert.equal(checkOf("pnpm test | tail -5; echo \"exit ${PIPESTATUS[0]}\"")?.reported, true);
  assert.equal(checkOf("pnpm test > log 2>&1; tail -30 log; echo \"exit $?\"")?.reported, false, "the code printed is the one of tail");
  assert.equal(checkOf("pnpm test; pnpm lint; echo $?")?.reported, false);
  assert.deepEqual(checkOf("(pnpm preflight > log 2>&1; echo EXIT $? >> log); tail -15 log"), { kind: "preflight", masked: true, reported: true, pushes: false }, "a subshell still runs the check");
  assert.equal(printedExit("...\nEXIT 1\n"), 1);
  assert.equal(printedExit("done\nexit=0"), 0);
  assert.equal(printedExit("Tests: 3 passed\n"), undefined);
  assert.equal(printedExit("0\n"), 0);
  assert.equal(printedExit("12\nall good"), undefined, "a bare number counts only as the last line");
  const { checks } = parseTranscript("/t/e.jsonl", jsonl([
    assistant("m1", "2026-11-01T10:00:00.000Z", 1, [bash("a", "pnpm preflight > log 2>&1; echo \"EXIT $?\"")]),
    toolResult("2026-11-01T10:01:00.000Z", "a", false, "EXIT 1"),
    assistant("m2", "2026-11-01T10:02:00.000Z", 1, [bash("b", "pnpm test; echo rc=$?")]),
    toolResult("2026-11-01T10:03:00.000Z", "b", false, "rc=0"),
    assistant("m3", "2026-11-01T10:04:00.000Z", 1, [bash("c", "pnpm test; echo $? > status")]),
    toolResult("2026-11-01T10:05:00.000Z", "c", false, ""),
  ]));
  assert.deepEqual(checks.map((check) => check.outcome), ["fail", "ok", "unknown"]);
});

test("a repeated gate is a session that ran the local gate more times than it pushed", () => {
  const run = (sessionId: string, kind: "preflight" | "push" | "test", pushes = false) => ({ id: "x", sessionId, file: "f", repo: "app", at: "2026-11-01T10:00:00.000Z", kind, command: "c", seconds: 1, background: false, outcome: "ok" as const, pushes });
  assert.equal(repeatedGateRate([run("s1", "test"), run("s1", "push")]), undefined, "no gate in the repository");
  assert.equal(repeatedGateRate([
    run("s1", "preflight"), run("s1", "preflight"), run("s1", "push"),
    run("s2", "preflight", true),
    run("s3", "preflight"), run("s3", "preflight"),
  ]), 0.5, "s3 never pushed; s2 ran the gate once for its push");
});

test("renamed skills point at current catalog skills", async () => {
  const { readdir } = await import("node:fs/promises");
  const catalog = await readdir(DEFAULT_CATALOG);
  for (const [old, current] of Object.entries(RENAMED)) {
    assert.ok(catalog.includes(current), `${old} -> ${current} is not in the catalog`);
    assert.ok(!catalog.includes(old), `${old} is still a catalog skill`);
  }
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
  assert.deepEqual((await ingestUsage(store, transcripts)).runs.map((run) => [run.skill, run.stale]), [["send", true], ["mockup", undefined], ["mockup", undefined]], "the deleted transcript's entry keeps its old classification, marked stale");
  const lines: string[] = [];
  await main(["skills", "--skill", "send", "--since", "2026-10-01", "--until", "2026-12-01", "--transcripts", transcripts, "--store", store], (line) => lines.push(line));
  assert.match(lines[0] ?? "", /since 2026-10-01 until 2026-12-01$/);
  assert.match(lines.join("\n"), /^all\s+2026-11-01\s+2026-11-01\s+1\s+1\s+\d+\s+\d+\s+-\s+0%\s+-\s/m, "a window of stale runs only shows no classification rate, not 0%");
});

test("rates that depend on the classification leave stale entries out", () => {
  const run = (reaction: "correction" | "other", stale?: true) => ({ id: "x", sessionId: "s", file: "f", repo: "app", at: "2026-11-01T10:00:00.000Z", skill: "send", version: "v", trigger: "model" as const, subagent: false, endedAt: "2026-11-01T10:01:00.000Z", outputTokens: 1, toolCalls: 1, toolErrors: 0, interrupted: false, reaction, ...(stale ? { stale } : {}) });
  const [stats] = skillReport([run("other"), { ...run("correction", true), toolErrors: 1 }], ["send"]).skills;
  assert.deepEqual(stats && [stats.runs, stats.staleRuns, stats.correctionRate, stats.toolErrorRate], [2, 1, 0, 0]);
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
  const check = (sessionId: string, outcome: "ok" | "unknown") => ({ id: "x", sessionId, file: "f", repo: "app", at: "2026-11-05T10:00:30.000Z", kind: "test" as const, command: "pnpm test", seconds: 1, background: false, outcome, pushes: false });
  const bySession = runs.map((run) => ({ ...run, sessionId: run.file }));
  const before = { ...check("/t/b.jsonl", "unknown"), at: "2026-11-05T09:00:00.000Z" };
  assert.deepEqual(versionReport(bySession, "send", [check("/t/a.jsonl", "ok"), before, check("/t/b.jsonl", "unknown"), check("/t/b.jsonl", "unknown"), check("other", "unknown")]).map((stats) => [stats.checks, stats.unknownRate]), [[1, 0], [2, 1]], "checks count from the load on, in the sessions where each version loaded");
  const push = { ...check("/t/b.jsonl", "ok"), kind: "push" as const, sessionId: "/t/b.jsonl" };
  const staleCheck = { ...check("/t/b.jsonl", "ok"), sessionId: "gone", stale: true as const };
  const runsB = [...bySession, { ...bySession[1]!, sessionId: "gone", stale: true as const }, { ...bySession[1]!, sessionId: "push-only" }];
  assert.deepEqual(versionReport(runsB, "send", [check("/t/b.jsonl", "unknown"), staleCheck, { ...push, sessionId: "push-only" }]).map((stats) => stats.unknownRate), [undefined, 1], "sessions without an eligible, current check stay out of the mean");

  const usage = parseTranscript("/t/d.jsonl", jsonl([
    human("faz o fix", "2026-11-05T10:00:00.000Z"),
    assistant("m1", "2026-11-05T10:00:01.000Z", 1, [bash("b1", "pnpm test")]),
    toolResult("2026-11-05T10:00:02.000Z", "b1", true),
    human("não, está errado", "2026-11-05T10:01:00.000Z"),
  ]));
  assert.deepEqual(repoReport(usage).map((stats) => [stats.repo, stats.prompts, stats.correctionRate, stats.failures]), [["app", 2, 0.5, 1]]);
});

test("a renamed catalog skill keeps one history", () => {
  const runs = parseTranscript("/t/r.jsonl", jsonl([
    skillLoad("full-send", "v1", "2026-11-01T10:00:00.000Z"),
    human("ok", "2026-11-01T10:01:00.000Z"),
    skillLoad("send-full", "v2", "2026-11-02T10:00:00.000Z"),
  ])).runs;
  const report = skillReport(canonicalRuns(runs), ["send-full"]);
  assert.deepEqual(report.skills.map((stats) => [stats.skill, stats.inCatalog, stats.runs, stats.versions]), [["send-full", true, 2, 2]]);
  assert.deepEqual(report.unused, []);
});

test("a session belongs to the main checkout of its folder, also from a linked worktree or a subfolder", async () => {
  const tmp = await mkdtemp(path.join(os.tmpdir(), "skills-usage-repo-"));
  roots.push(tmp);
  await mkdir(path.join(tmp, "shop", ".git", "worktrees", "shop-item7"), { recursive: true });
  await mkdir(path.join(tmp, "shop", "src"), { recursive: true });
  await mkdir(path.join(tmp, "shop-item7", "packages"), { recursive: true });
  await writeFile(path.join(tmp, "shop-item7", ".git"), `gitdir: ${path.join(tmp, "shop", ".git", "worktrees", "shop-item7")}\n`);
  await mkdir(path.join(tmp, "parent", ".git", "modules", "lib"), { recursive: true });
  await mkdir(path.join(tmp, "parent", "lib"), { recursive: true });
  await writeFile(path.join(tmp, "parent", "lib", ".git"), "gitdir: ../.git/modules/lib\n");
  const repoOf = (cwd: string) => parseTranscript("/t/x.jsonl", jsonl([{ ...human("oi", "2026-11-01T10:00:00.000Z"), cwd }])).prompts[0]?.repo;
  assert.equal(repoOf(path.join(tmp, "shop", "src")), "shop");
  assert.equal(repoOf(path.join(tmp, "shop-item7", "packages")), "shop");
  assert.equal(repoOf(path.join(tmp, "parent", "lib")), "lib", "a submodule is its own repository");
  assert.equal(repoOf("/gone/app/.claude/worktrees/feature-x"), "app", "a deleted folder keeps its name without the worktree suffix");
});

test("the skills report keeps command-only skills apart from unused ones", async () => {
  const tmp = await mkdtemp(path.join(os.tmpdir(), "skills-usage-catalog-"));
  roots.push(tmp);
  const transcripts = path.join(tmp, "projects");
  await mkdir(path.join(transcripts, "p"), { recursive: true });
  await writeFile(path.join(transcripts, "p", "s.jsonl"), jsonl([skillLoad("full-send", "v1", new Date().toISOString())]));
  for (const [name, extra] of [["send-full", ""], ["retro-skill", "disable-model-invocation: true\n"], ["planning", ""]] as const) {
    await mkdir(path.join(tmp, "catalog", name), { recursive: true });
    await writeFile(path.join(tmp, "catalog", name, "SKILL.md"), `---\nname: ${name}\ndescription: x\n${extra}---\n\n# ${name}\n`);
  }
  const lines: string[] = [];
  const args = ["--transcripts", transcripts, "--store", path.join(tmp, "usage"), "--catalog", path.join(tmp, "catalog")];
  assert.equal(await main(["skills", ...args], (line) => lines.push(line)), 0);
  const text = lines.join("\n");
  assert.match(text, /^send-full\s+1\s/m);
  assert.match(text, /^unused catalog skills: planning$/m);
  assert.match(text, /^unused, load only by command: retro-skill$/m);
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
  assert.match(lines.join("\n"), /^app\s+1\s+0\s+1\s+0%/m);
  await assert.rejects(main(["nope", ...args]), /Usage:/);
});

test("the turn reader prints the load turn and stops at the next human prompt", () => {
  const text = jsonl([
    human("first task", "2026-11-01T09:00:00.000Z"),
    human("open the PR", "2026-11-01T10:00:00.000Z"),
    skillLoad("send", "# Send", "2026-11-01T10:00:02.000Z", "toolu_1"),
    assistant("m1", "2026-11-01T10:00:03.000Z", 10, [{ type: "text", text: "Running the gate" }, bash("b1", "pnpm test")]),
    toolResult("2026-11-01T10:00:04.000Z", "b1", true, "Exit code 1\nboom"),
    human("no, use the other file", "2026-11-01T10:01:00.000Z"),
    assistant("m2", "2026-11-01T10:01:03.000Z", 10, [{ type: "text", text: "later work" }]),
  ]);
  const lines = turnOf(text, "load-send-2026-11-01T10:00:02.000Z");
  assert.deepEqual(lines.map((line) => line.slice("10:00:00 ".length)), [
    "user: open the PR",
    "skill loaded: Base directory for this skill: /home/u/.claude/skills/send",
    "assistant: Running the gate",
    'tool Bash: {"command":"pnpm test"}',
    "tool error: Exit code 1 boom",
    "user: no, use the other file",
  ]);
  assert.throws(() => turnOf(text, "missing"), /No record missing/);
});

test("tool err counts failed runs, not denied calls, empty searches or missing paths", () => {
  const { runs } = parseTranscript("/t/e.jsonl", jsonl([
    human("fix it", "2026-11-01T10:00:00.000Z"),
    skillLoad("send", "# Send", "2026-11-01T10:00:01.000Z"),
    assistant("m1", "2026-11-01T10:00:02.000Z", 1, [bash("d1", "rm -rf build"), bash("g1", "grep -r foo src"), bash("c1", "cat missing.txt"), bash("t1", "pnpm test")]),
    toolResult("2026-11-01T10:00:03.000Z", "d1", true, "Permission for this action was denied"),
    toolResult("2026-11-01T10:00:03.100Z", "g1", true, "Exit code 1"),
    toolResult("2026-11-01T10:00:03.200Z", "c1", true, "cat: missing.txt: No such file or directory"),
    toolResult("2026-11-01T10:00:03.300Z", "t1", true, "Exit code 1\n1 failing"),
    human("ok", "2026-11-01T10:01:00.000Z"),
  ]));
  assert.deepEqual(runs.map((run) => [run.toolCalls, run.toolErrors]), [[4, 1]]);
});

test("after a store version change, a fork still on disk replaces the stale entry of its deleted original", async () => {
  const tmp = await mkdtemp(path.join(os.tmpdir(), "skills-usage-fork-"));
  roots.push(tmp);
  const transcripts = path.join(tmp, "projects");
  const store = path.join(tmp, "usage");
  const original = path.join(transcripts, "p", "s1.jsonl");
  const fork = path.join(transcripts, "q", "s1-fork.jsonl");
  await mkdir(path.dirname(original), { recursive: true });
  await mkdir(path.dirname(fork), { recursive: true });
  const lines = [skillLoad("send", "# Send", "2026-11-01T10:00:00.000Z"), human("não, errado", "2026-11-01T10:01:00.000Z")];
  await writeFile(original, jsonl(lines));
  await writeFile(fork, jsonl(lines));
  await ingestUsage(store, transcripts);
  await rm(original);
  const storePath = path.join(store, "usage.json");
  const { readFile } = await import("node:fs/promises");
  const current = JSON.parse(await readFile(storePath, "utf8")) as Record<string, unknown>;
  await writeFile(storePath, JSON.stringify({ ...current, version: 1, files: {} }));
  const { runs, prompts } = await ingestUsage(store, transcripts);
  assert.deepEqual(runs.map((run) => [run.file, run.stale]), [[fork, undefined]]);
  assert.deepEqual(prompts.map((prompt) => [prompt.file, prompt.stale]), [[fork, undefined]]);
});
