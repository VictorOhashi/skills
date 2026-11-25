# Acompanhar o PR

Ciclo da etapa 5 de `send`. Os comandos de cada passo estao em [github.md](github.md).

## Identidade e checkout

Identifique a branch head e a base pelo repositorio do PR e pelo head do PR, e confira contra o checkout e os remotes, sem presumir `origin`.

**Nota:** em forks, o remote da base pode ser diferente do remote de push.

Trabalhe apenas no checkout e na branch informados. Se o checkout nao corresponder ao PR, ou outro processo alterar a branch durante o acompanhamento, pare e relate a divergencia.

## Leitura do estado

Leia o PR com o script desta skill, numa pasta do PR no diretorio temporario da harness. Reaproveite a mesma pasta entre leituras do mesmo PR:

```bash
node <pasta da skill>/scripts/pr-state.mts <owner/repo#numero | URL do PR> <pasta do PR> --head <sha publicado> [--wait]
```

O script exige Node 22.18+ e `gh` autenticado. Ele grava o `pr.md`: status, acoes classificadas, checks do head, threads abertas, reviews e comentarios gerais com o texto, trecho do log de cada job do GitHub Actions que falhou e a secao `Merge context`. A secao "New since the previous read" compara com a leitura anterior da mesma pasta.

- `--head`: o SHA que voce publicou. Head diferente vira a acao `head-changed`. Nos primeiros 3 minutos de cada execucao, ele conta como espera quando ainda e o head da leitura anterior ou quando a pasta nao tem leitura anterior, porque o GitHub atrasa o head logo depois do push.
- `--merge-requested`: somente depois de pedir o merge. Fila e auto-merge passam a ser espera.
- `--restart`: reinicia os limites de espera, quando o usuario pedir mais prazo.

Se o script sair com codigo 1, a leitura falhou; isso nao indica PR limpo. Rode de novo uma vez; se repetir, use os comandos de [github.md](github.md).

**Nota:** a classificacao e mecanica. Ela nao decide se um comentario procede nem se a mudanca e de alto risco.

## Observador

O observador e um agente barato, iniciado pela conversa principal com o comando completo do script, com caminhos absolutos e `--wait`. Ele so repete o comando; a leitura do `pr.md` e dos logs fica na conversa principal.

1. Rode o comando. Ele termina em ate 9 minutos.
2. Se o JSON de saida tiver `reason` igual a "invocation limit; run --wait again", volte ao passo 1.
3. Com outro resultado, responda com o JSON de saida, sem mudar nada. Se o comando sair com erro ou estourar o tempo, responda `STATUS: error` e a primeira linha do erro.

O `--wait` termina quando nada mais esta pendente, quando surge acao ou feedback que nao existia no inicio da espera, quando o head muda ou no limite de tempo. Cada novo `--wait` comeca sabendo o que ja foi lido, inclusive suas respostas; so a continuacao de uma saida "invocation limit" mantem a referencia anterior.

## Ciclo

1. **Estado atual.** Leia o `pr.md`. Se o status for `closed`, encerre. Com a acao `head-changed`, pare e relate. Com `incomplete-read`, leia a parte que faltou pelos comandos de [github.md](github.md). A tabela de checks ja e do head atual e marca os obrigatorios.

   **Nota:** pending, ausencia de checks e falha de consulta nao significam sucesso nem CI vermelho.
2. **Reviews completos.** Leia no `pr.md` as threads abertas, os corpos de review e os comentarios gerais, inclusive autor e se a thread esta desatualizada. Achado no corpo de um review ou num comentario geral nao vira acao do script; trate-o como thread. Reavalie thread desatualizada no codigo atual. Antes de responder ou resolver uma thread, rode o script de novo para evitar duplicacao.

   **Nota:** a lista de comentarios de diff nao basta para concluir que nao ha threads abertas. Thread desatualizada indica mudanca no diff, nao correcao.

   Para cada bot esperado pelo repositorio, confira o sinal de conclusao no head atual:
   - Se houver check pendente, use o observador com os limites de espera abaixo.
   - Para bot sem check, consulte o sinal documentado pelo repositorio, como review do bot vinculado ao head. Sem conclusao confirmada, trate as demais acoes autorizadas. Se restar apenas esse bot, encerre em **Aguardando**, indicando bot, head e evidencia pendente. Nao relance o observador para esperar uma condicao ausente de `waiting`.
   - Se a consulta falhar, siga o tratamento de leitura incompleta. Um retorno `ready` do script ainda exige confirmar os itens de `unchecked`.

