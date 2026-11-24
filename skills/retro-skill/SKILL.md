---
name: retro-skill
description: Revisa as skills do catalogo pelo uso real e propoe mudancas comprovadas pelo eval de acionamento e pelo acompanhamento do uso. Use somente quando o usuario pedir uma retro das skills ou quando uma tarefa agendada a disparar.
disable-model-invocation: true
---

# Retro das skills

Transforme o uso real das skills em mudancas pequenas e comprovadas no catalogo. Cada mudanca chega ao usuario num PR, com a evidencia de uso, o resultado antes e depois e o custo no texto da skill.

**Proibido:** copiar para o catalogo, que e publico, prompt, transcript, caminho de transcript, nome de cliente, de repositorio privado ou de skill e plugin fora do catalogo.

## Fontes

O checkout do catalogo e o submodulo `skills/` do checkout de perfis registrado em `~/.agents/state.json` (campo `repoRoot`). Altere as skills e os casos de eval nele.

- **Uso das skills:** `node {{SCRIPTS_DIR}}/usage.mts skills [--since 30d] [--json]`. Mede cada skill pelo turno em que carregou: tokens, erros de ferramenta, interrupcoes e correcao na proxima mensagem do usuario. Execucoes com o nome antigo de uma skill renomeada contam no nome atual. Com `--skill <nome>`, compara as versoes da skill e lista as execucoes recentes com transcript e registro da carga.
- **Sinais por repositorio:** `node {{SCRIPTS_DIR}}/usage.mts repos [--repo <nome>]`. Mostra correcoes, achados de revisor, comandos que falham e tempo de verificacao. A coluna `unknown` e a parte das verificacoes que esconde o codigo de saida. Com `--repo`, lista as sessoes que rodaram o gate mais vezes do que fizeram push.
- **Eval de acionamento:** `node scripts/trigger-eval.mts [--skill <nome>] [--baseline <run salvo>]`, na raiz do checkout do catalogo. Roda os casos de `evals/triggers.json` contra a arvore de trabalho. A execucao completa e salva. Caso que falha ou muda em relacao a linha de base roda mais duas vezes e passa por maioria. `--skill` inclui os prompts vizinhos que nao devem carregar a skill.
- **Registro das retros:** `~/.agents/usage/retros.md`, fora do catalogo. Uma linha por mudanca aceita: data, skill, causa, versao anterior, sinal esperado, PR e resultado do acompanhamento.

**Nota:** a correcao e detectada por heuristica sobre o texto da proxima mensagem. Confirme cada caso no transcript antes de conta-lo.

**Nota:** os relatorios e o eval leem so o Claude Code. Skill usada so no Codex aparece como sem uso.

## Procedimento

1. **Linha de base.** Rode os dois relatorios dos ultimos 30 dias e o eval completo. Guarde o caminho do run salvo do eval.
2. **Acompanhamento.** Para cada linha do registro sem resultado, compare com `--skill` a versao anterior e as versoes usadas depois da data. Com pelo menos 10 execucoes depois da data, anote se o sinal esperado melhorou, ficou igual ou piorou. Com menos, mantenha a linha aberta.
3. **Candidatos.** Escolha ate tres, nesta ordem:
   1. mudanca de retro anterior cujo sinal piorou, ou caso de eval falhando;
   2. skill com pelo menos 10 execucoes e taxa de correcao ou de interrupcao de pelo menos o dobro da mediana das skills do catalogo, com 3 ocorrencias ou mais;
   3. regra de skill do catalogo descumprida em dois repositorios ou mais, como `unknown` acima de 50% contra a regra de pipefail de `verification`, ou gate repetido antes do push. Regra de um so repositorio fica com `retro-repo`;
   4. skill do catalogo sem uso na janela, fora as que so carregam por comando;
   5. nome fora do catalogo que ainda carrega e nao esta no mapa de renomeacao (`RENAMED` em `scripts/usage.mts`).
4. **Causa.** Para cada candidato com uso, leia de dois a cinco transcripts listados pelo relatorio. Relate quantas das correcoes contadas os transcripts confirmaram. Classifique a causa:
   - **Acionamento:** a skill nao carregou quando devia ou carregou sem ser o caso. A correcao fica na `description`.
   - **Comportamento:** a skill carregou e o agente errou ao segui-la, ou descumpriu uma regra dela. A correcao fica no corpo, em `references/` ou num script.
   - **Fora da skill:** o erro vem do repositorio de trabalho ou do perfil. Relate a causa e nao altere a skill.
5. **Caso.** Registre o caso antes de alterar a skill:
   - Acionamento: acrescente a `evals/triggers.json` um prompt sintetico que reproduz o erro e um prompt vizinho com `avoid` para a skill.
   - Comportamento: escreva no relatorio o caso observado, o resultado esperado e o sinal que deve mudar (correcao, interrupcao, erro de ferramenta, `unknown` ou gate por push). Se a correcao for num script, escreva o teste que reproduz o caso.
6. **Mudanca.** Altere a skill com a menor mudanca que remove a causa. Siga `writing-guide`. Conte as palavras do `SKILL.md` antes e depois. Se o texto crescer mais de 10%, retire texto equivalente ou justifique no PR.
7. **Comprovar.** Rode o eval completo com `--baseline <run do passo 1>`. Aceite a mudanca so se:
   - nenhum caso que passava na linha de base regrediu;
   - em acionamento, o caso do passo 5 passou;
   - em script, o teste do passo 5 passou.

   Caso contrario, volte ao passo 6 ou descarte o candidato. Mudanca de comportamento so em texto fica aceita provisoriamente: o passo 2 da proxima retro a confirma.
8. **Registrar.** Acrescente ao registro uma linha por mudanca aceita, com a versao anterior da skill que `--skill` mostra.
9. **Publicar.** Siga o fluxo de `send`: primeiro o PR do catalogo, com a skill e os casos de eval; depois o PR do checkout de perfis, com a nova referencia do submodulo.

**Atencao:** o passo 9 consome a permissao **Publicar** de `send`.

Ao encerrar, relate por candidato:

- os numeros de uso com datas, sem conteudo de prompt;
- as correcoes confirmadas nos transcripts;
- a causa;
- a mudanca feita ou o motivo do descarte;
- o eval antes e depois;
- o tamanho do texto antes e depois;
- os links dos PRs.

Relate tambem o resultado do acompanhamento das retros anteriores.
