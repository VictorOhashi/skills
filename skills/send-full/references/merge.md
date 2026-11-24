# Merge no GitHub

Comandos `gh` da etapa 3 de `send-full`. Fixe o repositorio com `--repo <owner/repo>` em todo comando. Se a harness oferecer outra ferramenta de GitHub, a regra e a mesma; so muda o comando. Leitura de estado e checks seguem a referencia de GitHub de `send`.

- PR isolado: `gh pr merge <n> --repo <owner/repo> --<metodo> --match-head-commit <sha>`, com o metodo do repositorio.
- PR em pilha: o merge sincrono e recusado. Use `PUT repos/<owner>/<repo>/pulls/<n>/merge-async` com `sha`, `merge_method` e `merge_action=direct_merge`, e acompanhe o UUID devolvido em `GET .../merge-async/<uuid>` ate `merged` ou `failed`; `enqueued` e fila, tratada como no passo 4 ([docs](https://docs.github.com/rest/pulls/pulls#merge-a-pull-request-asynchronously)). Com a extensao `gh stack` instalada, confira `gh stack --help` antes de usa-la.
- Depois do merge do PR de baixo, a plataforma pode reescrever o head do PR de cima. Aceite o head novo so se `git diff <head verificado> <head novo>` sair vazio; senao, revalide antes de mergear.
- Confirme `state: MERGED` e o commit de merge com `gh pr view`. Comando aceito ou entrada em fila nao comprovam merge.