3. **Integrar a base.**

   **Atencao:** integre a base somente com **Corrigir localmente** e se o repositorio permitir esse fluxo.

   Nos casos do passo Enviar de `send`, integre a branch base verificada na branch do PR, preserve a intencao dos dois lados e rode a verificacao local antes de publicar. Sem permissao, relate o bloqueio. Com decisao de produto pendente, escale.
4. **CI vermelho.**

   **Proibido:** desativar testes ou afrouxar validacoes para passar o CI.

   Leia o trecho do log no `pr.md` e, se precisar, o log completo indicado. Corrija a causa raiz no escopo autorizado. Se a falha for de infraestrutura ou flake, faca um rerun por execucao, com **Publicar**. Se repetir, escale.
5. **Comentarios.** Valide comentarios de bots contra o codigo antes de corrigir ou justificar falso positivo. Nit de bot e comentario sobre codigo que o PR nao introduziu nao exigem commit, salvo se o PR torna o problema alcancavel ou pior. Nesses casos, responda com o motivo ou proponha issue, seguindo a regra de achado de seguranca de `review-loop`. Thread de bot respondida com motivo conta como tratada. Em pedido humano, a recusa e discordancia: escale antes de responder e nao resolva a thread. Trate pedidos humanos objetivos. Escale decisoes de abordagem, design e discordancias. Com **Publicar**, publique respostas curtas e resolva apenas threads efetivamente tratadas; sem ela, inclua as respostas propostas no relatorio. Nao publique comentario sem conteudo util, em PR ou issue.
6. **Verificar e enviar.**

   **Atencao:** antes de publicar, releia o head remoto. Se outro autor ou processo o mudou, nao sobrescreva: pare e escale.

   Para cada correcao ou integracao da base, siga Comprovar, Revisar e Enviar de `send` sobre o delta. Se um check esperado ainda estiver pendente no head, corrija localmente e espere-o com o observador, dentro de Esperas e limites, antes do push: o push relanca o CI no novo head, e o resultado pendente deixa de valer para o PR. No timeout do observador, ou se o pendente for bot sem check, publique. Agrupe num unico push as correcoes de CI e de comentarios de uma mesma leitura. Apos o push, leia o novo head e revalide CI e reviews, sem descartar comentarios antigos automaticamente.
7. **Descricao.** Se uma correcao mudar a descricao, atualize-a com `pr-format`.

## Esperas e limites

- Para condicoes em `waiting`, use o observador. O `--wait` consulta a cada 45 segundos, com backoff. Nao consulte o PR em loop na conversa principal.
- O script encerra com status `timeout` apos 10 minutos sem mudanca relevante, sem contar check em andamento, ou 30 minutos no mesmo head e na mesma base, com teto de 60 minutos no mesmo head. Encerre com pendencia. Se o usuario der mais prazo, rode com `--restart`. Nao espere indefinidamente por aprovacao humana.
- Em **Pronto para merge**, encerre o acompanhamento. Todo push seu relanca o observador com o novo `--head`; o script reinicia os limites quando o head muda, e reabre a janela de 30 minutos quando a base muda.
- Faca ate 3 rodadas de correcao por causa. Se a mesma falha persistir, escale.
- Ao atingir limite de ferramenta ou de turnos, encerre com o relatorio de pendencias.
- Se a correcao exigir algo do **Proibido** de `send` ou ampliar o escopo, relate a necessidade.
