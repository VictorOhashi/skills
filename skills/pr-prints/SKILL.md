---
name: pr-prints
description: Captura prints de alteracao visual e anexa a um pull request ou issue do GitHub com `gh --attach`, sem commitar imagem em repositorio. Use em pedido de prints ou ao preparar as evidencias de uma mudanca visual para publicacao.
---

# Prints em PR via `gh --attach`

Prints reais da mudanca visual, anexados ao PR ou a issue sem passar pelo repositorio.

**Proibido:** commitar imagem em qualquer repositorio (nada de `docs/prints`, branch `evidencia-*`, arquivo na raiz ou commit em outro repo) e inventar evidencia.

**Atencao:** anexar a PR ou issue publica; exige **Publicar** de `send` ou autorizacao explicita.

Antes de anexar, confira `gh --version` e o `--help` do subcomando pretendido para confirmar suporte a `--attach`. Sem suporte, relate a limitacao e deixe a evidencia pendente; nao atualize ferramentas automaticamente. Atualizacao do CLI depende de pedido do usuario.

## Quando

Sempre que o diff toca UI renderizada (componente, story, pagina, e-mail, template). A fonte e a interface renderizada, conforme Captura; nunca Figma nem descricao.

## Quantidade

Poucos prints, cada um cobrindo o maximo de mudancas visiveis: uma tela com tres features novas e um print, nao tres. Nao repita similares (mesma tela em variacoes sem diferenca visivel, mesmo componente em cada story). Tela que ja existia vai em par antes/depois; tela nova so com o depois. Celular e desktop entram so quando a mudanca difere entre eles. Regra pratica: se o revisor nao distingue o que um print mostra a mais que o anterior, ele sobra.

## Captura

- App real local primeiro; story so nos casos aceitos na secao Validacao de UI da skill `verification`, e o PR diz que o print veio de story. Playwright do proprio repositorio quando existir (`playwright screenshot --viewport-size=1440,900 <url> <arquivo>.png`); senao, o browser disponivel com captura salva em disco. Nao adicione dependencia so para o print.
- Arquivos na pasta de artefatos da execucao, nome `<tela>[-<estado>]-<largura>.png`, sufixo `-antes`/`-depois` so quando houver o par (`checkout-desktop-antes.png`). Sem PII real visivel: dados de teste ou mascare.

## Anexo

O anexo e o nativo do GitHub, via CLI:

1. Ao editar um PR, parta do corpo remoto atual. No arquivo do corpo, monte a tabela `| Antes | Depois |` com uma linha por tela e largura, e referencie cada novo PNG pelo caminho local, com a legenda como alt text: `| ![Checkout, desktop: antes](./checkout-desktop-antes.png) | ![Checkout, desktop: depois](./checkout-desktop-depois.png) |`.
2. Passe os mesmos arquivos em `--attach` (repetivel, ate 50), rodando o comando no diretorio dos PNGs:

   ```bash
   gh pr edit <n> --repo <owner/repo> --body-file <caminho absoluto do corpo> --attach ./checkout-desktop-antes.png --attach ./checkout-desktop-depois.png
   ```

   O `gh` sobe cada arquivo para `github.com/user-attachments/assets/...` e reescreve a referencia. Arquivo em `--attach` sem referencia no corpo e apenas apendado ao fim; referencia sem `--attach` fica quebrada. Mantenha os dois lados alinhados.
3. Saida diferente de zero com URL impressa pode indicar falha parcial de anexos.

   **Atencao:** nunca repita a criacao sem verificar o resultado.

   Leia o erro e confira o PR existente com `gh pr view <n> --repo <owner/repo> --json body --jq .body`. Para tentar novamente, parta do corpo remoto atualizado, preserve os anexos que deram certo e envie apenas os que faltam. Se a tentativa falhar novamente, relate a pendencia.
4. Confira o PR renderizado: cada imagem aparece na celula e com a legenda certa.
5. Cada novo head que muda a tela exige prints novos: substitua os quadros afetados, preservando os demais.

Se a captura ou o anexo nao for possivel, deixe no corpo um bullet visivel por print previsto (`Print pendente: <tela>-<estado>`) e relate a pendencia.
