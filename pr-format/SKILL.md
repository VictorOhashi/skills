---
name: pr-format
description: Define titulo, descricao e evidencias de pull requests no GitHub. Use quando a entrega da tarefa chegar a abertura ou atualizacao do PR, ou em pedido so de titulo, corpo ou evidencias de um PR existente.
---

# Formato de PR

Titulo e corpo dizem o que muda e mostram a evidencia, prontos para publicar. Template de PR e idioma do repositorio prevalecem sobre esta skill.

## Titulo e corpo

- Titulo curto, ate 72 caracteres, pela convencao de commits do perfil. Use escopo quando fizer sentido e issue no fim quando houver.
- Escreva o corpo num arquivo no diretorio temporario da harness, seguindo [references/pr-body.md](references/pr-body.md): uma frase do que muda, evidencia antes do texto, risco so quando real e verificacoes recolhidas. Descreva o resultado final do diff, sem historico da conversa.
- Registre, no bloco recolhido, apenas verificacoes realmente executadas e aplicaveis ao head atual. Declare verificacoes impossiveis ou pendentes.
- Em stack, cite o PR anterior e a branch base na primeira linha. Sem issue associada, omita a linha de issue.

## Evidencias visuais

Ao preparar a publicacao de um PR com mudanca em UI renderizada, use `pr-prints` pelo mecanismo disponivel no harness. Ela define captura, a tabela Antes | Depois e o anexo de imagens reais, nunca commitadas. Para uma revisao apenas textual, preserve as evidencias existentes e sinalize lacunas.

## Publicacao

**Atencao:** publicar exige **Publicar** de `send` ou autorizacao explicita para a edicao.

1. Confirme repositorio, base e branch, e confira se ja existe PR antes de criar outro. Se a branch ainda precisar de push, ele segue **Publicar** de `send`.
2. Antes de editar, leia o corpo remoto atual e preserve evidencias publicadas e alteracoes relevantes de terceiros.
3. Crie com `gh pr create --repo <owner/repo> --base <base> --head <branch> --title "..." --body-file <arquivo>` ou edite com `gh pr edit <numero> --repo <owner/repo> --title "..." --body-file <arquivo>`. Use o caminho absoluto do arquivo e, em fork, `--head <owner>:<branch>`, com o head ja publicado, para evitar push ou fork implicito. Com prints, rode o comando no diretorio dos PNGs, com um `--attach <png>` por nova evidencia, conforme `pr-prints`.
4. Em falha parcial, verifique o PR existente antes de tentar novamente.

Relate URL, verificacoes e evidencias pendentes.
