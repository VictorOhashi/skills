# Agent skills

Catalogo de Agent Skills (`<skill>/SKILL.md`) para Claude Code e Codex.

## Estrutura

```text
<skill>/
  SKILL.md                     # nucleo, vale em qualquer harness
  references/                  # opcional
  scripts/                     # opcional; testes em scripts/*.test.mts
  extensions/
    claude/SKILL.md            # anexado ao SKILL.md no Claude Code
    claude/agents/<name>.md    # subagente do Claude Code
    codex/SKILL.md             # anexado no Codex
    codex/agents/<name>.toml   # subagente do Codex
```

As skills nao funcionam copiando a pasta como esta. Um build junta `SKILL.md` com a extension da harness alvo, descarta as outras extensions e os testes de `scripts/`. As extensions do Codex chamam `agents review` e `agents status`, comandos do CLI de perfis que faz esse build.

## Desenvolvimento

```bash
pnpm install
pnpm test
pnpm typecheck
```

Regras de redacao: skill [`writing-guide`](writing-guide/SKILL.md).
