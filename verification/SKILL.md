---
name: verification
description: Comprova uma mudanca com a menor verificacao suficiente, criterio do que testar, validacao de UI e conformidade com o design system. Use antes de afirmar que algo funciona, antes de publicar e antes de declarar um PR pronto para merge.
---

# Verificacao

Comprove o comportamento atual com evidencia proporcional ao risco e declare o que rodou.

**Proibido:** afirmar funcionamento sem declarar a verificacao executada.

## 1. Testes

**Nota:** como rodar testes e as regras de teste do repositorio ficam no AGENTS.md dele, que prevalece. Esta secao cobre o criterio do que testar e quando rodar o gate local.

- Confira o resultado observavel definido no planejamento. Em bug, quando possivel, reproduza a falha e repita o mesmo cenario, em condicoes comparaveis, depois da correcao. Confira tambem um caso que ja funcionava e poderia regredir.
- Se outros consumidores dependerem do comportamento alterado, identifique a hipotese de compatibilidade em risco. Execute o menor teste ou fluxo de um desses consumidores que falharia se a hipotese fosse falsa. Relate o resultado observado.
- Ao comprovar melhora medida, siga [Medidas](../implementation/references/evidence.md).
- Escolha as verificacoes pelo comportamento e pelo risco. Siga os comandos e criterios de teste do repositorio.
- Se uma verificacao nao puder rodar, relate a limitacao e o risco residual.
- Se o repositorio tiver gate local, rode-o uma vez por publicacao: depois da revisao e do commit, imediatamente antes do push.
- Enquanto a revisao corrige achados, rode so lint, typecheck e os testes do que mudou.
- Se o gate falhar numa etapa, rode so o comando dessa etapa ate passar. Se a etapa for de testes, rode so os testes que falharam.
- Se a correcao mudar codigo alem de formatacao ou baseline, submeta o delta a nova revisao.
- Faca o commit da correcao antes de rodar o gate de novo.

## 2. Validacao de UI

- Antes de capturar tela, levante todos os pre-requisitos de ambiente (login no app, envs) e peca ao usuario, numa unica pergunta, os que ainda faltarem.
- Prefira validar UI no app real local, ja autenticado, entregando a URL antes de pedir validacao do usuario.
- Story (Storybook, Widgetbook ou outra ferramenta) e fonte aceita para mockup, print e validacao quando reproduz o comportamento do app real: dados no formato do contrato, estados e interacoes iguais aos do app. Se a story divergir do app, corrija a story ou valide no app; diga qual fonte usou.
- Comportamento que so existe em app nativo se valida em simulador, emulador ou dispositivo de teste, nao no navegador.

## 3. Conformidade com o design

Em toda mudanca visual, antes de entregar, confira os itens abaixo. Sem design system, confira contra os padroes existentes do app e da plataforma.

- Cada controle usa o componente do design system do projeto, nao um nativo ou estilizado do zero.
- Cores, tipografia, espacamento e raio vem dos tokens do projeto, nao de valores literais.
- Detalhes de interface que nao sao escolha de estilo (hierarquia e layout, tipografia, conteudo e estados, acessibilidade, motion e gesto) seguem a skill `design-guide`, nas areas que a mudanca toca; ela coloca o DS e os padroes do app acima dela, salvo o piso de acessibilidade.

Relate essa checagem no status, citando o que foi conferido, e inclua-a nas verificacoes do corpo do PR.
