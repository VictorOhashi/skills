---
name: retro-skill
description: Revisa as skills do catalogo pelo uso real e propoe mudancas comprovadas pelo eval de acionamento e pelo acompanhamento do uso. Use somente quando o usuario pedir uma retro das skills ou quando uma tarefa agendada a disparar.
disable-model-invocation: true
---

# Retro das skills

Transforme o uso real das skills em mudancas pequenas e comprovadas no catalogo. Cada mudanca chega ao usuario num PR, com a evidencia de uso, o resultado antes e depois e o custo no texto da skill.

**Proibido:** copiar para o catalogo ou para o PR, que sao publicos, prompt, transcript, caminho de transcript, nome de cliente, de repositorio privado ou de skill e plugin fora do catalogo. Descreva um caso real so pelo prompt sintetico que o reproduz e pelos numeros agregados.

## Fontes

O checkout do catalogo e o submodulo `skills/` do checkout de perfis registrado em `~/.agents/state.json` (campo `repoRoot`). Altere as skills e os casos de eval nele.

- **Uso das skills:** `node {{SCRIPTS_DIR}}/usage.mts skills [--since 30d] [--json]`. Mede cada skill pelo turno em que carregou: tokens, erros de ferramenta, interrupcoes e correcao na proxima mensagem do usuario. Execucoes com o nome antigo de uma skill renomeada contam no nome atual. Com `--skill <nome>`, mostra por versao os sinais do turno e, a partir da carga da versao, `checks`, `unknown` (media das sessoes) e `gate rep`. Tambem lista as execucoes recentes com transcript e registro da carga.
- **Sinais por repositorio:** `node {{SCRIPTS_DIR}}/usage.mts repos [--repo <nome>]`. Mostra correcoes, achados de revisor, comandos que falham e tempo de verificacao. `unknown` e a parte das verificacoes que esconde o codigo de saida. `gate rep` e a parte das sessoes com push que rodaram o gate local mais vezes do que fizeram push.
- **Eval de acionamento:** `node scripts/trigger-eval.mts [--skill <nome>] [--baseline <run salvo>]`, na raiz do checkout do catalogo. Roda os casos de `evals/triggers.json` contra a arvore de trabalho. A execucao completa e salva. Caso que falha ou muda em relacao a linha de base roda mais duas vezes e passa por maioria. `--skill` inclui os prompts vizinhos que nao devem carregar a skill.
- **Registro das retros:** `~/.agents/usage/retros.md`, fora do catalogo. Uma linha por candidato decidido, nesta tabela:

  | data | skill | causa | decisao | versao anterior | sinal esperado | PR | acompanhamento |
  | --- | --- | --- | --- | --- | --- | --- | --- |

  `decisao` e `aceita`, `descartada` ou `fora da skill`; `acompanhamento` e `melhorou`, `igual`, `piorou` ou vazio.

**Nota:** a correcao e detectada por heuristica sobre o texto da proxima mensagem. Ela conta menos correcoes do que acontecem e erra algumas. Use-a para comparar versoes e skills, confirme cada caso no transcript e nao a leia como taxa absoluta.

**Nota:** os relatorios e o eval leem so o Claude Code. Skill usada so no Codex aparece como sem uso.

## Procedimento

1. **Linha de base.** Rode os dois relatorios dos ultimos 30 dias e o eval completo. Guarde o caminho do run salvo do eval.
2. **Acompanhamento.** Para cada linha `aceita` do registro sem acompanhamento, rode `--skill` com `--since` cobrindo 30 dias antes da data da linha. Com pelo menos 10 execucoes de cada lado da data, compare as taxas da versao anterior com as das versoes posteriores e anote:
   - `melhorou` ou `piorou`: a taxa do sinal esperado mudou pelo menos 5 pontos (correcao, interrupcao, erro de ferramenta) ou 10 pontos (`unknown`, `gate rep`), e o lado com a taxa maior tem pelo menos 3 ocorrencias confirmadas no transcript;
   - `piorou` tambem quando a mediana de `turn out` subiu mais de 20%;
   - `igual` nos demais casos.

   Com menos de 10 execucoes de um dos lados, ou se a versao anterior saiu do relatorio (store refeito ou transcripts apagados), deixe o acompanhamento vazio e anote o motivo.
