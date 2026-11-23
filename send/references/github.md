# GitHub

Comandos `gh` para `send`. Fixe o repositorio com `--repo <owner/repo>` em todo comando. Se a harness oferecer outra ferramenta de GitHub, a regra e a mesma; so muda o comando.

## Leitura

O estado completo vem do script de [watch.md](watch.md). Use os comandos abaixo para conferir um ponto ou quando o script falhar.

| O que | Comando |
| --- | --- |
| Estado do PR | `gh pr view <n> --repo <owner/repo> --json state,isDraft,headRefOid,headRefName,headRepository,headRepositoryOwner,baseRefName,mergeable,mergeStateStatus,reviewDecision,statusCheckRollup` |
| Checks | `gh pr checks <n> --repo <owner/repo>` |
| Threads de review | `gh api graphql` em `reviewThreads`, paginando threads e comentarios; campos `id`, `isResolved`, `isOutdated`, autor e conteudo |
| Reviews por head | `gh api graphql` em `reviews`; campos `state`, `authorCanPushToRepository` (acesso de escrita), `author.__typename` e `commit.oid` |
| Log de falha | `gh api --allow-escape-sequences repos/<owner>/<repo>/actions/jobs/<id do job>/logs` (GitHub Actions; disponivel quando o job termina, mesmo com a execucao em andamento; checks externos usam o provedor deles) |
| Corpo atual | `gh pr view <n> --repo <owner/repo> --json body --jq .body` |

**Nota:** `mergeable: MERGEABLE` sozinho nao comprova **Pronto para merge**. A lista REST de comentarios de diff nao mostra todas as threads.

## Escrita

- Abrir ou editar o PR: siga `pr-format` (`gh pr create` / `gh pr edit` com `--body-file`).
- Abrir como draft: `gh pr create ... --draft`. Voltar PR aberto a draft: `gh pr ready <n> --repo <owner/repo> --undo`. Tirar de draft: `gh pr ready <n> --repo <owner/repo>`.
- Rerun de falha: `gh run rerun <id> --repo <owner/repo> --failed`.
