---
name: validation-loop
description: Revisao final de uma entrega com revisor independente, em ate 3 rodadas, e passada de seguranca quando a mudanca pede. Roda em todo PR, antes do push final de trabalho que nao vira PR e quando solicitado.
---

# Validacao em loop

Ultimo refinamento antes de publicar: um revisor independente procura bug, regressao e complexidade desnecessaria no diff, e voce corrige com a menor mudanca completa. Em pedido somente de revisao, relate os achados sem editar.

**Proibido:** publicar durante o loop, trocar por conta propria o modelo do revisor, usar esforco abaixo do nivel de Delimitar e usar CLI de outra harness como fallback.

## Revisor e orcamento

- O revisor e um agente independente, com modelo fixo, que nao herda o historico da implementacao. Rota, modelo e esforco de cada nivel ficam na secao da harness, ao fim desta skill. Uma versao pedida pelo usuario prevalece; se a harness nao permitir, encerre em **Escalado**.
- Use o nivel calculado em Delimitar durante toda a revisao.
- Ate 3 rodadas: a primeira completa, as seguintes sobre o delta e os achados abertos. Peca ao revisor retomado que limite a leitura aos arquivos do delta, aos chamadores dos simbolos alterados e aos achados abertos. Revisor novo recebe o briefing completo. Encerre cedo se restarem apenas nits ou `pre-existing`.
- Mudanca so de texto sem efeito em regra nao exige nova rodada. Em skills, instrucoes e prompts, mudar uma regra e mudar comportamento.

## Seguranca

Quando o diff tocar autenticacao, permissoes, dados de usuario, segredos, entrada externa ou ambiente compartilhado, inclua os [criterios de seguranca](references/security.md) aplicaveis e as restricoes do ambiente no briefing. Peca evidencia por item. O limite de tres rodadas tambem vale para seguranca.

## Ciclo

1. **Delimitar.** Isole os caminhos da tarefa, preservando alteracoes preexistentes. Rode o script desta skill, com `--security` quando a passada de seguranca se aplicar:

   ```bash
   node <pasta da skill>/scripts/review-scope.mts <repositorio> [--base <ref da branch base>] [--security] -- <caminhos>
   ```

   Passe `--base` com a branch base do PR quando ela nao for a branch padrao do remote. Ele fixa a base (merge-base com a branch base, ou `HEAD` sem remote), conta o diff ate a arvore de trabalho, incluindo arquivos novos, e devolve o nivel (`light` ou `full`) com os motivos e o cabecalho do briefing. Use a mesma base e os mesmos caminhos em todas as rodadas. Rode as verificacoes locais pertinentes antes de delegar.
2. **Revisar.** Inicie o revisor pela rota da harness, no nivel de esforco de Delimitar, confirme modelo e esforco e guarde o ID; sem rota verificavel, encerre em **Escalado**. Envie o [briefing da rodada](references/briefing.md).

   **Atencao:** nao edite os arquivos enquanto a revisao roda; se o conteudo mudar, invalide a rodada.

   Erro, timeout ou ausencia de resposta nao aprovam nada: tente uma vez com novo revisor e o mesmo briefing; se persistir, encerre em **Escalado**.
3. **Avaliar e corrigir.** Para cada achado: concorde e corrija, discorde com evidencia (arquivo e linha, teste ou resultado) ou adie com motivo. Achado `pre-existing` nao e corrigido nesta tarefa: registre-o como `deferred`, relate-o e, se for grave, proponha issue. O detalhe de achado de seguranca fica so na conversa; risco real e nao resolvido entra no PR como risco, sem esse detalhe. Ao corrigir achado de classe, corrija tambem as instancias listadas que nao sejam `pre-existing`. Nao concorde apenas para encerrar o loop. Rode as verificacoes afetadas.
4. **Proxima rodada.** Retome o mesmo revisor com o registro (`fixed`, `disagree`, `deferred`), o delta e o pedido de `resolved` ou `still open` por ID. Correcao sugerida pelo revisor entra no delta como qualquer outra. Se o revisor nao puder ser retomado, inicie outro com o mesmo briefing e registro.

## Saida

- **Aprovado:** APPROVE sobre o estado atual, sem blocker ou should aberto; nits e `pre-existing` abertos nao impedem.
- **Escalado:** limite atingido, item disputado apos duas respostas, revisor sem rota verificavel ou falha repetida do revisor. Apresente ao usuario as evidencias dos dois lados, ou o bloqueio do revisor, para ele decidir. Limite atingido nao e aprovacao.

Relate modelo e esforco confirmados, rodadas, achados tratados ou adiados, verificacoes e pendencias.

Se um achado revelar regra que faltava, relate onde coloca-la: lint, teste, instrucao do repositorio ou skill. Nao aplique a regra nesta tarefa.

**Nota:** aprovacao da revisao nao substitui verificacoes nem checks de CI, nem significa pronto para merge.