3. **Candidatos.** Escolha ate tres, nesta ordem:
   1. mudanca de retro anterior com acompanhamento `piorou`, ou caso de eval falhando. Para `piorou`, proponha reverter a mudanca ou corrigi-la;
   2. skill com pelo menos 10 execucoes e taxa de correcao ou de interrupcao de pelo menos o dobro da mediana das skills do catalogo com 10 execucoes ou mais, e de pelo menos 5%, com 3 ocorrencias ou mais;
   3. regra de skill do catalogo descumprida em dois repositorios ou mais: `unknown` acima de 50%, contra a regra de pipefail de `verification`, ou `gate rep` acima de 25%, contra a regra de um gate por publicacao. `gate rep` tambem conta a reexecucao depois de corrigir uma falha, que `verification` permite: confirme nas sessoes que `--repo` lista antes de contar a violacao. Regra de um so repositorio fica com `retro-repo`;
   4. skill do catalogo ha mais de 30 dias e sem uso na janela, fora as que so carregam por comando. A data de entrada vem de `git log --follow --diff-filter=A --format=%as -- skills/<nome>/SKILL.md`;
   5. nome fora do catalogo que ainda carrega e nao esta em `RENAMED` (`scripts/usage.mts`). Procure o nome no historico do catalogo com `git log --all --stat -- 'skills/<nome>/*' '<nome>/*'`:
      - renomeado para uma skill atual: acrescente-o a `RENAMED` com o nome atual;
      - removido sem substituta: relate que a skill ainda carrega por instalacao antiga;
      - ausente do historico: e skill privada ou de plugin; ignore.

   Pule o candidato que o registro marca como `descartada` ou `fora da skill` nos ultimos 30 dias, salvo se o sinal dobrou desde entao.
4. **Causa.** Para cada candidato com uso, leia de dois a cinco transcripts listados pelo relatorio. Relate quantas das correcoes contadas os transcripts confirmaram. Classifique a causa:
   - **Acionamento:** a skill nao carregou quando devia ou carregou sem ser o caso. A correcao fica na `description`.
   - **Comportamento:** a skill carregou e o agente errou ao segui-la, ou descumpriu uma regra dela. A correcao fica no corpo, em `references/` ou num script.
   - **Fora da skill:** o erro vem do repositorio de trabalho ou do perfil. Relate a causa e nao altere a skill.
5. **Caso.** Registre o caso antes de alterar a skill:
   - Acionamento: acrescente a `evals/triggers.json` um prompt sintetico que reproduz o erro e um prompt vizinho com `avoid` para a skill.
   - Comportamento: escreva, na conversa, o caso observado, o resultado esperado e o sinal que deve mudar (correcao, interrupcao, erro de ferramenta, `unknown` ou `gate rep`). Se a correcao for num script, escreva o teste que reproduz o caso.
6. **Mudanca.** Altere a skill com a menor mudanca que remove a causa. Siga `writing-guide`. Conte as palavras do `SKILL.md` antes e depois. Se o texto crescer mais de 10%, retire texto equivalente ou justifique no PR.
7. **Comprovar.** Enquanto ajusta a mudanca, rode `--skill <nome> --baseline <run do passo 1>`. Para aceitar, rode uma vez o eval completo com `--baseline <run do passo 1>`. Aceite a mudanca so se:
   - nenhum caso que passava na linha de base regrediu;
   - em acionamento, o caso do passo 5 passou;
   - em script, o teste do passo 5 passou.

   Se o eval avisar que o modelo ou as instrucoes do perfil mudaram, a comparacao nao vale. Rode o eval completo sem a mudanca, nas mesmas condicoes, e use esse run como linha de base. Se a mudanca nao passar, volte ao passo 6 ou descarte o candidato. Mudanca de comportamento so em texto fica aceita provisoriamente: o passo 2 da proxima retro a confirma.
8. **Registrar.** Acrescente ao registro uma linha por candidato decidido. Em `aceita`, anote a versao que `--skill` mostra antes da mudanca.
9. **Publicar.** Siga o fluxo de `send`: primeiro o PR do catalogo, com a skill e os casos de eval; depois o PR do checkout de perfis, com a nova referencia do submodulo.

**Atencao:** o passo 9 consome a permissao **Publicar** de `send`.

Ao encerrar, relate na conversa, por candidato:

- os numeros de uso com datas;
- as correcoes confirmadas nos transcripts;
- a causa;
- a mudanca feita ou o motivo do descarte;
- o eval antes e depois;
- o tamanho do texto antes e depois;
- os links dos PRs.

Relate tambem o acompanhamento das retros anteriores.
