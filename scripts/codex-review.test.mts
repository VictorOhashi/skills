import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { isReviewerRole, parseReviewerToml, reviewerEffort } from "./codex-review.mts";

const SKILLS = path.join(path.dirname(import.meta.dirname), "skills");

async function catalogReviewerFiles(): Promise<string[]> {
  const files: string[] = [];
  for (const skill of await readdir(SKILLS)) {
    const dir = path.join(SKILLS, skill, "extensions", "codex", "agents");
    const names = await readdir(dir).catch(() => []);
    for (const name of names) {
      if (name.endsWith(".toml") && isReviewerRole(name.slice(0, -".toml".length))) files.push(path.join(dir, name));
    }
  }
  return files;
}

test("isReviewerRole accepts only names ending in -reviewer", () => {
  assert.ok(isReviewerRole("loop-reviewer"));
  assert.ok(isReviewerRole("comment-reviewer"));
  for (const name of ["pr-observer", "arena-candidate", "reviewer", "-reviewer", "../x-reviewer", "x-reviewer.toml", "X-reviewer"]) {
    assert.equal(isReviewerRole(name), false, name);
  }
});

test("reviewerEffort lets callers lower validation effort only within the allowed list", () => {
  assert.equal(reviewerEffort("loop-reviewer", "high", undefined), "high");
  assert.equal(reviewerEffort("loop-reviewer", "high", "high"), "high");
  assert.equal(reviewerEffort("loop-reviewer", "high", "medium"), "medium");
  assert.throws(() => reviewerEffort("loop-reviewer", "high", "low"), /not allowed for loop-reviewer; use high or medium/);
  assert.throws(() => reviewerEffort("loop-reviewer", "high", "xhigh"), /not allowed/);
  assert.throws(() => reviewerEffort("council-reviewer", "high", "medium"), /not allowed for council-reviewer; use high$/);
});

test("every reviewer a Codex extension runs has its role file in the catalog", async () => {
  const roles = new Set((await catalogReviewerFiles()).map((file) => path.basename(file, ".toml")));
  let used = 0;
  for (const skill of await readdir(SKILLS)) {
    const text = await readFile(path.join(SKILLS, skill, "extensions", "codex", "SKILL.md"), "utf8").catch(() => "");
    for (const match of text.matchAll(/codex-review\.mts (\S+)/g)) {
      used += 1;
      assert.ok(roles.has(match[1] ?? ""), `${skill} runs ${match[1]} without a role file`);
    }
  }
  assert.ok(used > 0);
});

test("parseReviewerToml reads every reviewer role file of the catalog", async () => {
  const files = await catalogReviewerFiles();
  assert.ok(files.some((file) => file.endsWith("loop-reviewer.toml")));
  for (const file of files) {
    const spec = parseReviewerToml(await readFile(file, "utf8"));
    assert.ok(spec.model && spec.effort, file);
    assert.ok(spec.instructions.length > 20 && !spec.instructions.startsWith("\n") && !spec.instructions.includes('"""'), file);
  }
});

test("parseReviewerToml ignores tables and rejects what it cannot read exactly", () => {
  const spec = parseReviewerToml('model = "m"\nmodel_reasoning_effort = "high" # note\ndeveloper_instructions = """\nline 1\nline 2"""\n[features]\nmodel = "other"\n');
  assert.deepEqual(spec, { model: "m", effort: "high", instructions: "line 1\nline 2" });
  assert.throws(() => parseReviewerToml('model = "m"\nmodel_reasoning_effort = "high"\ndeveloper_instructions = """\na \\n b"""\n'), /Unsupported escape/);
  assert.throws(() => parseReviewerToml('model = "m"\nmodel_reasoning_effort = "high"\ndeveloper_instructions = """\nopen\n'), /Unterminated/);
  assert.deepEqual(parseReviewerToml('description = "a \\e # b"\nmodel = "m # 1" # c\nmodel_reasoning_effort = "high"\ndeveloper_instructions = """\nx"""\n').model, "m # 1");
  assert.throws(() => parseReviewerToml("model = 'm'\n"), /Unsupported value for model/);
  assert.throws(() => parseReviewerToml('model = "m"\n[x]\nmodel_reasoning_effort = "high"\n'), /Invalid reviewer definition/);
});
