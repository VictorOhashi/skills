---
name: ban-docs
description: Remove e realoca trechos de documentacao em Markdown que nao mudam o que o leitor faz, em um diff ou conjunto de arquivos, por um revisor critico independente. Use quando o pedido for enxugar AGENTS.md, CLAUDE.md, README, docs ou skills com instrucao redundante, obsoleta ou que repete o codigo.
---

# Remocao de documentacao

Um revisor independente remove ou move todo trecho de documentacao em Markdown fora das [Excecoes](#excecoes). Prevalece o julgamento dele: confira o resultado e rejeite so os casos listados no passo 4. Regra que uma verificacao pode garantir sai do texto e vira pendencia, resolvida depois da remocao.

**Atencao:** sem **Corrigir localmente** de `send`, rode o revisor so em modo parecer, entregue o relatorio sem aplicar nada e pergunte uma vez se deve aplicar.

## Escopo

Use os arquivos Markdown (`.md`, `.mdx`) indicados. Sem indicacao, use os arquivos Markdown do diff da branch contra a base do PR ou a branch padrao, incluindo a arvore de trabalho e os arquivos novos. Comentarios e docstrings em arquivos de codigo ficam fora.

## Excecoes

So estes trechos ficam. Na duvida sobre a excecao, o trecho sai.

- Convencao ou decisao que o codigo, as configs e o historico nao revelam e que muda o que o leitor faria.
- Comportamento imposto por dependencia, plataforma, fornecedor ou ambiente, verdadeiro hoje num caminho em uso.
- Limite duro, permissao ou estado definido no arquivo que e dono dele.
- Ponteiro para outro arquivo com o gatilho de leitura: quando ler, nao so o que ha la.
- Comando ou procedimento operacional em uso que o manifesto, as configs e o `--help` nao entregam.
- Documentacao para leitor sem o codigo, como guia de uso de pacote publicado, de API publica ou de produto.
- Repeticao que o guia de redacao do repositorio registra como proposital.
- Frontmatter ou metadado que uma ferramenta le.
- Cabecalho de licenca ou aviso legal.

## Procedimento

1. Rode o script desta skill sobre o repositorio inteiro e guarde a saida como linha de base:

   ```bash
   node <pasta da skill>/scripts/doc-refs.mts <repositorio>
   ```

   Ele lista link, ancora, caminho em codigo inline e script de `pnpm`, `npm`, `yarn` ou `bun` que nao resolvem. Cada linha e candidata: caminho gerado em execucao tambem aparece.
2. Leia o guia de redacao, o glossario e os templates do repositorio, quando existirem.
3. Inicie o revisor pela secao da harness. Entregue o escopo, as linhas da linha de base nos arquivos do escopo, o que o passo 2 achou, as Excecoes e os [Criterios do revisor](#criterios-do-revisor), sem reescreve-los.
4. Confira o diff e o relatorio. Rejeite:
   - edicao fora de Markdown ou fora do escopo, exceto o destino de um **mover**;
   - remocao de trecho com excecao comprovada;
   - **mover** que altera o texto, ou que deixa no lugar ponteiro sem gatilho;
   - pendencia com arquivo ou simbolo errado, fora do escopo ou motivo falso.
   Trecho mantido sem prova da excecao sai. Remocao duvidosa fica removida.
5. Se rejeitar uma edicao fora do escopo, um **mover** ou uma pendencia, reverta o trecho e rode o revisor mais uma vez so sobre os trechos rejeitados, nomeando a falha. Se a segunda rodada tambem falhar, relate o trecho como aberto. Remocao de excecao comprovada so exige reverter.
6. Rode o script de novo, como no passo 1, e compare com a linha de base. Reverta a remocao que deixou link ou ancora quebrados em arquivo fora do escopo e relate o arquivo. Rode tambem o lint de Markdown e o build de docs do repositorio, quando existirem.
7. Resolva cada pendencia aceita dentro do escopo em commit separado da remocao, com a verificacao que ela exigir. Relate a pendencia fora do escopo e proponha uma issue.
8. Relate a quantidade de remocoes, os trechos movidos com origem e destino, os mantidos com a excecao, as rodadas extras, as pendencias resolvidas e as abertas.

## Criterios do revisor

Classifique cada paragrafo, item de lista, linha de tabela ou secao do escopo como **remover**, **manter**, **mover** ou **pendencia**.

- **Remover:**
  - instrucao que o leitor ja seguiria sem ela; o teste e se a linha muda o que ele faria;
  - lista de scripts, dependencias, pastas ou configuracao que o manifesto, as configs ou o `--help` ja entregam;
  - regra escrita em outro arquivo ou secao; cite o dono, que mantem o texto;
  - referencia confirmada como morta, com o trecho que so existia por ela;
  - historico, changelog narrado, motivacao, status de trabalho, nota ao revisor, data ou contagem que envelhece.
  Nao reescreva o texto numa versao mais curta.
- **Manter:** cite a excecao e a prova no codigo, nas configs ou na fonte externa. Numa regra mantida com referencia morta, troque so a referencia quando o alvo atual for inequivoco; sem alvo inequivoco, o trecho sai.
- **Mover:** trecho com excecao comprovada no lugar errado. Mova o texto identico e de origem, destino e o ponteiro deixado.
  - Instrucao persistente que vale so para um tipo de tarefa: para a skill ou o arquivo lido nessa tarefa.
  - Detalhe que so parte do procedimento usa: para um arquivo de referencia, com ponteiro e gatilho no lugar.
  - Sem destino pela convencao do repositorio, o trecho vira pendencia.
- **Pendencia:** o trecho sai e a garantia vira item fora do texto, com arquivo e a menor mudanca, em uma linha.
  - Regra que lint, hook, tipo, teste ou script pode garantir: construir a verificacao.
  - Texto que descreve comportamento que o codigo contradiz: o texto sai; se o codigo estiver errado, corrigir o codigo.
  - Trecho a mover sem destino: criar o destino.
- Enfase, caixa alta, `IMPORTANTE`, `sempre` e `nunca` sao pista, nao prova. Confira no codigo, nas configs e no historico com `git log` e `git blame`.
- Nao edite arquivo fora de Markdown. Nao aponte trecho fora do escopo nem proponha mudanca sem evidencia.
