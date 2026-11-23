# Agent skills

Catalogo de Agent Skills (`<skill>/SKILL.md`) para Claude Code e Codex.

As skills nao funcionam copiando a pasta como esta. Um build junta `SKILL.md` com a extension da harness alvo, descarta as outras extensions e os testes de `scripts/`, e instala a pasta `scripts/` compartilhada uma vez. Em `SKILL.md`, `{{SCRIPTS_DIR}}` vira o caminho absoluto dessa pasta instalada.

## Catalogo

| Skill | O que faz |
| --- | --- |
| [`arena`](arena/SKILL.md) | Disputa entre candidatos independentes para produzir o mesmo artefato. |
| [`ban-bad-pattern`](ban-bad-pattern/SKILL.md) | Aponta e corrige desvios de convencao, ferramenta e padrao de desenho. |
| [`ban-comments`](ban-comments/SKILL.md) | Remove comentarios e documentacao que nao se justificam. |
| [`ban-legacy`](ban-legacy/SKILL.md) | Aponta e retira codigo legado, migrando chamadores. |
| [`ban-tests`](ban-tests/SKILL.md) | Aponta e retira testes que nao protegem uma regra do produto. |
| [`correct-repo`](correct-repo/SKILL.md) | Corrige a causa de erros que agentes repetem no repositorio. |
| [`council`](council/SKILL.md) | Conselho de revisores que da nota por rubrica ate a nota alvo. |
| [`design-guide`](design-guide/SKILL.md) | Detalhes de design de interface: hierarquia, tipografia, estados, motion. |
| [`full-send`](full-send/SKILL.md) | Leva a tarefa ate o PR mergeado. |
| [`github-issue-read`](github-issue-read/SKILL.md) | Le issue ou PR do GitHub inteiro para uma pasta local. |
| [`implementation`](implementation/SKILL.md) | Causa raiz, tipagem forte, migracao de legado e comentarios uteis. |
| [`mockup`](mockup/SKILL.md) | Mockups fieis ao app e ao design system. |
| [`planning`](planning/SKILL.md) | Analise e plano com causa raiz, contratos e escopo controlado. |
| [`pr-format`](pr-format/SKILL.md) | Titulo, descricao e evidencias de pull requests. |
| [`pr-prints`](pr-prints/SKILL.md) | Prints de mudanca visual anexados a PR ou issue. |
| [`send`](send/SKILL.md) | Leva a tarefa ate o PR pronto para merge. |
| [`validation-loop`](validation-loop/SKILL.md) | Revisao final com revisor independente, em ate 3 rodadas. |
| [`verification`](verification/SKILL.md) | Menor verificacao suficiente antes de afirmar que funciona. |
| [`visual-plan`](visual-plan/SKILL.md) | Planos, diagnosticos e status como diagramas e tabelas. |
| [`writing-guide`](writing-guide/SKILL.md) | Regras de redacao para texto executado ao pe da letra. |

## Estrutura

```text
scripts/                       # scripts compartilhados entre skills; testes em *.test.mts
docs/                          # regras do repositorio e documentacao dos scripts
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

- Regras de redacao deste repositorio: [docs/writing-guide.md](docs/writing-guide.md), que completa a skill [`writing-guide`](writing-guide/SKILL.md).
- Scripts compartilhados e de skills: [docs/scripts.md](docs/scripts.md).

## Desenvolvimento

```bash
pnpm install
pnpm test
pnpm typecheck
```

O CI roda `pnpm test` e `pnpm typecheck` em todo PR.
