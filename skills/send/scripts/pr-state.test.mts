import assert from "node:assert/strict";
import { test } from "node:test";
import {
  HEAD_MAX_MS,
  IDLE_MS,
  TOTAL_MS,
  assess,
  feedbackKeys,
  headUpdating,
  fence,
  humanApprovalsOnHead,
  latestChecks,
  logExcerpt,
  nextWatch,
  parseArgs,
  parseCheck,
  parsePr,
  parseRef,
  render,
  riskSignals,
  saved,
  stripControl,
  timedOut,
  waitOver,
  type Check,
  type Pr,
  type Review,
} from "./pr-state.mts";

const HEAD = "a".repeat(40);
const REF = { owner: "acme", repo: "app", number: 7 };
const user = (login: string) => ({ login, bot: false });
const bot = (login: string) => ({ login, bot: true });

function check(overrides: Partial<Check> = {}): Check {
  return { name: "test", workflow: "CI", startedAt: "2026-11-01T10:00:00Z", result: "success", detail: "SUCCESS", required: true, url: "", jobId: 1, id: 1, ...overrides };
}

function pr(overrides: Partial<Pr> = {}): Pr {
  return {
    title: "feat: x", url: "https://github.com/acme/app/pull/7", state: "OPEN", draft: false, head: HEAD, base: "f".repeat(40),
    headDate: "2026-11-01T10:00:00Z", headRef: "feat/x", baseRef: "main", mergeable: "MERGEABLE", mergeState: "CLEAN",
    reviewDecision: "", autoMerge: false, inMergeQueue: false, files: ["src/a.ts"], filesTruncated: false,
    checks: [check()], threads: [], reviews: [], comments: [], truncated: [],
    ...overrides,
  };
}

function review(overrides: Partial<Review>): Review {
  return { id: "r", state: "APPROVED", author: user("ana"), canPush: true, commit: HEAD, submittedAt: "2026-11-01T11:00:00Z", url: "", body: "", ...overrides };
}

const idle = { noChecksPending: false };

