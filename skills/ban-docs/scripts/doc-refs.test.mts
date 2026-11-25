import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { anchors, checkFile, main, repoRunnables, scriptOf } from "./doc-refs.mts";

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
