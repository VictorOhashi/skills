---
name: ban-comments
description: Remove comentarios e documentacao que nao se justificam em um diff ou conjunto de arquivos, por um revisor critico independente, e lista as pendencias de codigo que eles escondiam. Use quando o pedido for limpar narracao, codigo comentado, TODOs, justificativas de contorno e supressoes de lint.
---

# Remocao de comentarios

Um revisor independente remove todo comentario e trecho de documentacao fora das [Excecoes](#excecoes). Prevalece o julgamento dele: confira o resultado e rejeite so os casos listados no passo 2. Pendencia que exige mudar codigo e resolvida depois da remocao.

**Atencao:** sem **Corrigir localmente** de `send`, rode o revisor so em modo parecer, entregue o relatorio sem aplicar nada e pergunte uma vez se deve aplicar.

## Escopo

Use os arquivos ou o diff indicados. Sem indicacao, use o diff da branch contra a base do PR ou a branch padrao, incluindo a arvore de trabalho e os arquivos novos.

## Excecoes

So estes trechos ficam. Na duvida sobre a excecao, o trecho sai.

- Cabecalho de licenca ou aviso legal.
- Diretiva de ferramenta, como ignore de formatador, pragma ou build tag.
- Supressao de lint ou de tipo cuja regra so trata de estilo ou nao se aplica ao caso.
- Motivo de uma decisao que parece errada, quando nome, tipo ou teste nao a tornam evidente e a alternativa obvia ja foi descartada.
- Comportamento imposto por dependencia, plataforma, fornecedor ou protocolo que o projeto nao controla, verdadeiro hoje num caminho em uso.
- Doc comment que define contrato de API publica.
- Link de issue, RFC ou especificacao que explica uma restricao que o codigo nao expressa.
- Documentacao operacional em uso, como instalacao, comandos e deploy, sem repetir o manifesto.

## Procedimento

1. Inicie o revisor pela secao da harness. Entregue o escopo, as Excecoes e os [Criterios do revisor](#criterios-do-revisor), sem reescreve-los.
2. Confira o diff e o relatorio. Rejeite:
   - edicao em codigo de aplicacao ou fora do escopo;
   - remocao de trecho com excecao comprovada;
   - pendencia com simbolo errado, fora do escopo ou motivo falso.
   Trecho mantido sem prova da excecao sai. Remocao duvidosa fica removida.
3. Se rejeitar uma edicao em codigo de aplicacao ou fora do escopo, ou uma pendencia, reverta o trecho e rode o revisor mais uma vez so sobre os trechos rejeitados, nomeando a falha. Se a segunda rodada tambem falhar, relate o trecho como aberto. Remocao de excecao comprovada so exige reverter.
4. Rode o typecheck, o lint e o build pertinentes sobre as remocoes. Reverta a remocao de diretiva ou supressao que quebrar a verificacao e trate-a como pendencia.
5. Resolva cada pendencia aceita dentro do escopo em commit separado da remocao, com a verificacao que ela exigir. Relate a pendencia fora do escopo e proponha uma issue.
6. Relate a quantidade de remocoes, os trechos mantidos com a excecao, as rodadas extras, as pendencias resolvidas e as abertas.

## Criterios do revisor

Classifique cada trecho do escopo como **remover**, **manter** ou **pendencia**.

- **Remover:** narracao, banner, historico da mudanca, nota ao revisor, codigo comentado, lista que repete manifesto ou arvore de arquivos, texto sem excecao comprovada. Nao reescreva o texto numa versao mais curta.
- **Manter:** cite a excecao e a prova no codigo ou na fonte externa.
- **Pendencia:** o comentario sai e a causa vira item de codigo, com arquivo, simbolo exato e a menor mudanca, em uma linha.
  - Surpresa do proprio codigo: renomear, extrair, tipar ou redesenhar ate o comportamento ficar evidente.
  - TODO, HACK ou justificativa de contorno: corrigir a causa e retirar o contorno.
  - Restricao interna real, como "nao remover": codificar a garantia em tipo, verificacao em runtime, teste ou regra de lint.
  - Supressao de lint ou de tipo que protege correcao ou seguranca: a supressao fica ate a correcao da causa.
- `IMPORTANTE`, `nao remover`, `arriscado`, `por enquanto` e justificativa longa sao pista, nao prova. Leia o codigo vizinho e rastreie o simbolo citado e o historico com `git log` e `git blame`.
- Nao altere codigo de aplicacao. Nao aponte codigo fora do escopo nem proponha mudanca sem evidencia.
