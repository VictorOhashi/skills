---
name: ui-principles
description: Principios de bom design de interface para desenhar e revisar telas, fluxos e componentes, com trabalho da tela, hierarquia, layout, tipografia, cor, estados, texto, interacao, acessibilidade e motion. Use ao desenhar tela, fluxo ou componente, ao revisar ou polir UI, ou quando a interface parece amadora, generica ou confusa, quebra com dados reais ou responde devagar. Tokens, componentes e estetica vem do design system do projeto.
---

# Principios de design de interface

Telas em que o mais importante e obvio, que aguentam dados reais e respondem na hora; em revisao, achados ordenados por impacto. As regras destilam heuristicas consolidadas (Nielsen, Gestalt, leis de UX, WCAG, Apple, Material), listadas em [sources.md](references/sources.md).

Mudanca pequena aplica so os passos e as areas que ela toca.

**Nota:** mudanca pequena e a que ajusta um componente ou uma tela existente sem criar fluxo novo.

## Precedencia

1. O design system do projeto (tokens, componentes, documentos de decisao) vence esta skill.
2. Os padroes ja usados no app vencem esta skill.
3. Esta skill preenche o que os dois nao definem.
4. Os padroes da plataforma valem por ultimo.

Como aplicar:

- Padrao do app e um valor escolhido de proposito: esta num token, num helper compartilhado, num comentario que o justifica ou se repete nos componentes vizinhos. Default de biblioteca que ninguem escolheu nao e padrao do app, mesmo repetido.
- Token vale pela propriedade e pelo papel que o nome e o comentario dele declaram. Sem token para a propriedade, vizinhos que divergem equivalem a "projeto nao define".
- Se uma regra desta skill divergir do projeto, siga o projeto e relate a divergencia em Decisoes, como "sugestao ao projeto". Valor que o projeto nao define nao e divergencia: e revisavel em Achados.
- Os itens de [accessibility.md](references/accessibility.md) com criterio WCAG sao o piso. Abaixo deles e Achado, mesmo vindo de token ou decisao do projeto; a troca do token vai na Correcao.
- Nao escolha marca: fonte, paleta e estilo visual sao do projeto. Sem design system, use poucos tokens por papel ([color.md](references/color.md#tokens-por-papel)) e relate a escolha em Decisoes.
- Traduza as regras para a API da plataforma pela documentacao dela. Esta skill nao traz codigo.

## Desenhar

1. **Levante o projeto.** Leia, nesta ordem:
   - tokens de cor, tipo, espaco, raio e motion, com o papel de cada um;
   - componentes do design system que cobrem o caso;
   - documentos de decisao (DESIGN.md, guias de convencao) e comentarios que justificam uma escolha;
   - como os componentes vizinhos resolvem o mesmo problema.

   O que nao for encontrado vale como "projeto nao define".
2. **Defina o trabalho da tela.** Escreva uma frase para cada item: quem usa, em que contexto e dispositivo, a tarefa, a informacao mais importante e a unica acao principal. Se duas informacoes ou duas acoes competem, escale: a decisao e de produto. Fundamento em [principles.md](references/principles.md#proposito).
3. **Liste os estados** pelo catalogo de [states.md](references/states.md#catalogo).
4. **Estruture antes de estilizar.** Percorra as areas na ordem:
   1. hierarquia e layout: [layout.md](references/layout.md);
   2. tipografia: [typography.md](references/typography.md);
   3. cor: [color.md](references/color.md);
   4. texto: [writing.md](references/writing.md);
   5. interacao e feedback: [interaction.md](references/interaction.md);
   6. acessibilidade: [accessibility.md](references/accessibility.md).
5. **Use so pecas do design system.** Componente novo, cor nova ou valor fora da escala vira Decisao, nunca valor literal na tela.
6. **Decida o motion**, se algo se move, pela secao Decidir de [motion.md](references/motion.md#decidir).
7. **Projete com o pior caso** de [states.md](references/states.md#pior-caso), nao com o dado de demonstracao.
8. **Faca a autocritica.** Renderize nos ambientes de [states.md](references/states.md#ambiente) que a mudanca toca, pela validacao de UI de `verification`. Responda:
   - O que se ve primeiro?
   - E a informacao mais importante do passo 2?
   - A acao principal e obvia?

   Confira cada area do passo 4 pela referencia dela, o motion pela secao Decidir de [motion.md](references/motion.md#decidir) e os [padroes genericos](references/principles.md#padroes-genericos). Corrija o que estiver dentro do escopo e renderize de novo. Sem como renderizar, raciocine pelo codigo e marque o resultado como inferido.

## Revisar

Se o pedido nomeia areas, revise so elas e diga o que ficou fora. Sem areas nomeadas, revise todas.

Classifique pelo uso atual. Risco num contexto em que o componente ainda nao e usado vai em Decisoes. Sem evidencia no repositorio de uso em toque ou fora de prototipo, o contexto nao conta como uso atual; relate a suposicao em Decisoes.

1. Delimite telas, componentes, fluxos e estados. Levante o projeto e o trabalho da tela pelos passos 1 e 2 de Desenhar.
2. Renderize e responda as perguntas do passo 8 de Desenhar. Sem app rodando ou sem captura, infira pelo codigo e marque o achado como inferido.
3. Confira se cada controle usa o componente do design system e cada valor vem de token, pelo passo 5 de Desenhar. Depois, confira cada area pela referencia dela, o motion pela secao Decidir de [motion.md](references/motion.md#decidir) e os [padroes genericos](references/principles.md#padroes-genericos), em cada estado que a tela mostra, nao so no padrao.
4. Para cada valor exibido, anote fonte, tipo, limite do contrato e se e opcional, pelas regras de [states.md](references/states.md#pior-caso).

**Atencao:** o passo 5 edita o repositorio e exige **Corrigir localmente** de `send`.

5. Monte o pior caso de [states.md](references/states.md#pior-caso) ao lado do dado de demonstracao, pela mesma fronteira (fixture, mock, story). Nao edite o componente para forcar a quebra e nao altere story coberta por regressao visual. Fixture criada fica no PR so se o usuario pedir. Sem **Corrigir localmente**, raciocine pelo codigo e marque o achado como inferido.
6. Relate antes de corrigir. Correcao em componente compartilhado afeta todas as telas que o usam: nomeie essas telas.

Severidade, da maior para a menor:

| Severidade | Sentido |
| --- | --- |
| **Quebra** | Bloqueia uma acao, esconde ou corta conteudo, mostra dado errado ou impede o acesso: teclado sem alcance, leitor de tela sem informacao essencial, texto essencial abaixo do contraste AA, movimento amplo ou persistente sem alternativa reduzida. |
| **Atrito** | Funciona, mas parece lento, confuso ou sem resposta, ou descumpre regra de acessibilidade sem impedir o acesso. Inclui layout que salta, feedback atrasado, acao principal ambigua e motion que atrasa a resposta. |
| **Polimento** | Funciona, mas um detalhe destoa: alinhamento, espaco fora da escala, curva ou peso que difere dos vizinhos. |
| **Fragil** | Funciona hoje, mas um dado real plausivel quebra (sem limite, sem fallback), ou o contrato permite omitir algo essencial, como rotulo acessivel. |

Texto essencial e o que o usuario precisa para entender ou agir: titulo, valor, rotulo de acao, erro. Dentro do mesmo nivel, ordene pelo alcance: mais telas e mais usuarios primeiro.

## Saida

Em revisao, abra com o escopo revisado, o que ficou fora, o que foi lido do projeto e o que foi observado ou inferido. Depois, entregue tres blocos. Bloco vazio diz "nada".

1. **Achados:** tabela `# | Severidade | Onde | Achado | Principio | Evidencia | Correcao`, na ordem de severidade. `Onde` traz `arquivo:linha` quando houver codigo. `Principio` cita `arquivo#secao` da referencia. `Evidencia` diz observado (visto rodando) ou inferido (leitura de codigo). Motion a remover ou atenuar entra aqui, com o motivo na Correcao; remover inclui o estado inicial oculto e o que espera o fim da animacao (callback, timer, foco).
2. **Decisoes:** tabela `# | Decisao | Opcoes | Recomendacao`, com o que tem mais de uma resposta certa e as sugestoes ao projeto. Primeiro o que bloqueia o trabalho. Item do piso nunca vai aqui.
3. **Mantido:** o que ja segue os principios, para ninguem mexer.

Em desenho, com ou sem codigo, entregue:

1. O que foi lido do projeto, em uma linha ou lista curta.
2. O trabalho da tela, com as frases do passo 2.
3. Os estados do passo 3.
4. Por area, as decisoes tomadas, uma por linha, com o valor aplicado. Valor desta skill cita `arquivo#secao`; valor do projeto cita o token ou a decisao.
5. **Achados** (so itens do piso que o projeto descumpre) e **Decisoes**, no formato da revisao.
6. As perguntas de produto abertas, primeiro as que bloqueiam o desenho.

Ao verificar uma mudanca implementada, siga Revisar nas areas e no motion que a mudanca toca, sem o passo 5. Relate uma linha por area com o que foi conferido, seguida de Achados e Decisoes quando houver. Problema que ja existia e nao veio da mudanca entra com "preexistente" na coluna Severidade e nao e corrigido nesta mudanca.
