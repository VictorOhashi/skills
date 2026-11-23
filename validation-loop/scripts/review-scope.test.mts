import assert from "node:assert/strict";
import { test } from "node:test";
import {
  LIGHT_MAX_FILES,
  LIGHT_MAX_LINES,
  briefingHeader,
  riskSignals,
  classify,
  parseArgs,
  parseNumstat,
  type Change,
} from "./review-scope.mts";

const change = (file: string, added: number, overrides: Partial<Change> = {}): Change =>
  ({ path: file, added, deleted: 0, binary: false, untracked: false, ...overrides });

test("parseNumstat reads plain, binary and renamed entries", () => {
  const text = "3\t1\tsrc/a.ts\0-\t-\timg/x.png\0" + "2\t0\t\0old/b.ts\0new/b.ts\0";
  assert.deepEqual(parseNumstat(text), [
    { path: "src/a.ts", added: 3, deleted: 1, binary: false, untracked: false },
    { path: "img/x.png", added: 0, deleted: 0, binary: true, untracked: false },
    { path: "new/b.ts", added: 2, deleted: 0, binary: false, untracked: false },
  ]);
  assert.deepEqual(parseNumstat(""), []);
});

test("classify gives the lighter reviewer only to small, low-risk diffs", () => {
  const small = classify([change("src/a.ts", 120), change("src/b.ts", 80, { untracked: true })], false);
  assert.equal(small.tier, "light");
  assert.deepEqual(small.counted, { files: 2, lines: 200 });
  assert.deepEqual(small.reasons, []);

  assert.deepEqual(classify([change("src/a.ts", LIGHT_MAX_LINES + 1)], false).reasons, ["201 changed lines (> 200)"]);
  const many = Array.from({ length: LIGHT_MAX_FILES + 1 }, (_, i) => change(`src/f${i}.ts`, 1));
  assert.deepEqual(classify(many, false).reasons, ["9 changed files (> 8)"]);
  assert.deepEqual(classify([change(".github/workflows/ci.yml", 2)], false).reasons, ["high-risk path signal: CI workflow"]);
  assert.deepEqual(classify([change("src/a.ts", 2)], true).reasons, ["security pass"]);
  assert.equal(classify([change("src/a.ts", 2)], true).tier, "full");
});

test("classify leaves lockfiles, snapshots and binaries out of the size", () => {
  const result = classify([
    change("pnpm-lock.yaml", 5000), change("apps/web/__snapshots__/a.snap", 900),
    change("img/x.png", 0, { binary: true }), change("src/a.ts", 10),
  ], false);
  assert.deepEqual(result.counted, { files: 1, lines: 10 });
  assert.equal(result.tier, "light");
});

test("parseArgs splits options from scoped paths", () => {
  assert.deepEqual(parseArgs(["repo", "--base", "origin/main", "--security", "--", "src", "docs"]).paths, ["src", "docs"]);
  assert.equal(parseArgs(["repo"]).base, undefined);
  assert.throws(() => parseArgs([]), /usage/);
  assert.throws(() => parseArgs(["repo", "--base"]), /expects a ref/);
  assert.throws(() => parseArgs(["repo", "--deep"]), /Unknown option/);
});

test("briefingHeader fixes repo, base and scope for every round", () => {
  const header = briefingHeader({
    repo: "/r", base: "abc", baseRef: "origin/main", paths: ["src"], changes: [],
    counted: { files: 0, lines: 0 }, risk: [], tier: "light", reasons: [],
  });
  assert.equal(header, "Repo: /r. Base: abc. Scope: src.\nSee: git diff abc -- src; git status --short -- src (read scoped untracked files).");
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
  const hits = riskSignals(files).flatMap((r) => r.files);
  assert.deepEqual(hits, files.slice(0, 21));
});
