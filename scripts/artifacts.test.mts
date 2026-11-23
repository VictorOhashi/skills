import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readdir, readFile, rm, stat, symlink, utimes, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import { promisify } from "node:util";
import { listRuns, main, newRun, originOf, parseDuration, removeRuns, runName, selectStale } from "./artifacts.mts";

const roots: string[] = [];

after(async () => {
  for (const root of roots) await rm(root, { recursive: true, force: true });
});

async function tmpRoot(): Promise<string> {
  const tmp = await mkdtemp(path.join(os.tmpdir(), "agent-artifacts-"));
  roots.push(tmp);
  return path.join(tmp, "artifacts");
}

async function run(root: string, rel: string, manifest?: object): Promise<string> {
  const dir = path.join(root, rel);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "print.png"), "x".repeat(10));
  if (manifest) await writeFile(path.join(dir, "manifest.json"), JSON.stringify(manifest));
  return dir;
}

const NOW = new Date("2026-11-04T12:00:00Z");

test("parseDuration accepts hours, days and weeks only", () => {
  assert.equal(parseDuration("12h"), 12 * 3_600_000);
  assert.equal(parseDuration("30d"), 30 * 86_400_000);
  assert.equal(parseDuration("2w"), 14 * 86_400_000);
  for (const bad of ["", "30", "0d", "1m", "-1d"]) assert.throws(() => parseDuration(bad), /Invalid duration/);
});

test("clean selects runs by age, skill, repo and branch and keeps the rest", async () => {
  const root = await tmpRoot();
  await run(root, "council/20260901-1000-app-wallet", { createdAt: "2026-09-01T10:00:00Z", repo: "app", branch: "main" });
  await run(root, "pr-prints/20261101-0900-app", { createdAt: "2026-11-01T09:00:00Z", repo: "app", branch: "feat/x" });
  const noManifest = await run(root, "mockup/20260801-1200-lib");
  await utimes(noManifest, new Date("2026-08-01"), new Date("2026-08-01"));
  // Subfolders belong to their run; symlinked runs are skipped.
  await mkdir(path.join(root, "council", "20260901-1000-app-wallet", "a1"), { recursive: true });
  await symlink(os.tmpdir(), path.join(root, "council", "linked"));

  const runs = await listRuns(root);
  assert.deepEqual(runs.map((r) => `${r.skill}/${r.run}`), [
    "council/20260901-1000-app-wallet",
    "mockup/20260801-1200-lib",
    "pr-prints/20261101-0900-app",
  ]);
  assert.ok(runs.every((r) => r.bytes >= 10));
  assert.equal(runs[1]?.repo, undefined);

  const maxAgeMs = parseDuration("30d");
  const names = (filter: Partial<Parameters<typeof selectStale>[1]>) =>
    selectStale(runs, { maxAgeMs, now: NOW, ...filter }).map((r) => r.skill);
  assert.deepEqual(names({}), ["council", "mockup"]);
  assert.deepEqual(names({ skill: "mockup" }), ["mockup"]);
  // Repo and branch come from manifest.json, so the run without one never matches them.
  assert.deepEqual(names({ repo: "app" }), ["council"]);
  assert.deepEqual(names({ maxAgeMs: parseDuration("1d"), branch: "feat/x" }), ["pr-prints"]);

  await removeRuns(root, selectStale(runs, { maxAgeMs, now: NOW }));
  assert.deepEqual((await readdir(root)).sort(), ["council", "pr-prints"]);
  assert.deepEqual(await readdir(path.join(root, "council")), ["linked"]);
  assert.ok((await stat(path.join(root, "pr-prints", "20261101-0900-app"))).isDirectory());
});

test("removeRuns refuses paths outside the run depth", async () => {
  const root = await tmpRoot();
  const dir = await run(root, "council/20261104-1450-app");
  const [listed] = await listRuns(root);
  assert.ok(listed);
  await assert.rejects(removeRuns(root, [{ ...listed, dir: path.dirname(dir) }]), /not a run/);
  await assert.rejects(removeRuns(root, [{ ...listed, dir: os.tmpdir() }]), /not a run/);
  assert.ok((await stat(dir)).isDirectory());
});

