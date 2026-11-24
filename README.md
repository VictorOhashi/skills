# Agent skills

Catalogo de Agent Skills (`skills/<skill>/SKILL.md`) para Claude Code e Codex.

As skills nao funcionam copiando a pasta como esta. Um build junta `SKILL.md` com a extension da harness alvo, descarta as outras extensions e os testes de `scripts/`, e instala a pasta `scripts/` compartilhada uma vez. Em `SKILL.md`, `{{SCRIPTS_DIR}}` vira o caminho absoluto dessa pasta instalada.

## Catalogo

| Skill | O que faz |
| --- | --- |
| [`arena`](skills/arena/SKILL.md) | Disputa entre candidatos independentes para produzir o mesmo artefato. |
| [`ban-bad-pattern`](skills/ban-bad-pattern/SKILL.md) | Aponta e corrige desvios de convencao, ferramenta e padrao de desenho, e convencoes que custam mais do que entregam. |
| [`ban-bad-ui`](skills/ban-bad-ui/SKILL.md) | Aponta e corrige desvios da UI e falhas do design system. |
| [`ban-comments`](skills/ban-comments/SKILL.md) | Remove comentarios e documentacao que nao se justificam. |
| [`ban-legacy`](skills/ban-legacy/SKILL.md) | Aponta e retira codigo legado, migrando chamadores. |
| [`ban-tests`](skills/ban-tests/SKILL.md) | Aponta e retira testes que nao protegem uma regra do produto. |
| [`correct-repo`](skills/correct-repo/SKILL.md) | Corrige a causa de erros que agentes repetem no repositorio. |
| [`council`](skills/council/SKILL.md) | Conselho de revisores que da nota por rubrica ate a nota alvo. |
| [`full-send`](skills/full-send/SKILL.md) | Leva a tarefa ate o PR mergeado. |
| [`github-issue-read`](skills/github-issue-read/SKILL.md) | Le issue ou PR do GitHub inteiro para uma pasta local. |
| [`implementation`](skills/implementation/SKILL.md) | Causa raiz, tipagem forte, migracao de legado e comentarios uteis. |
| [`mockup`](skills/mockup/SKILL.md) | Mockups fieis ao app e ao design system. |
| [`planning`](skills/planning/SKILL.md) | Analise e plano com causa raiz, contratos e escopo controlado. |
| [`pr-format`](skills/pr-format/SKILL.md) | Titulo, descricao e evidencias de pull requests. |
| [`pr-prints`](skills/pr-prints/SKILL.md) | Prints de mudanca visual anexados a PR ou issue. |
| [`principle-ui-design`](skills/principle-ui-design/SKILL.md) | Principios de design de interface para desenhar e revisar telas: hierarquia, estados, texto, interacao, motion. |
| [`send`](skills/send/SKILL.md) | Leva a tarefa ate o PR pronto para merge. |
| [`skill-retro`](skills/skill-retro/SKILL.md) | Revisa as skills pelo uso real e propoe mudancas comprovadas por eval. |
| [`validation-loop`](skills/validation-loop/SKILL.md) | Revisao final com revisor independente, em ate 3 rodadas. |
| [`verification`](skills/verification/SKILL.md) | Menor verificacao suficiente antes de afirmar que funciona. |
| [`visual-plan`](skills/visual-plan/SKILL.md) | Planos, diagnosticos e status como diagramas e tabelas. |
| [`writing-guide`](skills/writing-guide/SKILL.md) | Regras de redacao para texto executado ao pe da letra. |

## Estrutura

```text
scripts/                         # scripts compartilhados entre skills; testes em *.test.mts
docs/                            # regras do repositorio e documentacao dos scripts
skills/<skill>/
  SKILL.md                       # nucleo, vale em qualquer harness
  references/                    # opcional
  scripts/                       # opcional; testes em scripts/*.test.mts
  extensions/
    claude/SKILL.md              # anexado ao SKILL.md no Claude Code
    claude/agents/<name>.md      # subagente do Claude Code
    codex/SKILL.md               # anexado no Codex
    codex/agents/<name>.toml     # subagente do Codex
```

- Regras de redacao deste repositorio: [docs/writing-guide.md](docs/writing-guide.md), que completa a skill [`writing-guide`](skills/writing-guide/SKILL.md).
- Scripts compartilhados e de skills: [docs/scripts.md](docs/scripts.md).

## Desenvolvimento

```bash
pnpm install
pnpm test
pnpm typecheck
```

O CI roda `pnpm test` e `pnpm typecheck` em todo PR.
