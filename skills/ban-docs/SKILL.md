---
name: ban-docs
description: Remove e realoca trechos de documentacao em Markdown que nao mudam o que o leitor faz, em um diff ou conjunto de arquivos, por um revisor critico independente. Use quando o pedido for enxugar AGENTS.md, CLAUDE.md, README, docs ou skills com instrucao redundante, obsoleta ou que repete o codigo.
---

# Remocao de documentacao

Um revisor independente remove ou move todo trecho de documentacao em Markdown fora das [Excecoes](#excecoes). Prevalece o julgamento dele: confira o resultado e rejeite so os casos listados no passo 4. Regra que uma verificacao pode garantir vira pendencia; o texto so sai quando a garantia entra na mesma entrega.

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
- Trecho que codigo, lint, workflow ou outro documento cita como fonte.
- Repeticao que o guia de redacao do repositorio registra como proposital.
- Frontmatter ou metadado que uma ferramenta le.
- Cabecalho de licenca ou aviso legal.

## Procedimento

1. Rode o script desta skill sobre o repositorio inteiro e guarde a saida como linha de base:

   ```bash
   node <pasta da skill>/scripts/doc-refs.mts <repositorio>
   ```

   Ele lista link, ancora, caminho em codigo inline e script de `pnpm`, `npm`, `yarn` ou `bun` que nao resolvem. Cada linha e candidata: caminho gerado em execucao ou de outro repositorio tambem aparece. Saida com codigo 1 so indica que ha candidatas.

   Liste tambem as citacoes dos arquivos do escopo:

   ```bash
   node <pasta da skill>/scripts/doc-refs.mts <repositorio> --cited-by -- <arquivos do escopo>
   ```

   Ele lista os symlinks de cada arquivo, como `CLAUDE.md` para `AGENTS.md`, e cada linha fora do proprio arquivo e dos seus symlinks que nomeia um deles, cada uma seguida das linhas vizinhas do arquivo que cita. Nao trunque nenhuma das duas saidas.
2. Leia o guia de redacao, o glossario e os templates do repositorio, quando existirem.
3. Inicie o revisor pela secao da harness. Entregue o escopo, as linhas da linha de base nos arquivos do escopo, as citacoes, o que o passo 2 achou, as Excecoes e os [Criterios do revisor](#criterios-do-revisor), sem reescreve-los.
4. Confira o diff e o relatorio. Rejeite:
   - edicao fora de Markdown ou fora do escopo, exceto o destino de um **mover**;
   - remocao de trecho com excecao comprovada, inclusive trecho que uma citacao do passo 1 trata como fonte;
   - remocao de parte de frase, ou que deixa incoerente o trecho pai ou os irmaos, como lista anunciada, contagem ou cabecalho;
   - **mover** que altera o texto alem dos alvos relativos, ou que deixa no lugar ponteiro sem gatilho;
   - troca de referencia com alvo ambiguo ou errado;
   - pendencia com arquivo ou simbolo errado, sobre trecho fora do escopo ou com motivo falso;
   - remocao do trecho de uma pendencia.
   Confira cada prova citada em pendencia, com a saida completa da busca. Trecho mantido sem prova da excecao sai. Remocao duvidosa fica removida.
5. Se rejeitar uma edicao fora do escopo, um **mover**, uma troca de referencia ou uma pendencia, reverta o trecho e rode o revisor mais uma vez so sobre os trechos rejeitados, nomeando a falha. Se a segunda rodada tambem falhar, relate o trecho como aberto. Remocao de excecao comprovada so exige reverter.
6. Rode de novo o primeiro comando do passo 1 e compare com a linha de base pelo par arquivo e alvo, nao pela linha. Para cada referencia nova quebrada, reverta a edicao que a quebrou. Dentro do escopo, em vez de reverter, remova tambem o trecho que so existia por ela. Relate cada arquivo fora do escopo afetado. Rode tambem o lint de Markdown e o build de docs do repositorio, quando existirem.
7. Para cada pendencia aceita que cabe nesta entrega, construa a garantia em commit separado da remocao, com a verificacao que ela exigir, e so entao remova o trecho. Para as demais, mantenha o trecho, relate a pendencia e proponha uma issue.
8. Relate a quantidade de remocoes, os trechos movidos com origem e destino, as trocas de referencia, os mantidos com a excecao, as rodadas extras, as pendencias resolvidas e as abertas.

## Criterios do revisor

Classifique cada paragrafo, item de lista, linha de tabela ou secao do escopo como **remover**, **manter**, **mover** ou **pendencia**. A menor unidade e a frase inteira: nao remova parte de frase. Antes de remover, confira o trecho pai e os irmaos: cabecalho ou frase que anuncia ou conta itens, e secao que ficaria vazia.

- **Remover:**
  - instrucao que o leitor ja seguiria sem ela; o teste e se a linha muda o que ele faria;
  - lista de scripts, dependencias, pastas ou configuracao que o manifesto, as configs ou o `--help` ja entregam;
  - regra escrita em outro arquivo ou secao; cite o dono, que mantem o texto;
  - referencia confirmada como morta, com o trecho que so existia por ela;
  - texto que descreve comportamento que o codigo contradiz, quando o codigo esta certo;
  - historico, changelog narrado, motivacao, status de trabalho, nota ao revisor, data ou contagem que envelhece.
  Nao reescreva o texto numa versao mais curta.
- **Manter:** cite a excecao e a prova no codigo, nas configs ou na fonte externa. Numa regra mantida com referencia morta, faca a troca de referencia so quando o alvo atual for inequivoco; sem alvo inequivoco, o trecho sai. De o trecho antigo e o novo.
- **Mover:** trecho com excecao comprovada no lugar errado. Mova o texto identico, so com os alvos de links e caminhos relativos ajustados ao destino, e de origem, destino e o ponteiro deixado.
  - Instrucao persistente que vale so para um tipo de tarefa: para a skill ou o arquivo lido nessa tarefa.
  - Detalhe que so parte do procedimento usa: para um arquivo de referencia, com ponteiro e gatilho no lugar.
  - Sem destino pela convencao do repositorio, o trecho vira pendencia.
- **Pendencia:** o trecho fica, e a garantia vira item fora do texto, com arquivo, a menor mudanca e a prova (busca e resultado), em uma linha. O trecho sai no passo 7, quando a garantia entrar.
  - Regra que lint, hook, tipo, teste ou script pode garantir: construir a verificacao.
  - Texto que descreve comportamento que o codigo contradiz, com o codigo errado: corrigir o codigo; o trecho fica.
  - Trecho a mover sem destino: criar o destino.
- Enfase, caixa alta, `IMPORTANTE`, `sempre` e `nunca` sao pista, nao prova. Confira no codigo, nas configs e no historico com `git log` e `git blame`.
- Leia cada citacao com as linhas recuadas abaixo dela: o trecho citado pode estar nomeado so nelas.
- Ao buscar o nome de um arquivo como prova, inclua os symlinks que as citacoes mostram.
- Nao edite arquivo fora de Markdown. Nao aponte trecho fora do escopo nem proponha mudanca sem evidencia.
