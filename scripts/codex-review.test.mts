import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { REVIEWERS, parseReviewerToml, reviewerEffort } from "./codex-review.mts";

const SKILLS = path.dirname(import.meta.dirname);
const ROLE_FILES: Record<(typeof REVIEWERS)[number], string> = {
  "validation-reviewer": "validation-loop",
  "council-reviewer": "council",
  "comment-reviewer": "ban-comments",
  "test-reviewer": "ban-tests",
  "legacy-reviewer": "ban-legacy",
  "pattern-reviewer": "ban-bad-pattern",
};

test("reviewerEffort lets callers lower validation effort only within the allowed list", () => {
  assert.equal(reviewerEffort("validation-reviewer", "high", undefined), "high");
  assert.equal(reviewerEffort("validation-reviewer", "high", "high"), "high");
  assert.equal(reviewerEffort("validation-reviewer", "high", "medium"), "medium");
  assert.throws(() => reviewerEffort("validation-reviewer", "high", "low"), /not allowed for validation-reviewer; use high or medium/);
  assert.throws(() => reviewerEffort("validation-reviewer", "high", "xhigh"), /not allowed/);
  assert.throws(() => reviewerEffort("council-reviewer", "high", "medium"), /not allowed for council-reviewer; use high$/);
});

test("parseReviewerToml reads every reviewer role file of the catalog", async () => {
  for (const role of REVIEWERS) {
    const file = path.join(SKILLS, ROLE_FILES[role], "extensions", "codex", "agents", `${role}.toml`);
    const spec = parseReviewerToml(await readFile(file, "utf8"));
    assert.ok(spec.model && spec.effort, role);
    assert.ok(spec.instructions.length > 20 && !spec.instructions.startsWith("\n") && !spec.instructions.includes('"""'), role);
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
