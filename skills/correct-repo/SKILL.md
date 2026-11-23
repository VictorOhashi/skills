---
name: correct-repo
description: Identifica erros que agentes repetem no repositorio e corrige a causa que permite sua repeticao. Use ao investigar reincidencias ou transformar uma correcao do usuario em uma protecao local verificavel.
---

# Corrigir erros recorrentes no repositorio

Altere o repositorio para que o proximo agente consiga seguir o caminho correto a partir do codigo que encontrar.

**Proibido**, sem autorizacao explicita: alterar workflow de CI.

## Identificar a recorrencia

Parta das correcoes do usuario, commits, reversoes, pareceres de revisao e instrucoes locais. Agrupe ocorrencias pela decisao que permitiu o erro. Uma correcao explicita do usuario basta para investigar a classe. Para inferir recorrencia pelo historico, confirme duas ocorrencias distintas. Priorize as classes mais frequentes dentro do escopo pedido.

## Escolher a protecao

Percorra os niveis em ordem e use o primeiro que resolva a classe de erro:

1. **Estrutura.** Corrija a fronteira que expoe a operacao indevida. Concentre a decisao em quem controla o estado e retire caminhos obsoletos que ainda servem de modelo.
2. **Tipos.** Expresse a restricao no contrato para que o verificador rejeite o uso incorreto.
3. **Lint.** Quando o uso indevido ainda compilar e puder ser reconhecido com precisao, use o verificador do repositorio. O diagnostico deve indicar como corrigir o trecho. Se houver legado fora do escopo, bloqueie novas ocorrencias.
4. **Teste de comportamento.** Quando o erro so aparecer na execucao, exercite a regra pela entrada do produto. Reaproveite a cobertura que detecta a mesma regressao.
5. **Instrucao local.** Reserve texto para decisoes que exigem julgamento. Escreva o criterio no ponto em que o agente precisa escolher.

## Corrigir e comprovar

Corrija as ocorrencias confirmadas no escopo autorizado. Para uma protecao executavel, reintroduza uma ocorrencia historica em uma copia temporaria. Execute o comando usado pelo projeto e confira que ele rejeita o erro pelo motivo esperado. Repita com a correcao e com um uso legitimo proximo. Use o mesmo comando localmente e na integracao continua quando ela ja rodar esse comando; inclui-lo na CI exige autorizacao explicita. Para uma instrucao local, confira se o criterio distingue a ocorrencia historica do uso legitimo e relate a dependencia de julgamento.

Registre excecoes junto ao uso autorizado, com motivo, prazo e responsavel pela aprovacao.

## Manter as regras locais

No arquivo de instrucoes do repositorio, ligue cada regra ativa ao mecanismo que a garante, no formato que o repositorio ja usa. Sem formato existente, proponha uma tabela curta antes de cria-la. Se uma regra escrita voltou a ser violada, procure a garantia que faltou. Retire a entrada quando a estrutura tornar o erro impossivel.

Ao entregar, indique a evidencia de cada classe, a protecao escolhida, por que os niveis anteriores nao bastaram e o resultado da verificacao.
