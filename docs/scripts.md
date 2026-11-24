# Scripts

Regras de onde fica cada script e como escreve-lo: "Pastas da skill" em [writing-guide.md](writing-guide.md#pastas-da-skill).

| Script | Pasta | Uso |
| --- | --- | --- |
| `artifacts.mts` | `scripts/` | Cria, limpa e resume pastas de artefatos. |
| `codex-review.mts` | `scripts/` | Executa um revisor em sessao Codex isolada e somente leitura. |
| `lint.mts` | `scripts/` | Valida as skills como o build as compila, por harness. |
| `trigger-eval.mts` | `scripts/` | Mede qual skill cada prompt de `evals/triggers.json` carrega. |
| `usage.mts` | `scripts/` | Le os transcripts do Claude Code e relata uso por skill e sinais por repositorio. |
| `pr-state.mts` | `skills/send/scripts/` | Le o estado de um PR para o acompanhamento de `send`. |
| `review-scope.mts` | `skills/validation-loop/scripts/` | Fixa base, escopo e nivel da revisao. |
| `github-issue-read.mts` | `skills/github-issue-read/scripts/` | Grava issue ou PR do GitHub numa pasta local. |

## Revisores isolados no Codex (`codex-review.mts`)

Papel revisor e todo agente Codex com nome `<nome>-reviewer`; o executor recusa os demais, como `pr-observer` e `arena-candidate`.

Os revisores das skills (`validation-loop`, `council`, `ban-*` e o juiz de `arena`) rodam por `codex-review.mts` em sessoes independentes do Codex CLI. Cada processo recebe `read-only` e aprovacao `never`, sem historico da implementacao. A sessao principal continua com escrita. Subagentes nativos nao sao usados nessa rota, pois herdariam as permissoes da sessao principal.

O executor le o modelo, o papel e o esforco padrao do TOML compilado do papel, em `../agents/<papel>.toml` ao lado da pasta de scripts instalada. Antes de iniciar, comprova a negacao de escrita pelo sandbox em arquivo temporario. Inicia o Codex numa pasta neutra, com `--ignore-user-config`, sem apps, plugins, memoria ou delegacao; configuracoes pessoais e do projeto nao injetam MCP ou permissoes mais amplas. A autenticacao continua pelo mecanismo normal do Codex, sem copiar credenciais. O briefing deve incluir as instrucoes aplicaveis ao repositorio revisado.

```bash
node {{SCRIPTS_DIR}}/codex-review.mts validation-reviewer <pasta da rodada> --repo <repositorio revisado> [--effort medium] < <briefing.txt>
node {{SCRIPTS_DIR}}/codex-review.mts validation-reviewer <nova pasta da rodada> <pasta anterior> --repo <repositorio revisado> < <delta.txt>
```

A pasta da rodada fica dentro dos artefatos (`$HOME/.agents/artifacts`), fora do repositorio. Seu pai deve existir e ser validado pelo caminho canonico antes de qualquer criacao. O esforco vem do TOML do papel; `validation-reviewer` aceita so `--effort medium` como alternativa, e a retomada repete o mesmo valor. O executor salva `runtime.json` (modelo, esforco, sandbox, aprovacao, teste de escrita e ID da sessao) e `review.md` (parecer). Saida sem esses dados confirmados, sem parecer ou com erro nao aprova a revisao. A retomada exige o registro verificado de uma rodada irma, do mesmo papel e repositorio; o ID retornado precisa coincidir. Os arquivos de saida sao criados exclusivamente, sem seguir symlinks nem substituir pareceres existentes. Metadados sao aceitos apenas do cabecalho inicial do Codex, nunca do briefing ou de saidas de ferramentas. Nao use `--last` nem retome a sessao da implementacao. Para `council`, use `council-reviewer` e mantenha IDs separados para o avaliador inicial, A e B.

Referencias oficiais: [subagentes](https://learn.chatgpt.com/docs/agent-configuration/subagents), [registros de agentes](https://learn.chatgpt.com/docs/config-file/config-reference), [caminho das skills](https://learn.chatgpt.com/docs/build-skills).

## Artefatos (`artifacts.mts`)

`<skill>` e o nome compilado (`council`, `verification`), e so pastas exatamente no segundo nivel contam como run. `new` cria o run com o nome do repositorio principal (igual em todas as worktrees), acrescenta `-2`, `-3`... se o nome ja existir e grava o `manifest.json` sem sobrescrever. `clean` usa o `createdAt` do `manifest.json` (ou a data da pasta); `--skill` filtra pela pasta, `--repo` e `--branch` pelo manifest. Ele so lista sem `--yes`, ignora symlinks e apaga as pastas que ficarem vazias. `status` resume quantidade e tamanho dos runs. A regra de uso para as sessoes vem das instrucoes do perfil.

```bash
node {{SCRIPTS_DIR}}/artifacts.mts new pr-prints wallet --repo <caminho absoluto do checkout>   # imprime o caminho do run
node {{SCRIPTS_DIR}}/artifacts.mts clean --older-than 7d --skill council --repo my-app --yes
node {{SCRIPTS_DIR}}/artifacts.mts status
```

## Lint do catalogo (`lint.mts`)

Valida cada skill como o build do checkout de perfis a compila para cada harness (`SKILL.md` do nucleo mais `extensions/<harness>/SKILL.md`): `name` igual a pasta, no formato de minusculas com hifen e ate 64 caracteres; `description` com ate 1024 caracteres; links e ancoras relativos que resolvem na skill compilada ou numa skill irma; e placeholders conhecidos (`{{ARTIFACTS_DIR}}`, `{{SCRIPTS_DIR}}`), so no `SKILL.md`. Links dentro de codigo nao contam. Um teste roda o lint sobre o catalogo, entao `pnpm test` e o CI barram skill invalida.

```bash
node scripts/lint.mts            # sai com codigo 1 e lista os problemas
```

## Eval de acionamento (`trigger-eval.mts`)

Roda cada caso de `evals/triggers.json` num `claude -p` isolado: projeto temporario so com as skills do catalogo (nucleo mais extensao do Claude Code) e o `CLAUDE.md` instalado, `--setting-sources project`, apenas a ferramenta `Skill`, um turno e sem gravar sessao. Um caso passa quando a primeira skill do catalogo carregada e `expect` ou uma de `accept`; `expect: null` exige que nenhuma carregue. Skills com `disable-model-invocation` ficam fora dos casos. Os casos usam prompts sinteticos, sem conteudo de trabalho.

Roda a partir do checkout do catalogo, porque mede a arvore de trabalho e le `evals/`, que o build nao instala. O eval completo sem erros e salvo em `~/.agents/usage/trigger-evals/` e comparado com o anterior do mesmo modelo; com caso em erro, nao salva e sai com codigo 1. `--skill` roda so os casos daquela skill, sem salvar. Cada caso e uma chamada ao modelo (padrao da conta ou `--model`).

```bash
node scripts/trigger-eval.mts --dry-run
node scripts/trigger-eval.mts --skill send --model sonnet
```

## Uso das skills e sinais por repositorio (`usage.mts`)

Le os transcripts do Claude Code (`~/.claude/projects`) que mudaram desde a ultima leitura e guarda em `~/.agents/usage/usage.json`, que sobrevive a limpeza dos transcripts. So metadados e ponteiros (transcript e registro) ficam ali, nunca o texto de prompts ou comandos. Transcripts do Codex ainda nao sao lidos.

- `skills`: cada execucao cobre o turno em que a skill carregou, ate a proxima mensagem do usuario. Colunas: `user` (aberta por comando), `vers` (versoes do texto carregado), `turn s` e `turn out` (medianas de duracao e tokens de saida), `tool err` (erros por chamada), `interr` (turnos interrompidos) e `correct` (proxima mensagem parece correcao, por heuristica de texto). `--skill` compara versoes e lista transcripts recentes.
- `repos`: por repositorio (pasta do checkout principal, sem worktree), mensagens, correcoes, interrupcoes, achados de revisor (`R<n> [severidade] <caminho>`, contados uma vez por linha) e comandos que falharam. `--repo` agrupa os achados `blocker` e `should` por area e os comandos por tipo e estrutura (programa e subcomando, sem argumentos), e lista as correcoes, os achados e as falhas recentes com o transcript de cada uma. O repositorio de uma sessao e o do primeiro diretorio dela. Leituras que so falham por falta de resultado (`grep`, `rg`, `git log`) viram `probe` e ficam fora da tabela; leitura de caminho inexistente vira `missing-path`. Briefings de subagente nao contam como mensagem do usuario.

```bash
node {{SCRIPTS_DIR}}/usage.mts skills --since 30d
node {{SCRIPTS_DIR}}/usage.mts skills --skill send --json
node {{SCRIPTS_DIR}}/usage.mts repos --repo my-app
```
