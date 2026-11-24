import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { after, test } from "node:test";
import { DEFAULT_SKILLS, lintCatalog, main } from "./lint.mts";

const roots: string[] = [];
after(async () => {
  for (const root of roots) await rm(root, { recursive: true, force: true });
});

async function catalog(files: Record<string, string>): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "skills-lint-"));
  roots.push(dir);
  for (const [rel, content] of Object.entries(files)) {
    await mkdir(path.dirname(path.join(dir, rel)), { recursive: true });
    await writeFile(path.join(dir, rel), content);
  }
  return dir;
}

const skill = (name: string, body = "", description = "Use when testing.") => `---\nname: ${name}\ndescription: ${description}\n---\n\n# ${name}\n\n${body}`;
const messages = async (dir: string) => (await lintCatalog(dir)).map((issue) => `${issue.file}: ${issue.message} (${issue.harness})`);

test("the catalog in this repository passes the lint", async () => {
  assert.deepEqual(await messages(DEFAULT_SKILLS), []);
});

test("valid sibling links, extension anchors, quoted frontmatter and links inside code pass", async () => {
  const dir = await catalog({
    "alpha/SKILL.md": skill("alpha", "See [rules](references/rules.md#hard-rules), [beta](../beta/SKILL.md#beta) and [top](#alpha).\n\n`![x](./x.png)`\n\n```\n[y](missing.md)\n```\n", "'Quoted: it''s fine'"),
    "alpha/references/rules.md": "# Rules\n\n## Hard rules\n",
    "alpha/extensions/claude/SKILL.md": "## Claude Code\n\nRun `{{SCRIPTS_DIR}}/x.mts`, see [beta on Claude](../beta/SKILL.md#claude-code).\n",
    "alpha/extensions/codex/SKILL.md": "## Codex\n\nSee [beta on Codex](../beta/SKILL.md#codex).\n",
    "beta/SKILL.md": skill("beta"),
    "beta/extensions/claude/SKILL.md": "## Claude Code\n",
    "beta/extensions/codex/SKILL.md": "## Codex\n",
  });
  assert.deepEqual(await messages(dir), []);
});

test("every issue is reported with the harness whose build would carry it", async () => {
  const dir = await catalog({
    "alpha/SKILL.md": skill("other", "[gone](references/gone.md) [bad anchor](#nope) [peer](../beta/SKILL.md#missing) {{UNKNOWN_DIR}}\n"),
    "beta/SKILL.md": "# beta without frontmatter\n",
    "gamma/SKILL.md": skill("gamma", "", ""),
    "delta/SKILL.md": skill("delta"),
    "delta/references/notes.md": "Run {{SCRIPTS_DIR}}/x.mts and see [odd](%E0%A4%A).\n",
    "delta/extensions/codex/SKILL.md": "## Codex\n\n[only in codex](references/codex.md)\n",
    "epsilon/SKILL.md": skill("epsilon", "", "x".repeat(1025)),
  });
  assert.deepEqual((await messages(dir)).sort(), [
    'alpha/SKILL.md: frontmatter name "other" must match the folder "alpha" (claude)',
    "alpha/SKILL.md: broken anchor #nope (claude)",
    "alpha/SKILL.md: broken anchor ../beta/SKILL.md#missing (claude)",
    "alpha/SKILL.md: broken link references/gone.md (claude)",
    "alpha/SKILL.md: unknown placeholder {{UNKNOWN_DIR}} (claude)",
    "beta/SKILL.md: missing frontmatter (--- name, description ---) (claude)",
    "delta/SKILL.md: broken link references/codex.md (codex)",
    "delta/references/notes.md: malformed link %E0%A4%A (claude)",
    "delta/references/notes.md: placeholder {{SCRIPTS_DIR}} is filled only in SKILL.md (claude)",
    "epsilon/SKILL.md: description has 1025 characters; the limit is 1024 (claude)",
    "gamma/SKILL.md: frontmatter description is empty (claude)",
  ].sort());
  const lines: string[] = [];
  assert.equal(await main(["--skills", dir], (line) => lines.push(line)), 1);
  assert.equal(lines.length, 11);
});
