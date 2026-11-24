import assert from "node:assert/strict";
import { chmod, mkdir, mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import { compileCatalog } from "./lint.mts";
import { DEFAULT_CASES, flips, invocableSkills, judge, main, parseCases, pickedSkill, scoreBySkill, type TriggerRun } from "./trigger-eval.mts";

const roots: string[] = [];
after(async () => {
  for (const root of roots) await rm(root, { recursive: true, force: true });
});

async function tmp(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "skills-trigger-"));
  roots.push(dir);
  return dir;
}

async function put(file: string, content: string): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, content);
}

const skillUse = (skill: string) => JSON.stringify({ type: "assistant", message: { content: [{ type: "thinking" }, { type: "tool_use", name: "Skill", input: { skill } }] } });

test("the picked skill is the first catalog skill the model loads", () => {
  const catalog = ["send", "pr-format"];
  assert.equal(pickedSkill([JSON.stringify({ type: "system" }), skillUse("send"), skillUse("pr-format")].join("\n"), catalog), "send");
  assert.equal(pickedSkill(skillUse("plugin:pr-format"), catalog), "pr-format");
  assert.equal(pickedSkill(skillUse("simplify"), catalog), null, "bundled skills are not catalog picks");
  assert.equal(pickedSkill("not json\n" + JSON.stringify({ type: "result" }), catalog), null);
});

test("cases name only skills the model can load, and accepted alternatives pass", () => {
  assert.throws(() => parseCases(JSON.stringify({ cases: [{ prompt: "x", expect: "arena" }] }), ["send"]), /arena is not a model-invocable/);
  assert.throws(() => parseCases(JSON.stringify({ cases: [{ prompt: "x", expect: "send", accept: "send" }] }), ["send"]), /accept must be a list/);
  const [testCase] = parseCases(JSON.stringify({ cases: [{ prompt: "x", expect: "send", accept: ["pr-format"] }] }), ["send", "pr-format"]);
  assert.ok(testCase);
  assert.equal(judge(testCase, "pr-format"), true);
  assert.equal(judge(testCase, null), false);
  assert.equal(judge({ prompt: "y", expect: null }, null), true);
});

test("the cases of this catalog name only model-invocable skills", async () => {
  const { readFile } = await import("node:fs/promises");
  const skills = await compileCatalog(path.join(path.dirname(DEFAULT_CASES), "..", "skills"), "claude");
  assert.ok(parseCases(await readFile(DEFAULT_CASES, "utf8"), invocableSkills(skills)).length > 0);
});

test("scores count misses for the expected skill and wrong picks for the chosen one", () => {
  const results = [
    { prompt: "a", expect: "send", picked: "send", pass: true },
    { prompt: "b", expect: "send", picked: "full-send", pass: false },
    { prompt: "c", expect: null, picked: "full-send", pass: false },
    { prompt: "d", expect: "send", picked: null, pass: false, error: "exit 1" },
  ];
  assert.deepEqual(scoreBySkill(results), [
    { skill: "full-send", cases: 0, hits: 0, wrongPicks: 2 },
    { skill: "send", cases: 2, hits: 1, wrongPicks: 0 },
  ]);
  const run = (passes: boolean[]): TriggerRun => ({ createdAt: "", catalogHash: "", model: null, results: passes.map((pass, index) => ({ prompt: String(index), expect: null, picked: null, pass })) });
  assert.deepEqual(flips(run([true, false, true]), run([false, true, true])).map((result) => [result.prompt, result.pass]), [["0", false], ["1", true]]);
});

test("each case runs isolated with the catalog's merged skills and the profile instructions", async () => {
  const dir = await tmp();
  const skills = path.join(dir, "skills");
  await put(path.join(skills, "send", "SKILL.md"), "---\nname: send\ndescription: d\n---\n");
  await put(path.join(skills, "send", "extensions", "claude", "SKILL.md"), "## Claude Code\n\nclaude-only text\n");
  await put(path.join(skills, "arena", "SKILL.md"), "---\nname: arena\ndescription: d\ndisable-model-invocation: true\n---\n");
  await put(path.join(dir, "cases.json"), JSON.stringify({ cases: [{ prompt: "please send it", expect: "send" }, { prompt: "unknown-skill now", expect: null }] }));
  await put(path.join(dir, "CLAUDE.md"), "profile rules");
  const fake = path.join(dir, "claude");
  // Loads the skill named in the prompt, but only if it is in the workspace with its Claude extension merged.
  await put(fake, `#!/bin/sh
prompt="$2"
case " $* " in *" --setting-sources project "*) ;; *) echo "missing isolation" >&2; exit 2;; esac
grep -q "profile rules" CLAUDE.md || { echo "missing CLAUDE.md" >&2; exit 2; }
for skill in .claude/skills/*; do
  name=$(basename "$skill")
  grep -q "claude-only text" "$skill/SKILL.md" || [ "$name" = arena ] || { echo "extension not merged" >&2; exit 2; }
  case "$prompt" in *"$name"*) echo '{"type":"assistant","message":{"content":[{"type":"tool_use","name":"Skill","input":{"skill":"'"$name"'"}}]}}';; esac
done
echo '{"type":"result","subtype":"error_max_turns"}'
exit 1
`);
  await chmod(fake, 0o755);
  const results = path.join(dir, "results");
  const args = ["--skills", skills, "--cases", path.join(dir, "cases.json"), "--instructions", path.join(dir, "CLAUDE.md"), "--results", results, "--claude", fake];
  const lines: string[] = [];
  assert.equal(await main(args, (line) => lines.push(line), () => {}), 0);
  assert.equal(lines[0], "passed 2/2");
  assert.equal((await readdir(results)).length, 1, "a full run without errors is saved");

  const broken = path.join(dir, "broken");
  await put(broken, "#!/bin/sh\nexit 3\n");
  await chmod(broken, 0o755);
  assert.equal(await main([...args.slice(0, -1), broken], () => {}, () => {}), 1);
  assert.equal((await readdir(results)).length, 1, "a run with errored cases is not saved as a baseline");
});
