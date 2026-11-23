# Agent skills

Catalogo de Agent Skills (`<skill>/SKILL.md`) para Claude Code e Codex.

## Estrutura

```text
scripts/                       # scripts compartilhados entre skills; testes em *.test.mts
  artifacts.mts                # cria e limpa pastas de artefatos (new, clean, status)
  codex-review.mts             # executa um revisor em sessao Codex isolada e somente leitura
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

As skills nao funcionam copiando a pasta como esta. Um build junta `SKILL.md` com a extension da harness alvo, descarta as outras extensions e os testes de `scripts/`, e instala a pasta `scripts/` compartilhada uma vez. Em `SKILL.md`, `{{SCRIPTS_DIR}}` vira o caminho absoluto dessa pasta instalada.

## Revisores isolados no Codex (`codex-review.mts`)

Os revisores de `validation-loop` e `council` rodam por `codex-review.mts` em sessoes independentes do Codex CLI. Cada processo recebe `read-only` e aprovacao `never`, sem historico da implementacao. A sessao principal continua com escrita. Subagentes nativos nao sao usados nessa rota, pois herdariam as permissoes da sessao principal.

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

## Desenvolvimento

```bash
pnpm install
pnpm test
pnpm typecheck
```

Regras de redacao: skill [`writing-guide`](writing-guide/SKILL.md).
