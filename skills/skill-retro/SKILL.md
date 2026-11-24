---
name: skill-retro
description: Revisa as skills do catalogo pelo uso real e propoe mudancas comprovadas pelo eval de acionamento. Use somente quando o usuario pedir uma retro das skills ou quando uma tarefa agendada a disparar.
disable-model-invocation: true
---

# Retro das skills

Transforme o uso real das skills em mudancas pequenas e comprovadas no catalogo. Cada mudanca chega ao usuario num PR, com a evidencia de uso e o resultado do eval antes e depois.

**Proibido:** copiar prompt, transcript, nome de cliente ou de repositorio privado para o catalogo, que e publico.

## Fontes

As duas fontes rodam no checkout de perfis registrado em `~/.agents/state.json` (campo `repoRoot`).

- **Relatorio de uso:** `pnpm agents stats [--since 30d] [--json]`. Mede cada skill pelo turno em que carregou: tokens, erros de ferramenta, interrupcoes e correcao na proxima mensagem do usuario. Com `--skill <nome>`, compara as versoes da skill e lista os transcripts recentes.
- **Eval de acionamento:** `pnpm agents eval [--skill <nome>]`. Roda os casos de `evals/triggers.json` contra a arvore de trabalho de `skills/` e salva o resultado. Na execucao completa, mostra os casos que mudaram desde a anterior.

**Nota:** a correcao e detectada por heuristica sobre o texto da proxima mensagem. Confirme cada caso no transcript antes de agir.

## Procedimento

1. Rode o relatorio de uso dos ultimos 30 dias e o eval de acionamento completo. O resultado do eval e a linha de base.
2. Escolha ate tres candidatos, nesta ordem:
   1. caso de eval falhando;
   2. skill com taxa de correcao ou de interrupcao acima das demais, ou que piorou na versao mais recente;
   3. skill do catalogo sem uso na janela;
   4. nome fora do catalogo ainda carregado, como skill renomeada ou retirada.
3. Para cada candidato com uso, leia de dois a cinco transcripts listados pelo relatorio com `--skill`. Classifique a causa:
   - **Acionamento:** a skill nao carregou quando devia ou carregou sem ser o caso. A correcao fica na `description`.
   - **Comportamento:** a skill carregou e o agente errou ao segui-la. A correcao fica no corpo, em `references/` ou num script.
   - **Fora da skill:** o erro vem do repositorio de trabalho ou do perfil. Relate a causa e nao altere a skill.
4. Registre o caso antes de alterar a skill:
   - Acionamento: acrescente a `evals/triggers.json` um prompt sintetico que reproduz o erro e um prompt vizinho que nao deve carregar a skill.
   - Comportamento: escreva no relatorio o caso observado e o resultado esperado.
5. Altere a skill com a menor mudanca que remove a causa. Siga `writing-guide`.
6. Rode o eval de acionamento completo de novo. Compare as falhas com as da linha de base do passo 1, nao com a ultima execucao. Aceite a mudanca so se nenhum caso que passava na linha de base falhou e o caso do passo 4 passou. Caso contrario, volte ao passo 5 ou descarte o candidato.
7. Publique pelo fluxo de `send`: primeiro o PR do catalogo; depois o PR do checkout de perfis, com os novos casos de eval e a nova referencia do submodulo.

**Atencao:** o passo 7 consome a permissao **Publicar** de `send`.

Ao encerrar, relate por candidato: os numeros de uso com datas, sem conteudo de prompt; a causa; a mudanca feita ou o motivo do descarte; o eval antes e depois; e os links dos PRs.
