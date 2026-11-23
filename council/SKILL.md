---
name: council
description: Conselho de revisores que da nota a um trabalho longo por uma rubrica fixa e conduz rodadas de correcao ate a nota alvo do usuario. Tarefa propria, cara; use somente quando o usuario invocar a skill ou pedir explicitamente um conselho. Mencionar ou editar a skill nao a ativa.
---

# Conselho

Leve um trabalho a uma nota alvo com avaliacao independente: voce fecha o escopo com o usuario; um avaliador define a rubrica e a nota inicial; dois revisores, um depois do outro, dao nota a cada rodada; so voce corrige.

**Proibido:** mudar rubrica ou pesos depois da abertura; deixar um revisor editar arquivos; colocar IDs da revisao (P1, V4...) em codigo, commit ou PR.

## Ativacao e permissoes

O conselho e uma tarefa propria, aberta so quando o usuario a pede. O pedido de avaliacao preserva os limites de edicao e publicacao do perfil. Submeta novas decisoes visuais ao usuario. Antes de comecar, relate o custo: cada rodada e uma avaliacao completa do revisor da secao da harness.

## Papeis

- **Orquestrador (voce):** delimita, captura evidencias, corrige, salva os resultados e fala com o usuario.
- **Avaliador inicial:** define a rubrica e da a nota inicial. Nao volta depois.
- **Revisor A:** reavalia a cada rodada, retomado com o historico das proprias avaliacoes, ate a nota alvo.
- **Revisor B:** comeca depois que A atinge o alvo, sem ler nenhuma avaliacao anterior, com a mesma rubrica. Ele mede o quanto A se ancorou nas proprias notas.

Os tres usam o revisor da secao da harness, cada um como agente novo. Revisores so leem e devolvem o resultado na resposta; voce salva cada resposta na pasta de artefatos da rodada.

## 1. Abertura

**Atencao:** comece as rodadas so depois de o usuario confirmar escopo, rubrica e nota alvo.

1. **Escopo.** Com o usuario, feche: o que entra (telas, fluxos, modulos, documentos), superficies e tamanhos, o que fica de fora, decisoes ja tomadas e a fonte das evidencias. Registre no `manifest.json` da execucao.
2. **Evidencias.** Capture o estado atual na pasta da rodada `r0/` (prints, logs, diff). Use a fonte da validacao de UI de `verification`.
3. **Avaliacao inicial.** O avaliador devolve:
   - rubrica: criterios com id, peso (soma 100) e ancoras de nota 10, 6 e 3;
   - nota por criterio e nota geral ponderada;
   - nota por grupo, quando o escopo tiver grupos;
   - problemas com id, criterio, severidade, evidencia (arquivo e linha ou print e regiao) e ganho estimado;
   - decisoes abertas, com opcoes e recomendacao;
   - nota projetada se os problemas principais forem corrigidos, e o teto alcancavel.
4. **Alvo.** Mostre rubrica, notas e problemas com `visual-plan`, problemas marcados sobre a evidencia. O usuario confirma ou ajusta a rubrica, escolhe a nota alvo e as decisoes abertas. Depois disso, escopo e rubrica ficam fixos.

   **Atencao:** se o escopo mudar antes dessa confirmacao, ou se o usuario pedir outro escopo ou rubrica depois dela, abra uma nova execucao, com novo `r0/` e novo avaliador inicial.

## 2. Rodadas

1. **Tratar.** Trate os problemas por ganho estimado, dentro do escopo. Rode a skill `verification` para cada correcao.

   **Atencao:** problema que pede decisao de produto, de desenho ou de outro dono vai para o usuario antes da correcao. A decisao tomada entra no briefing e nao pesa mais na nota.
2. **Recapturar.** Capture as evidencias da rodada (`a1/`, `a2/`..., depois `b1/`...) depois de todas as edicoes, com o HEAD no manifest. Evidencia anterior a uma edicao invalida a rodada.
3. **Avaliar.** Envie ao revisor da vez: escopo, rubrica, decisoes do usuario, pasta de evidencias, HEAD e o que mudou. Na primeira rodada do Revisor B, envie so escopo, rubrica, decisoes do usuario, pasta de evidencias e HEAD, sem ids, notas ou lista do que mudou. Na primeira rodada do Revisor A, inclua os problemas da avaliacao inicial; o status vale para esses ids. Ele devolve:
   - nota por criterio e geral, com o motivo de cada mudanca;
   - nota por grupo, quando o escopo tiver grupos;
   - status de cada id anterior dele: `resolved`, `partial`, `open`, `out`;
   - problemas novos e regressoes;
   - lista "para chegar ao alvo", com ganho estimado, e o teto que considera alcancavel sem reabrir decisoes;
   - evidencias defasadas ou ausentes.
4. **Decidir.**
   - Abaixo do alvo, sem impasse: volte ao passo 1 com o mesmo revisor.
   - Revisor A no alvo: passe para o Revisor B.
   - Revisor B no alvo: encerre.
   - Teto abaixo do alvo, 4 rodadas do mesmo revisor ou nota parada por 2 rodadas: pare e traga o impasse ao usuario, com o que reabriria o teto.

## 3. Encerrar

Feche com `visual-plan`: notas de cada revisor por rodada, comparacao antes e depois da avaliacao inicial ate a final, problemas resolvidos e abertos, decisoes e proximo passo.
