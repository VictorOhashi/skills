---
name: design-guide
description: Guia agnostico de detalhes de design de interface, com hierarquia, espaco, tipografia, conteudo e estados, acessibilidade, motion e gestos. Use ao criar tela ou componente, ao revisar ou polir UI, quando algo parece amador, quebra com dados reais, ou parece lento, travado ou sem resposta. Tokens, componentes e estetica vem do design system do projeto.
---

# Guia de design

Interfaces que leem claro, aguentam dados reais e respondem na hora, ou uma revisao com achados ordenados por impacto. O guia da teoria e valores, destilados de Emil Kowalski e dos principios da Apple; a traducao para codigo segue a plataforma do projeto.

Em mudanca pequena, levante, construa e revise so as areas que a mudanca toca.

**Nota:** mudanca pequena e a que ajusta um componente ou uma tela existente sem criar fluxo novo.

## Precedencia

1. O design system do projeto (tokens, componentes, documentos de decisao) vence este guia.
2. Os padroes ja usados no app vencem este guia.
3. Este guia preenche o que nenhum dos dois define.
4. Os padroes da plataforma valem por ultimo.

Como aplicar:

- Padrao do app e um valor escolhido de proposito: esta num token, num helper compartilhado, num comentario que o justifica ou se repete em componentes vizinhos. Comentario que justifica a escolha conta como decisao documentada, inclusive no codigo do proprio design system.
- Default de biblioteca que ninguem escolheu (curva ou transicao que veio do gerador de componentes) nao e padrao do app, mesmo repetido.
- Token vale por propriedade: token de duracao nao define curva, e token de curva nao define duracao. Token cujo papel documentado cobre o caso vale como projeto, mesmo que os vizinhos nao o usem. Token de duracao que cobre abrir e fechar define tambem a saida; saida mais curta que ele vira sugestao ao projeto. Leia o papel pelo nome e pelo comentario do token, sem restringi-lo alem do que eles dizem.
- Sem token para a propriedade, vizinhos que a resolvem de formas diferentes equivalem a "projeto nao define".
- Ao revisar o proprio design system, tokens e decisoes documentadas continuam valendo como projeto. Valores de componente sem token nem decisao documentada sao revisaveis como qualquer codigo.
- Se um valor deste guia divergir do que o projeto define, siga o projeto e relate a divergencia no bloco Decisoes, como "sugestao ao projeto". A excecao e o piso de acessibilidade, abaixo. Valor que o projeto nao define nao e divergencia: e revisavel em Achados.
- Motion com decisao documentada que o guia reprovaria fica como o projeto decidiu. Vai em Decisoes como sugestao, nunca em Remover ou atenuar. Se a decisao descumpre um item do piso, o piso vence e o item vira Achado.
- Os itens de [accessibility.md](references/accessibility.md) marcados com criterio WCAG sao o piso e nao sao valor do guia. Abaixo deles e Achado, mesmo vindo de token ou decisao do projeto. A troca do token vai so na Correcao do Achado, como sugestao ao projeto, sem repetir em Decisoes. Os demais itens do arquivo seguem a precedencia.
- Nao escolha fonte, paleta ou estilo visual. O guia cuida de legibilidade, robustez e resposta, nao de estetica.
- Traduza principios e valores para a API da plataforma pela documentacao dela. Este guia nao traz codigo.

## Levantar o projeto

Antes de construir ou revisar, leia o que o projeto ja decidiu:

1. Tokens de cor, tipo, espaco, raio e motion, com o papel documentado de cada um.
2. Componentes do design system que cobrem o caso.
3. Documentos de decisao e convencao (DESIGN.md, DECISIONS, guias de convencao) e comentarios que justificam uma escolha no codigo.
4. Como os componentes vizinhos resolvem o mesmo problema (movimento reduzido, foco, truncamento, estados).

Relate em uma linha ou lista curta o que foi lido. O que nao foi encontrado vale como "projeto nao define".

## Construir

Percorra as areas na ordem.

