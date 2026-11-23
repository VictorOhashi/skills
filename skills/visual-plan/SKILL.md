---
name: visual-plan
description: Apresenta planos com decisoes ja recomendadas, comparacoes nao visuais pedidas, diagnosticos e status de trabalho como diagramas, tabelas ou quadros, com pouco texto de apoio. Use em pedidos de plano, "me ajude a visualizar", "onde paramos", "falta algo?" e ao fechar uma entrega com quadro de status.
---

# Planos, diagnosticos e status visuais

Uma tela que responde "o que vai ser feito", "onde paramos" e "falta algo?" sem leitura corrida. Planos seguem um caminho unico, com as recomendacoes ja aplicadas. Limites de texto de apoio e ordem da resposta seguem o perfil.

**Proibido:** apresentar como feito um item sem verificacao, ou uma proposta como trabalho concluido.

Apresentar um visual nao muda as permissoes da tarefa: analise continua sem edicoes, e uma implementacao ja autorizada nao ganha exigencia de aprovacao so por usar quadro ou diagrama.

## Escolha do visual

| Conteudo | Formato |
| --- | --- |
| Plano com etapas e dependencias | Diagrama com sequencia, dependencias e etapas que podem ocorrer em paralelo. |
| Decisao de abordagem | Linha D no topo; ver o formato abaixo. |
| Comparacao nao visual pedida pelo usuario (bibliotecas, servicos, abordagens) | Tabela com efeito concreto, trade-off e recomendacao. |
| Diagnostico | Diagrama de sintoma, evidencias e causa; marque hipoteses e a verificacao que falta. |
| Andamento e entrega | Quadro de andamento, abaixo. |
| Mudanca visual nao trivial | Use o resultado de `mockup`. No plano, cite o link e a opcao recomendada (ou escolhida) de cada tela, sem redesenhar. |

Use o menor formato que esclareca o pedido. Diagramas pequenos podem ser Mermaid no chat; tabelas funcionam sem ferramenta adicional. Use visual interativo quando a interacao ajudar a explorar. Nao gere HTML apenas para substituir uma tabela suficiente.

Etapas tem nomes curtos e efeito concreto para quem usa ou mantem; arquivos e siglas nao sao titulos. Detalhes tecnicos ficam abaixo do visual ou recolhidos, sem repetir o visual em prosa. Decisoes abertas aparecem no topo, uma linha cada: "D1: A (recomendado), porque...". As alternativas descartadas ficam numa linha recolhida "consideradas", com o motivo. O caminho segue a recomendacao ate o usuario dizer outra coisa. Em plano ainda nao executado, use etapas previstas. Termine com o proximo passo, dizendo a acao e de quem ela e.

## Quadro de andamento

1. **Decisoes e bloqueios do usuario:** faixa no topo com as decisoes abertas (D1...) e o que depende do usuario. Sem pendencias, a faixa some.
2. **Um cartao por etapa ou item da issue**, confrontando o pedido ou a issue item a item:
   - titulo curto e area afetada (UI, dados, API...);
   - status: **feito**, **em andamento**, **aguardando** (condicao externa, dizendo qual: CI, review, saida de draft, condicao extra do perfil, merge...), **bloqueado** (decisao, permissao, falha persistente ou limite, dizendo qual) ou **pendente** (nao iniciado);
   - estados de outras skills, pelo mapa abaixo;
   - uma linha do que muda, em linguagem de produto;
   - como foi verificado;
   - link do PR e estado dos checks e do merge, quando existir; em mudanca de tela, link do mockup aprovado, quando houver, e dos prints anexados ao PR ou "prints pendentes"; sem mudanca de tela, "sem mudanca visual".
3. **Proximo passo:** uma linha no fim.

| Estado de origem | Status no quadro |
| --- | --- |
| **Pronto para merge** (`send`) | aguardando (merge) |
| **Aguardando** (`send`) | aguardando (a condicao) |
| **Bloqueado ou limite atingido** (`send`) | bloqueado (o motivo) |
| **Fechado ou mergeado** (`send`) | feito (mergeado) ou bloqueado (fechado sem merge) |
| **Escalado** (`validation-loop`) | bloqueado (decisao do usuario) |

## Apresentacao

- Status pela palavra; cor so reforca o status, com legenda: neutro para pendente e em andamento, uma cor para feito e outra para aguardando ou bloqueado.
- Em tarefa longa, mantenha o mesmo quadro entre turnos (mesmas etapas e IDs, status atualizados); nao abra um quadro paralelo.
- Apresente pelo recurso visual da secao da harness. Sem ele, use Mermaid ou tabela markdown, conforme a Escolha do visual, so com as colunas pertinentes ao pedido.
