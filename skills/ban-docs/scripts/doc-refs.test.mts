import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { anchors, checkFile, citationsOf, main, repoLinks, repoRunnables, scriptOf } from "./doc-refs.mts";

async function repo(files: Record<string, string>): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), "doc-refs-"));
  for (const [rel, text] of Object.entries(files)) {
    await mkdir(path.dirname(path.join(root, rel)), { recursive: true });
    await writeFile(path.join(root, rel), text);
  }
  execFileSync("git", ["init", "-q", root]);
  return root;
}

test("scriptOf names the script a command runs and skips built-ins and other packages", () => {
  assert.deepEqual(scriptOf("pnpm agents sync work"), { name: "agents", shorthand: true });
  assert.deepEqual(scriptOf("pnpm run build"), { name: "build", shorthand: false });
  assert.deepEqual(scriptOf("npm run lint -- --fix"), { name: "lint", shorthand: false });
  assert.deepEqual(scriptOf("npm test"), { name: "test", shorthand: false });
  assert.deepEqual(scriptOf("pnpm test"), { name: "test", shorthand: false });
  assert.deepEqual(scriptOf("yarn dev"), { name: "dev", shorthand: true });
  assert.deepEqual(scriptOf("bun run check"), { name: "check", shorthand: true });
  assert.deepEqual(scriptOf("yarn run eslint"), { name: "eslint", shorthand: true });
  assert.equal(scriptOf("pnpm whoami"), undefined);
  assert.equal(scriptOf("pnpm install"), undefined);
  assert.equal(scriptOf("npm install"), undefined);
  assert.equal(scriptOf("bun test"), undefined);
  assert.equal(scriptOf("pnpm --filter web build"), undefined);
  assert.equal(scriptOf("pnpm -C apps/web dev"), undefined);
  assert.equal(scriptOf("pnpm <script>"), undefined);
});

test("anchors ignores headings inside fences and numbers repeats", () => {
  assert.deepEqual([...anchors("# Uso\n```md\n# Fora\n```\n## Passo `um`\n## Uso\n")], ["uso", "passo-um", "uso-1"]);
});

test("checkFile reports broken links, anchors, paths and scripts with their lines", async () => {
  const root = await repo({
    "package.json": JSON.stringify({ scripts: { test: "node --test", agents: "node src/cli.ts" } }),
    "node_modules/.bin/vitest": "",
    "src/cli.ts": "",
    "docs/guide.md": "# Guia\n## Build\n",
    "AGENTS.md": [
      "Leia [o guia](docs/guide.md#build) e [nada](docs/missing.md).", // 1: missing link
      "Veja [ancora](docs/guide.md#deploy) e [local](#topo).", // 2: two broken anchors
      "Rode `pnpm agents sync` e `pnpm lint`.", // 3: lint missing
      "Codigo em `src/cli.ts` e `src/old.ts`.", // 4: old.ts missing
      "Repo `acme/app`, pacote `@types/node`, `src/.../x.ts` e `./tools/x.sh`.", // 5: only ./tools/x.sh
      "```bash",
      "$ pnpm test",
      "pnpm typecheck",
      "```",
      "```ts",
      "pnpm nope",
      "```",
    ].join("\n"),
  });
  const findings = (await checkFile(root, "AGENTS.md", await repoRunnables(root))).map((f) => `${f.line} ${f.kind} ${f.target}`);
  assert.deepEqual(findings, [
    "1 link docs/missing.md",
    "2 anchor docs/guide.md#deploy",
    "2 anchor #topo",
    "3 script pnpm lint",
    "4 path src/old.ts",
    "5 path ./tools/x.sh",
    "8 script pnpm typecheck",
  ]);
});

test("checkFile accepts a script of any package and an installed binary for the shorthand form", async () => {
  const root = await repo({
    "package.json": JSON.stringify({ scripts: { lint: "x" }, devDependencies: { prisma: "1" } }),
    "node_modules/.bin/tsc": "",
    "apps/web/package.json": JSON.stringify({ scripts: { dev: "x" } }),
    "README.md": "Em `apps/web`, rode `pnpm dev`, `pnpm lint`, `pnpm tsc`, `pnpm prisma migrate`, `pnpm run tsc` e `pnpm build`.\n",
  });
  assert.deepEqual((await checkFile(root, "README.md", await repoRunnables(root))).map((f) => f.target), ["pnpm run tsc", "pnpm build"]);
});

test("checkFile leaves the shorthand form unknown without installed binaries, and scripts without a manifest", async () => {
  const root = await repo({
    "package.json": JSON.stringify({ scripts: { lint: "x" } }),
    "README.md": "Rode `pnpm tsc` e `pnpm run tsc`.\n",
  });
  assert.deepEqual((await checkFile(root, "README.md", await repoRunnables(root))).map((f) => f.target), ["pnpm run tsc"]);
  const bare = await repo({ "README.md": "Rode `pnpm dev`.\n" });
  assert.equal(await repoRunnables(bare), undefined);
  assert.deepEqual(await checkFile(bare, "README.md", undefined), []);
});