1. **Hierarquia e layout.** Defina a coisa mais importante da tela e a acao principal antes de distribuir o resto. Detalhes em [layout.md](references/layout.md).
2. **Tipografia.** Monte a hierarquia com tamanho, peso e entrelinha juntos. Detalhes em [typography.md](references/typography.md).
3. **Conteudo e estados.** Projete com o dado mais longo, mais curto e ausente que o contrato permite, nao com o dado de demonstracao. Detalhes em [content.md](references/content.md).
4. **Acessibilidade.** Detalhes em [accessibility.md](references/accessibility.md).
5. **Motion e gesto.** Siga a secao Motion.
6. **Anti-padroes.** Percorra [anti-patterns.md](references/anti-patterns.md) antes de entregar.

O porque de Motion e os fundamentos de design estao em [principles.md](references/principles.md). Consulte-o quando um caso nao couber nos passos.

## Motion

Responda os passos na ordem, antes de escrever a animacao.

1. **Classifique a frequencia** pela tabela e pelas regras de [motion-values.md](references/motion-values.md#frequencia). O resultado e um de tres: nao anima, atenua ao quase imperceptivel ou anima. Com "nao anima", pule o resto desta secao.
2. **Nomeie o proposito.** Use um destes: feedback, consistencia espacial, indicacao de estado, evitar mudanca brusca, explicacao ou encanto. Encanto so cabe em momento raro (primeiro uso, vazio, sucesso). Sem proposito nomeado, nao anime e pule o resto desta secao.
3. **Defina a relacao espacial** pela consistencia espacial de [principles.md](references/principles.md#fluid-interfaces). Modal fica centrado. Avancar e voltar movem em direcoes opostas.
4. **Escolha o motor.** Mudanca de estado predeterminada usa duracao e curva. Gesto solto usa spring com a velocidade da soltura. O que pode ser interrompido usa spring ou transicao que parte do valor atual, nunca roteiro fixo. Valores em [motion-values.md](references/motion-values.md).
5. **Garanta resposta e interrupcao** pelos principios de [principles.md](references/principles.md#fluid-interfaces), de Resposta a Limites macios. Valores de gesto em [motion-values.md](references/motion-values.md#gesto).
6. **Coordene grupos** por [principles.md](references/principles.md#coreografia) e [motion-values.md](references/motion-values.md#grupos).
7. **Adapte** a movimento reduzido, som e haptica conforme [motion-values.md](references/motion-values.md#movimento-reduzido) e [principles.md](references/principles.md#feedback-multimodal).

Descreva efeitos ao usuario com os termos de [vocabulary.md](references/vocabulary.md).

## Revisar

Se o pedido nomeia areas, revise so elas e diga o que ficou fora; sem areas nomeadas, revise todas. Se acessibilidade esta no escopo e motion nao, motion entra so por movimento reduzido, hover so com ponteiro e loop sem alternativa.

Classifique pelo uso atual. Risco num contexto em que o componente ainda nao e usado vai em Decisoes. Na web, uso atual inclui toque quando o produto em uso aceita toque. Sem evidencia no repositorio de uso em toque, ou de uso fora de prototipo, o contexto nao conta como uso atual; relate a suposicao em Decisoes. Vale tambem para a frequencia de Motion.

Os passos 2 e 4 pertencem a Conteudo e estados; em escopo que nao inclui essa area, pule-os.

1. Delimite telas, componentes e fluxos.
2. Para cada valor que o componente mostra, anote fonte, tipo, limite do contrato e se e opcional. Valor sem limite que o layout nao absorve e achado **Fragil**.
3. Confira cada area de Construir contra a referencia dela e [anti-patterns.md](references/anti-patterns.md).

**Atencao:** o passo 4 edita o repositorio e exige **Corrigir localmente** de `send`.

4. Monte o pior caso de [content.md](references/content.md#pior-caso) ao lado do dado de demonstracao, pela mesma fronteira (fixture, mock, story). Nao o substitua, nao edite o componente para forcar a quebra e nao crie nem altere story coberta por regressao visual. Fixture criada fica no PR so se o usuario pedir. Sem **Corrigir localmente**, raciocine pelo codigo e marque o achado como inferido.
5. Observe nos ambientes de [content.md](references/content.md#ambiente) ligados as areas do escopo, pela validacao de UI de `verification`. Sem app rodando ou sem ferramenta de captura, infira pelo codigo e marque o achado como inferido.
6. Se motion esta no escopo, passe cada animacao, transicao e gesto pelos passos 1 e 2 de Motion. Manter sem ajuste leva a Mantido; animacao mantida com ajuste vai so em Achados; atenuar ou remover leva ao bloco Remover ou atenuar. A triagem em si nao entra na saida.
7. Relate antes de corrigir.

Severidade, da maior para a menor:

| Severidade | Sentido |
| --- | --- |
| **Quebra** | Bloqueia uma acao, esconde ou corta conteudo, mostra dado errado ou impede o acesso (teclado sem alcance, leitor de tela sem informacao essencial, texto essencial abaixo do contraste AA, movimento de tela inteira, parallax, zoom ou loop amplo, persistente ou de fundo sem alternativa de movimento reduzido). |
| **Atrito** | Funciona, mas parece lento, confuso ou sem resposta, ou descumpre uma regra de acessibilidade sem impedir o acesso (por exemplo, deslize de componente sem alternativa de movimento reduzido, metadado de apoio abaixo do contraste). Em motion, e Atrito o que atrasa a resposta: ease-in ou ease-in-out em entrada, saida tao lenta quanto a entrada quando o projeto nao define a saida, duracao acima do teto, entrada bloqueada. |
| **Polimento** | Funciona, mas um detalhe destoa do resto. Em motion, curva, familia de tempo ou propriedade que destoa sem atrasar a resposta. |
| **Fragil** | Funciona hoje, mas um dado real plausivel quebra (sem limite, sem fallback), ou o contrato permite omitir algo essencial (rotulo acessivel ou texto de estado opcional). |

Texto essencial e o que o usuario precisa para entender ou agir: titulo, valor, rotulo de acao, erro. Dentro do mesmo nivel, ordene pelo alcance: mais telas e mais usuarios primeiro.

## Saida

Em revisao, abra com o escopo revisado e o que ficou fora. Diga o que foi lido do projeto, em uma linha ou lista curta. Diga os limites: o que foi observado e o que foi inferido.

Depois, entregue quatro blocos. Bloco sem conteudo ou fora do escopo diz "nada". Nao ponha em Achados o que nao e achado. Cada animacao aparece num so bloco: animacao atenuada ou removida leva ao bloco 3 todas as correcoes dela, inclusive de movimento reduzido e de propriedades.

1. **Achados:** tabela `# | Severidade | Onde | Achado | Principio | Evidencia | Correcao`, na ordem de severidade acima. `Onde` traz `arquivo:linha` quando houver codigo. `Principio` cita `arquivo#secao` da referencia. `Evidencia` diz observado (visto rodando: app, story, captura) ou inferido (leitura de codigo).
2. **Decisoes:** tabela `# | Decisao | Opcoes | Recomendacao`, com o que tem mais de uma resposta certa e as sugestoes ao projeto. Primeiro o que bloqueia o trabalho. Item do piso nunca vai aqui.
3. **Remover ou atenuar:** so motion cujo resultado nos passos 1 e 2 de Motion foi remover ou atenuar, com o motivo e todas as correcoes dele. A remocao retira tambem o estado inicial oculto e o que espera o fim da animacao (callback, timer, foco).
4. **Mantido:** o que ja segue o guia, incluindo motion mantido, para ninguem mexer.

Em construcao e em plano sem codigo, entregue as decisoes de design, sem os blocos Remover ou atenuar e Mantido:

1. O que foi lido do projeto, em uma linha ou lista curta.
2. Por area tocada, as decisoes tomadas, uma por linha, com o valor aplicado para quem vai implementar. Valor que vem do guia cita a referencia (`arquivo#secao`); valor que vem do projeto cita o token ou a decisao. Os anti-padroes percorridos viram uma linha.
3. **Achados**, so com itens do piso que o projeto descumpre, no formato da revisao.
4. **Decisoes**, no formato da revisao.
5. Em plano sem codigo, as perguntas de produto abertas, primeiro as que bloqueiam o desenho.

Ao verificar uma mudanca implementada, siga Revisar nas areas que a mudanca toca, sem editar o repositorio para montar o pior caso: raciocine pelo codigo e marque inferido. Relate uma linha por area com o que foi conferido, seguida da tabela de Achados quando houver; Decisoes so quando houver. Nao entregue os blocos Remover ou atenuar e Mantido: motion a remover ou atenuar entra como linha de Achados, com a correcao, e a frequencia de Motion so aparece nessa linha. Problema que ja existia no arquivo e nao veio da mudanca entra com "preexistente" na coluna Severidade e nao e corrigido nesta mudanca.
