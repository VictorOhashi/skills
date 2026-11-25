import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { anchors, checkFile, repoScripts, scriptOf } from "./doc-refs.mts";

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
  assert.equal(scriptOf("pnpm agents sync work"), "agents");
  assert.equal(scriptOf("pnpm run build"), "build");
  assert.equal(scriptOf("npm run lint -- --fix"), "lint");
  assert.equal(scriptOf("npm test"), "test");
  assert.equal(scriptOf("yarn dev"), "dev");
  assert.equal(scriptOf("bun run check"), "check");
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
  const findings = (await checkFile(root, "AGENTS.md", await repoScripts(root))).map((f) => `${f.line} ${f.kind} ${f.target}`);
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

test("checkFile accepts a script of any package in the repository and skips scripts without a manifest", async () => {
  const root = await repo({
    "package.json": JSON.stringify({ scripts: { lint: "x" } }),
    "apps/web/package.json": JSON.stringify({ scripts: { dev: "x" } }),
    "README.md": "Em `apps/web`, rode `pnpm dev`, `pnpm lint` e `pnpm build`.\n",
  });
  assert.deepEqual((await checkFile(root, "README.md", await repoScripts(root))).map((f) => f.target), ["pnpm build"]);
  const bare = await repo({ "README.md": "Rode `pnpm dev`.\n" });
  assert.equal(await repoScripts(bare), undefined);
  assert.deepEqual(await checkFile(bare, "README.md", undefined), []);
});