test("checkFile resolves cited paths from every folder between the file and the root", async () => {
  const root = await repo({
    "src/main.ts": "",
    "packages/x/src/index.ts": "",
    "packages/x/docs/guide.md": "Veja `src/index.ts` e `src/gone.ts`.\n",
  });
  assert.deepEqual((await checkFile(root, "packages/x/docs/guide.md")).map((f) => f.target), ["src/gone.ts"]);
});

test("main skips a Markdown file deleted in the working tree", async () => {
  const root = await repo({ "a.md": "[b](b.md)\n", "b.md": "# B\n" });
  execFileSync("git", ["-C", root, "add", "."]);
  await rm(path.join(root, "a.md"));
  const out: string[] = [];
  assert.equal(await main([root], (line) => out.push(line)), 0);
  assert.deepEqual(out, ["doc-refs: ok (1 file(s))"]);
});

test("citationsOf finds lines naming the file or its symlink, outside both", async () => {
  const root = await repo({
    "AGENTS.md": "# Rules\nSee AGENTS.md.\n",
    "src/a.ts": "// Every LLM call goes through llm (CLAUDE.md).\n",
    "src/b.ts": "// root AGENTS.md logging rule\n",
    "src/c.ts": "// nothing here\n",
  });
  await symlink("AGENTS.md", path.join(root, "CLAUDE.md"));
  execFileSync("git", ["-C", root, "add", "."]);
  await writeFile(path.join(root, "src/new.ts"), "// new file cites CLAUDE.md\n");
  const links = await repoLinks(root);
  const byTarget = await citationsOf(root, "AGENTS.md", links);
  assert.deepEqual(byTarget.aliases, ["CLAUDE.md"]);
  assert.deepEqual(byTarget.citations.map((c) => `${c.file}:${c.line}`), ["src/a.ts:1", "src/b.ts:1", "src/new.ts:1"]);
  const byLink = await citationsOf(root, "CLAUDE.md", links);
  assert.deepEqual(byLink.aliases, ["AGENTS.md"]);
  assert.deepEqual(byLink.citations.map((c) => `${c.file}:${c.line}`), ["src/a.ts:1", "src/b.ts:1", "src/new.ts:1"]);
  const out: string[] = [];
  assert.equal(await main([root, "--cited-by", "--", "AGENTS.md"], (line) => out.push(line)), 0);
  assert.deepEqual(out.slice(0, 2), ["AGENTS.md aliases: CLAUDE.md", "AGENTS.md <- src/a.ts:1: // Every LLM call goes through llm (CLAUDE.md)."]);
  assert.equal(out.at(-1), "doc-refs: 3 citation(s) of 1 file(s)");
});

test("citationsOf keeps the nearby non-empty lines of the citing file", async () => {
  const root = await repo({
    "AGENTS.md": "# Rules\n",
    "src/a.ts": "// header\n\n// duplicated against the reuse rule of\n// AGENTS.md, see review.\n// next line\n// far\n",
  });
  execFileSync("git", ["-C", root, "add", "."]);
  const { citations } = await citationsOf(root, "AGENTS.md", await repoLinks(root));
  assert.deepEqual(citations[0]?.context, [
    { line: 3, text: "// duplicated against the reuse rule of" },
    { line: 5, text: "// next line" },
  ]);
  const out: string[] = [];
  await main([root, "--cited-by", "--", "AGENTS.md"], (line) => out.push(line));
  assert.deepEqual(out.slice(0, 3), ["AGENTS.md <- src/a.ts:4: // AGENTS.md, see review.", "    3: // duplicated against the reuse rule of", "    5: // next line"]);
});

test("citationsOf reads non-ASCII file names and excludes bracketed paths literally", async () => {
  const root = await repo({
    "d/[id].md": "# Page\n",
    "d/i.md": "See [id].md.\n",
    "café.md": "See [id].md too.\n",
  });
  execFileSync("git", ["-C", root, "add", "."]);
  const { citations } = await citationsOf(root, "d/[id].md", await repoLinks(root));
  assert.deepEqual(citations.map((c) => `${c.file}:${c.line}`), ["café.md:1", "d/i.md:1"]);
  await writeFile(path.join(root, "new\nline.md"), "x\nSee [id].md here.\n");
  const withNewline = await citationsOf(root, "d/[id].md", await repoLinks(root));
  const hit = withNewline.citations.find((c) => c.file === "new\nline.md");
  assert.deepEqual(hit && { line: hit.line, text: hit.text, context: hit.context }, { line: 2, text: "See [id].md here.", context: [{ line: 1, text: "x" }] });
});