test("runName follows AAAAMMDD-HHMM-<repo>[-<label>] in local time with safe parts", () => {
  const at = new Date(2026, 10, 4, 9, 5);
  assert.equal(runName(at, "my-app"), "20261104-0905-my-app");
  assert.equal(runName(at, "my-app", "Wallet Card"), "20261104-0905-my-app-wallet-card");
  assert.equal(runName(at, "../x", "../../etc"), "20261104-0905-x-etc");
  assert.equal(runName(at, "///"), "20261104-0905-repo");
  assert.equal(runName(at, "app", "Cartão PIX"), "20261104-0905-app-cartao-pix");
});

test("newRun writes the manifest and never reuses a run folder", async () => {
  const root = await tmpRoot();
  const origin = { repo: "app", branch: "feat/x", head: "a".repeat(40) };
  const first = await newRun(root, "pr-prints", origin, NOW, "wallet");
  const second = await newRun(root, "pr-prints", origin, NOW, "wallet");
  assert.equal(path.basename(second), `${path.basename(first)}-2`);
  assert.deepEqual(JSON.parse(await readFile(path.join(first, "manifest.json"), "utf8")), {
    skill: "pr-prints", repo: "app", branch: "feat/x", head: "a".repeat(40), createdAt: NOW.toISOString(),
  });
  // clean reads the same manifest back.
  const [listed] = await listRuns(root);
  assert.deepEqual([listed?.repo, listed?.branch, listed?.createdAt.toISOString()], ["app", "feat/x", NOW.toISOString()]);
  for (const bad of ["../x", "Council", "a/b", "", "-x"]) {
    await assert.rejects(newRun(root, bad, origin, NOW), /Invalid skill name/);
  }
});

test("newRun refuses a skill folder that is a symlink", async () => {
  const root = await tmpRoot();
  await mkdir(root, { recursive: true });
  const elsewhere = await mkdtemp(path.join(os.tmpdir(), "agent-artifacts-out-"));
  roots.push(elsewhere);
  await symlink(elsewhere, path.join(root, "council"));
  await assert.rejects(newRun(root, "council", { repo: "app", branch: "_local", head: null }, NOW), /not a directory/);
});

test("originOf names the main repository the same from a worktree and falls back outside Git", async () => {
  const tmp = await mkdtemp(path.join(os.tmpdir(), "agent-origin-"));
  roots.push(tmp);
  const main = path.join(tmp, "my-repo");
  await mkdir(main);
  // The user's global Git config (signing, hooks) must not change or block this test.
  const env = { ...process.env, GIT_CONFIG_GLOBAL: "/dev/null", GIT_CONFIG_NOSYSTEM: "1" };
  const git = (cwd: string, ...args: string[]) =>
    promisify(execFile)("git", ["-C", cwd, "-c", "user.email=t@t", "-c", "user.name=t", "-c", "commit.gpgsign=false", ...args], { env });
  await git(main, "init", "-q", "-b", "main");
  await git(main, "commit", "-q", "--allow-empty", "-m", "x");
  await git(main, "worktree", "add", "-q", "-b", "feat/y", path.join(tmp, "wt-other-name"));
  const fromMain = await originOf(main);
  const fromWorktree = await originOf(path.join(tmp, "wt-other-name"));
  assert.deepEqual([fromMain.repo, fromMain.branch], ["my-repo", "main"]);
  assert.deepEqual([fromWorktree.repo, fromWorktree.branch], ["my-repo", "feat/y"]);
  assert.match(fromWorktree.head ?? "", /^[0-9a-f]{40}$/);
  await git(main, "checkout", "-q", "--detach");
  assert.equal((await originOf(main)).branch, "_local");
  const plain = path.join(tmp, "no-git-here");
  await mkdir(plain);
  assert.deepEqual(await originOf(plain), { repo: "no-git-here", branch: "_local", head: null });
  await assert.rejects(originOf("relative/path"), /absolute path/);
  await assert.rejects(originOf(path.join(tmp, "missing")), /not a directory/);
  const empty = path.join(tmp, "empty-repo");
  await mkdir(empty);
  await git(empty, "init", "-q", "-b", "main");
  assert.deepEqual(await originOf(empty), { repo: "empty-repo", branch: "main", head: null });
});

test("clean only lists stale runs until --yes is passed", async () => {
  const root = await tmpRoot();
  const dir = path.join(root, "council", "20200101-0000-app");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "manifest.json"), JSON.stringify({ createdAt: "2020-01-01T00:00:00.000Z" }));
  assert.equal(await main(["clean", "--root", root]), 0);
  await stat(dir);
  assert.equal(await main(["clean", "--root", root, "--yes"]), 0);
  await assert.rejects(stat(dir), { code: "ENOENT" });
});
