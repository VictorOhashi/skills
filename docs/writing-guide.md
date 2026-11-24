# Guia de redacao deste repositorio

Regras de `SKILL.md`, `references/` e agentes que so valem neste repositorio. Elas completam a skill [`writing-guide`](../skills/writing-guide/SKILL.md) e a referencia [agent-instructions.md](../skills/writing-guide/references/agent-instructions.md). Siga a skill, a referencia e este guia.

## Pastas da skill

- O build preserva os nomes e o conteudo de `references/` e `scripts/`, exceto os `*.test.mts` de `scripts/`.
- Script usado por mais de uma skill fica em `scripts/`, instalado uma vez por harness; a skill o chama por `{{SCRIPTS_DIR}}/<script>.mts`. As ferramentas do catalogo (`lint.mts`, `trigger-eval.mts`) tambem ficam em `scripts/`, mas rodam so no checkout. Script de uma skill so fica em `skills/<skill>/scripts/`.
- Script de `scripts/` e TypeScript sem dependencia, rodando direto com `node` (22.18+). O typecheck do repo cobre a pasta e os testes ficam ao lado do script, em `scripts/*.test.mts`, e nao entram no build.
- Use a extensao `.mts`: a pasta compilada nao tem `package.json`. Se o script exporta funcoes para teste, compare `realpathSync(process.argv[1])` com `import.meta.filename` antes de rodar o `main`, porque a harness acessa a skill por symlink.
- Cada skill fica em `skills/<nome>/`. Na raiz ficam so `scripts/` (compartilhados), `docs/`, `evals/` (casos do eval de acionamento) e os arquivos do repositorio.

## Harness

Neste repositorio, o texto comum e o nucleo (`SKILL.md`). O texto de uma harness fica em `extensions/<harness>/`, ao lado do arquivo que usa a regra.

- Vai para a extension: nome de ferramenta, agente ou subagente, modelo e esforco, delegacao em background, recurso visual, sintaxe de comando (`/nome`).
- `extensions/<harness>/SKILL.md` comeca com `## <Nome da harness>` e e anexado ao fim do nucleo no build.
- Agentes ficam em `extensions/<harness>/agents/`, no formato da harness: `.md` no Claude Code, `.toml` no Codex. O descritor Codex `agents/openai.yaml` permanece dentro da skill compilada.
- Agente Codex executado por `codex-review.mts` tem nome `<nome>-reviewer`.

## Nomes e build

- Em `SKILL.md`, `{{SCRIPTS_DIR}}` vira o caminho absoluto da pasta de scripts compartilhados do build.
- Ao renomear uma skill, acrescente o nome antigo a `RENAMED` em `scripts/usage.mts`, para o relatorio de uso manter um so historico.

## Termos fixos

Termos deste repositorio, com os sinonimos que nao se usam:

| Termo | Nao use |
| --- | --- |
| `head` | commit atual, ponta |
| `base` | main, destino |
| `check` | job, status do CI |
| verificacao | check local |
| `thread` | conversa, discussao |
| autorizacao explicita | autorizacao clara, instrucao explicita, pedido explicito para a acao |

**Nota:** `check` e o check de CI do PR; teste ou lint rodado localmente e verificacao.

**Nota:** "autorizacao explicita" e definida nas instrucoes persistentes de cada perfil, que o modelo le em toda sessao.

## Estados e permissoes

Donos dos estados e das permissoes deste repositorio, pela secao Estados e permissoes da referencia:

| Estado ou permissao | Dono | Sentido |
| --- | --- | --- |
| **Corrigir localmente**, **Publicar** | `send` | Permissoes concedidas pelo modo do perfil ou por autorizacao explicita. |
| **Pronto para merge**, **Aguardando**, **Bloqueado ou limite atingido**, **Fechado ou mergeado** | `send` | Saida do PR. |
| **Aprovado**, **Escalado** | `review-loop` | Saida da revisao. |
| feito, em andamento, aguardando, bloqueado, pendente | `visual-plan` | Status do quadro; mapeia os estados acima. |

## Citacao entre skills

A descricao da skill define quando usa-la. Skills seguem a regra de dependencia direta de `agent-instructions.md`. Os perfis definem permissoes e preferencias do ambiente. Cada repositorio define seus comandos, infraestrutura e condicoes locais de entrega.

## Excecoes

- As skills `ban-*` trazem os proprios criterios, mesmo quando repetem parte das referencias de `implementation` ou das regras de `verification`, para que o revisor receba um texto completo.
