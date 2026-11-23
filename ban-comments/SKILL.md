---
name: ban-comments
description: Revisao independente de comentarios e documentacao em um diff ou conjunto de arquivos. Use quando o pedido for auditar texto redundante e preservar informacao necessaria ao leitor.
---

# Comentarios e documentacao

Execute `audit` com os criterios abaixo e o revisor da secao da harness.

## Criterios do parecer

Entregue ao revisor o texto de "Comentarios e documentacao" de `implementation` e peca que confira:

- Identifique a pergunta que cada trecho responde. Marque narracao da implementacao, codigo comentado sem uso e listas que repetem manifests. Para cada remocao, indique onde o leitor encontra a mesma verdade.
- Se o texto compensa um nome enganoso ou um estado invalido, proponha a menor mudanca no codigo que torne a intencao evidente.
- Preserve licencas, diretivas de ferramenta, contratos de API publica, motivos de decisoes, restricoes externas e instrucoes operacionais uteis. Confira a origem de um aviso antes de remove-lo. Uma supressao exige verificar o comportamento da ferramenta e a causa no codigo.