test("parseRef accepts only pull requests with an explicit repository", () => {
  assert.deepEqual(parseRef("acme/app#7"), REF);
  assert.deepEqual(parseRef("https://github.com/acme/app/pull/7/checks?x=1"), REF);
  assert.throws(() => parseRef("7"), /owner\/repo#number/);
  assert.throws(() => parseRef("https://github.com/acme/app/issues/7"), /owner\/repo#number/);
});

test("parseArgs reads the wait options", () => {
  const args = parseArgs(["acme/app#7", "out", "--wait", "--max-minutes", "2", "--head", HEAD, "--merge-requested", "--restart"]);
  assert.equal(args.wait, true);
  assert.equal(args.maxMs, 120_000);
  assert.equal(args.head, HEAD);
  assert.equal(args.mergeRequested, true);
  assert.equal(args.restart, true);
  assert.throws(() => parseArgs(["acme/app#7"]), /usage/);
  assert.throws(() => parseArgs(["acme/app#7", "out", "--fast"]), /Unknown option/);
  assert.throws(() => parseArgs(["acme/app#7", "out", "--max-minutes", "0.5"]), /at least 1/);
  assert.throws(() => parseArgs(["acme/app#7", "out", "--head", "abc"]), /40-character/);
});

test("parseCheck maps run conclusions and commit statuses", () => {
  const run = (status: string, conclusion: string | null) => parseCheck({
    __typename: "CheckRun", name: "ci", status, conclusion, isRequired: true, databaseId: 77,
    checkSuite: { workflowRun: { databaseId: 9, workflow: { name: "CI" } } },
  });
  assert.equal(run("IN_PROGRESS", null).result, "pending");
  assert.equal(run("COMPLETED", "SUCCESS").result, "success");
  assert.equal(run("COMPLETED", "NEUTRAL").result, "skipped");
  assert.equal(run("COMPLETED", "TIMED_OUT").result, "failure");
  assert.equal(run("COMPLETED", "FAILURE").jobId, 77);
  assert.equal(run("COMPLETED", "FAILURE").workflow, "CI");
  // A check run outside GitHub Actions has no job log to download.
  assert.equal(parseCheck({ __typename: "CheckRun", name: "ext", status: "COMPLETED", conclusion: "FAILURE", databaseId: 5, checkSuite: { workflowRun: null } }).jobId, undefined);
  assert.equal(parseCheck({ __typename: "StatusContext", context: "ext", state: "ERROR" }).result, "failure");
  assert.equal(parseCheck({ __typename: "StatusContext", context: "ext", state: "PENDING" }).result, "pending");
});

test("latestChecks keeps the newest run of each workflow job", () => {
  const checks = latestChecks([
    check({ result: "failure", startedAt: "2026-11-01T10:00:00Z", id: 1 }),
    check({ result: "pending", startedAt: "", id: 2 }),
    check({ workflow: "Lint", result: "failure" }),
  ]);
  // The queued rerun has no start time yet; its higher run id still wins.
  assert.deepEqual(checks.map((c) => [c.workflow, c.result]), [["CI", "pending"], ["Lint", "failure"]]);
  const statuses = latestChecks([check({ id: undefined, startedAt: "1" }), check({ id: undefined, startedAt: "2", result: "failure" })]);
  assert.equal(statuses[0]?.result, "failure");
});

test("parsePr converts the payload and reports truncation", () => {
  const { pr: parsed, threadCursor } = parsePr({ data: { repository: { pullRequest: {
    title: "t", url: "u", state: "OPEN", isDraft: true, headRefOid: HEAD, mergeable: "UNKNOWN", autoMergeRequest: null,
    files: { pageInfo: { hasNextPage: true }, nodes: [{ path: "a.ts" }] },
    commits: { nodes: [{ commit: { committedDate: "d", statusCheckRollup: null } }] },
    reviews: { pageInfo: { hasPreviousPage: true }, nodes: [] },
    comments: { pageInfo: { hasPreviousPage: false }, nodes: [{ id: "c1", body: "hi", author: { __typename: "Bot", login: "x" } }] },
    reviewThreads: { pageInfo: { hasNextPage: true, endCursor: "CUR" }, nodes: [{ id: "T1", isResolved: false, path: "a.ts", line: 3, comments: { nodes: [] } }] },
  } } } });
  assert.equal(parsed.draft, true);
  assert.equal(parsed.autoMerge, false);
  assert.equal(parsed.filesTruncated, true);
  assert.deepEqual(parsed.checks, []);
  assert.equal(parsed.comments[0]?.author.bot, true);
  assert.equal(parsed.threads[0]?.line, 3);
  assert.equal(threadCursor, "CUR");
  // Truncated files only weaken the risk signal; they do not block the read.
  assert.deepEqual(parsed.truncated, ["reviews before the last 100"]);
  assert.throws(() => parsePr({ data: { repository: { pullRequest: null } } }), /not found/);
});

test("assess classifies the merge state", () => {
  assert.equal(assess(pr({ state: "MERGED" }), idle).status, "closed");
  const clean = assess(pr(), idle);
  assert.equal(clean.status, "ready");
  assert.deepEqual(clean.actions, []);

  const busy = assess(pr({
    mergeable: "CONFLICTING",
    autoMerge: true,
    checks: [check({ name: "lint", result: "failure", detail: "FAILURE", required: false })],
    threads: [
      { id: "T1", resolved: false, outdated: true, path: "a.ts", line: 4, truncated: false, comments: [{ id: "1", author: bot("rabbit"), createdAt: "", url: "", body: "" }] },
      { id: "T2", resolved: false, outdated: false, path: "b.ts", line: undefined, truncated: false, comments: [{ id: "2", author: user("ana"), createdAt: "", url: "", body: "" }] },
      { id: "T3", resolved: true, outdated: false, path: "c.ts", line: 1, truncated: false, comments: [] },
    ],
    reviews: [review({ state: "CHANGES_REQUESTED", author: user("rui") })],
  }), idle);
  assert.equal(busy.status, "action");
  assert.deepEqual(busy.actions.map((a) => a.kind), ["auto-merge", "conflict", "check", "bot-thread", "human-thread", "changes-requested"]);
  assert.match(busy.actions[3]?.text ?? "", /outdated/);

  const pending = assess(pr({ draft: true, checks: [], reviewDecision: "REVIEW_REQUIRED" }), { noChecksPending: true });
  assert.equal(pending.status, "waiting");
  assert.deepEqual(pending.waiting, ["leaving draft", "checks to be reported on the new head", "required approval"]);

  // After the grace period a PR without checks is not held back, but the report says so.
  const noChecks = assess(pr({ checks: [] }), idle);
  assert.equal(noChecks.status, "ready");
  assert.ok(noChecks.unchecked.some((u) => /No checks were reported/.test(u)));
  assert.equal(assess(pr({ mergeState: "BLOCKED" }), idle).status, "waiting");
});

test("assess never reports a truncated read as ready", () => {
  const result = assess(pr({ truncated: ["checks beyond the first 100"] }), idle);
  assert.equal(result.status, "action");
  assert.equal(result.actions[0]?.kind, "incomplete-read");
});

test("assess treats a merge the agent requested as pending and flags a foreign head", () => {
  assert.deepEqual(assess(pr({ inMergeQueue: true }), { ...idle, mergeRequested: true }).waiting, ["merge requested (the PR is in a merge queue)"]);
  const moved = assess(pr(), { ...idle, expectedHead: "b".repeat(40) });
  assert.deepEqual(moved.actions.map((a) => a.kind), ["head-changed"]);
  assert.equal(assess(pr({ state: "CLOSED" }), { ...idle, expectedHead: "b".repeat(40) }).actions[0]?.kind, "head-changed");
});

test("humanApprovalsOnHead keeps only write-access humans on the current head", () => {
  const reviews = [
    review({ id: "1", author: user("ana") }),
    review({ id: "2", author: user("old"), commit: "b".repeat(40) }),
    review({ id: "3", author: bot("approver") }),
    review({ id: "4", author: user("guest"), canPush: false }),
    review({ id: "5", author: user("rui") }),
    review({ id: "6", author: user("rui"), state: "CHANGES_REQUESTED", submittedAt: "2026-11-01T12:00:00Z" }),
    review({ id: "7", author: user("ana"), state: "COMMENTED", submittedAt: "2026-11-01T13:00:00Z" }),
  ];
  assert.deepEqual(humanApprovalsOnHead(pr({ reviews })).map((r) => r.id), ["1"]);
});

test("riskSignals flags the high-risk areas of full-send by path", () => {
  const signals = riskSignals([
    ".github/workflows/ci.yml", "infra/main.tf", "db/migrations/001.sql", "src/auth/session.ts",
    "src/payments/pix.ts", "src/author.ts", "src/ui/button.tsx",
  ]);
  assert.deepEqual(signals.map((s) => s.area), ["CI workflow", "infrastructure or deploy", "data migration", "authentication or permissions", "payment"]);
  assert.deepEqual(signals.find((s) => s.area === "authentication or permissions")?.files, ["src/auth/session.ts"]);
});

test("watch timers restart on a new head and stop at the send limits", () => {
  const start = nextWatch(undefined, pr(), 0, ["conflict"]);
  assert.deepEqual(start.baseline, ["conflict"]);
  assert.equal(timedOut(start, IDLE_MS - 1, false), undefined);
  assert.match(timedOut(start, IDLE_MS, false) ?? "", /without a relevant change/);
  // A running check keeps the watch alive until the total limit.
  assert.equal(timedOut(start, IDLE_MS, true), undefined);
  assert.match(timedOut(start, TOTAL_MS, true) ?? "", /30 minutes watching this head and base/);

  const changed = nextWatch(start, pr({ mergeable: "UNKNOWN" }), IDLE_MS - 1, []);
  assert.equal(changed.lastChangeAt, IDLE_MS - 1);
  assert.deepEqual(changed.baseline, ["conflict"]);
  assert.equal(nextWatch(changed, pr({ mergeable: "UNKNOWN" }), IDLE_MS, []).lastChangeAt, IDLE_MS - 1);

  // Another PR merged into the base: the 30-minute window reopens, the baseline and the head clock stay.
  const rebasedBase = nextWatch(changed, pr({ mergeable: "UNKNOWN", base: "e".repeat(40) }), TOTAL_MS, ["z"]);
  assert.deepEqual([rebasedBase.startedAt, rebasedBase.headStartedAt, rebasedBase.base, rebasedBase.baseline],
    [TOTAL_MS, 0, "e".repeat(40), ["conflict"]]);
  assert.equal(timedOut(rebasedBase, TOTAL_MS, false), undefined);
  assert.match(timedOut(rebasedBase, HEAD_MAX_MS, true) ?? "", /60 minutes watching this head across base changes/);
  // A watch saved before the base was recorded reopens its window on the next read.
  assert.equal(nextWatch({ ...changed, base: "" }, pr({ mergeable: "UNKNOWN" }), TOTAL_MS, []).startedAt, TOTAL_MS);

  const pushed = nextWatch(changed, pr({ head: "c".repeat(40) }), TOTAL_MS, ["x"]);
  assert.equal(pushed.startedAt, TOTAL_MS);
  assert.deepEqual(pushed.baseline, ["x"]);
  assert.equal(nextWatch(changed, pr({ mergeable: "UNKNOWN" }), TOTAL_MS, ["y"], "restart").startedAt, TOTAL_MS);
  const rebased = nextWatch(changed, pr({ mergeable: "UNKNOWN" }), TOTAL_MS, ["y"], "rebase");
  assert.deepEqual([rebased.startedAt, rebased.baseline], [0, ["y"]]);
});

test("waitOver ignores known actions while checks run and stops on anything new", () => {
  const known = (p: Pr) => [...assess(p, idle).actions.map((a) => a.key), ...feedbackKeys(p)];
  const before = pr({ checks: [check({ result: "pending", detail: "IN_PROGRESS" })], reviews: [review({ id: "r1", state: "CHANGES_REQUESTED", commit: "b".repeat(40) })] });
  const watch = nextWatch(undefined, before, 0, known(before));
  assert.equal(waitOver(assess(before, idle), watch, known(before)), false);

  const commented = pr({ ...before, reviews: [...before.reviews, review({ id: "r2", state: "COMMENTED", body: "nit" })] });
  assert.equal(waitOver(assess(commented, idle), watch, known(commented)), true);

  const finished = pr({ ...before, checks: [check()] });
  assert.equal(waitOver(assess(finished, idle), watch, known(finished)), true);

  // A new wait on the same head, after the agent handled that review, waits for the check again.
  const handled = pr({ ...commented, threads: [{ id: "T1", resolved: false, outdated: false, path: "a.ts", line: 1, truncated: false, comments: [] }] });
  const renewed = nextWatch(watch, handled, 1, known(handled), "rebase");
  assert.equal(waitOver(assess(handled, idle), renewed, known(handled)), false);

  // The base moved and the PR fell behind: that action is new, so the wait ends with work still pending.
  const behind = pr({ ...handled, base: "e".repeat(40), mergeState: "BEHIND", reviewDecision: "REVIEW_REQUIRED" });
  const afterBase = nextWatch(renewed, behind, 2, known(behind));
  const result = assess(behind, idle);
  assert.ok(result.waiting.length > 0);
  assert.equal(waitOver(result, afterBase, known(behind)), true);
});

test("assess waits for GitHub to report a fresh push before calling the head foreign", () => {
  const other = "b".repeat(40);
  assert.deepEqual(assess(pr(), { ...idle, expectedHead: other, headUpdating: true }).waiting, [`PR head to update to \`${other}\``]);
  assert.equal(assess(pr(), { ...idle, expectedHead: other, headUpdating: false }).actions[0]?.kind, "head-changed");
});

test("fence outgrows any backtick run in the log", () => {
  assert.equal(fence("ok"), "```text\nok\n```");
  assert.equal(fence("a ```` b"), "`````text\na ```` b\n`````");
});

test("render shows every feedback body, the delta and the merge gate", () => {
  const before = pr();
  const after = pr({
    checks: [check({ result: "failure", detail: "FAILURE", jobId: 5 })],
    comments: [
      { id: "c0", author: user("old"), createdAt: "2026-10-30T00:00:00Z", url: "https://x/c0", body: "Earlier ask" },
      { id: "c1", author: user("ana"), createdAt: "2026-11-02T00:00:00Z", url: "https://x/c1", body: "<!-- hidden -->Please rename" },
    ],
    reviews: [
      review({ id: "r1" }),
      review({ id: "r2", state: "COMMENTED", author: bot("rabbit"), body: "Outside diff range: fix x" }),
      review({ id: "r0", state: "COMMENTED", commit: "b".repeat(40), body: "First line\nsecond line" }),
    ],
    files: [".github/workflows/ci.yml"],
    filesTruncated: true,
  });
  const result = assess(after, idle);
  const text = render(REF, after, result, { ...saved(REF, before, undefined), reviews: ["r0"] }, new Map([[5, { file: "/tmp/job-5.log", tail: "boom ```" }]]));
  assert.match(text, /Status: \*\*action\*\*/);
  assert.match(text, /- \[check\] Check `test` failure \(required\)\./);
  assert.match(text, /New review APPROVED by ana/);
  assert.match(text, /New comment by ana: https:\/\/x\/c1/);
  assert.match(text, /Full log: `\/tmp\/job-5\.log`. Excerpt:[\s\S]*````text\nboom ```\n````/);
  assert.match(text, /> Please rename/);
  assert.match(text, /before the head commit · https:\/\/x\/c0\n\n> Earlier ask/);
  assert.match(text, /COMMENTED by rabbit \[bot\][\s\S]*> Outside diff range: fix x/);
  assert.doesNotMatch(text, /hidden/);
  // A body already shown and not on the head collapses to its first line.
  assert.match(text, /> First line _\(seen before; full text at the link\)_/);
  assert.doesNotMatch(text, /second line/);
  assert.match(text, /Human approval on the head: ana/);
  assert.match(text, /High-risk path signals: CI workflow .* \(partial: changed files were truncated\)/);
  assert.match(render(REF, before, assess(before, idle), undefined, new Map()), /none matched \(path heuristic\)/);
});

test("stripControl removes terminal escapes and control characters", () => {
  assert.equal(stripControl("\u001b[31mred\u001b[0m\tok\r\nnext\u0007"), "red\tok\nnext");
});

test("logExcerpt centers on the first error annotation", () => {
  const log = [...Array.from({ length: 100 }, (_, i) => `line ${i}`), "##[error]boom", "post 1", "cleanup"].join("\n");
  const excerpt = logExcerpt(log).split("\n");
  assert.equal(excerpt.length, 38);
  assert.equal(excerpt[35], "##[error]boom");
  assert.equal(logExcerpt("a\nb"), "a\nb");
});

test("riskSignals matches delimited and camelCase spellings of auth and payment", () => {
  const files = [
    "src/authentication/guard.ts", "authorization.service.ts", "AuthModule.ts", "src/useAuth.ts", "jwt-auth.guard.ts",
    "AuthenticationService.ts", "AuthorizationGuard.ts", "useAuthentication.ts", "OAuth2Strategy.ts", "oauth2/cb.ts",
    "authorize.middleware.ts", "authenticate.ts", "Authenticator.ts", "AuthenticatedRoute.tsx", "useAuth-guard.ts",
    "useAuth_test.ts", "v2Auth.ts", "authorised.ts",
    "PaymentService.ts", "payment-gateway/x.ts", "usePayment-form.ts",
    "src/author.ts", "src/Authors.tsx", "docs/oauthors.md", "src/authority.ts", "AuthorList.tsx",
  ];
  assert.deepEqual(riskSignals(files).flatMap((r) => r.files), files.slice(0, 21));
});

test("headUpdating gives a fresh push the grace, with or without an earlier read", () => {
  const old = "a".repeat(40);
  assert.equal(headUpdating(old, old, 1000), true);
  assert.equal(headUpdating(undefined, old, 1000), true);
  // A head that moved since the earlier read was pushed by someone else.
  assert.equal(headUpdating(old, "b".repeat(40), 1000), false);
  assert.equal(headUpdating(undefined, old, 3 * 60_000), false);
});
