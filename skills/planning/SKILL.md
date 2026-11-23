---
name: planning
description: Prepara analise, plano ou implementacao com causa raiz, desenho de contratos e escopo controlado. Use antes de analisar uma issue ou bug, planejar uma mudanca ou comecar a implementar; em mudanca trivial, aplique so os passos pertinentes.
---

# Planejamento

Chegue ao plano ou a implementacao com a causa entendida, a solucao mais simples de manter e o escopo fechado.

**Proibido**, sem autorizacao explicita: ampliar o escopo.

## 1. Causa e alcance

- Leia a issue ou o PR de origem com `github-issue-read`.
- Para uma mudanca, defina qual resultado observavel comprovara o comportamento pedido.
- Ao criar ou alterar um contrato, esboce seu uso no ponto de chamada real que motivou a mudanca. Mostre como o chamador usa o resultado e trata a falha relevante.
- Ao alterar um contrato compartilhado, identifique quais outros consumidores dependem do comportamento afetado, inclusive fora do diff.
- Identifique a camada responsavel e corrija a causa raiz, nao o sintoma.
- Em bug ou ajuste, procure o mesmo problema nos casos irmaos: outras modais e telas com o mesmo padrao, celular e desktop, e outros fluxos que produzem o mesmo efeito, como um fluxo deterministico e um conversacional. Relate o que encontrou, corrigido ou nao.
- Em refactor grande, mudanca arquitetural ou integracao nova, busque docs oficiais e referencias da comunidade antes de fechar a abordagem. Relate o que e vigente, o que se aplica ao repositorio e o que foi descartado.

### Quando a causa estiver em aberto

1. Isole um caso que manifesta o sintoma. Registre o esperado, o observado e a primeira fronteira em que os dois divergem. Se o estado recebido nessa fronteira for valido pelo contrato, a causa esta em quem o interpreta; se for impossivel, rastreie quem o produziu.
2. Formule uma hipotese que explique a divergencia. Antes de alterar codigo, escolha uma observacao cujo resultado possa derrubar a hipotese. Se houver explicacoes concorrentes, prefira uma verificacao que produza previsoes diferentes para elas.
3. Se a tentativa repetir o resultado anterior, registre o que ela descartou. Antes de repetir ou ajustar outro parametro, identifique qual fato novo a proxima tentativa pode revelar. Para resultados variaveis, defina o que a repeticao precisa medir.
4. Se nenhuma tentativa viavel distinguir as causas, preserve o melhor estado verificado. Relate o bloqueio especifico, as hipoteses restantes e o dado ou acesso necessario para decidir.

## 2. Solucao

- Prefira a solucao completa mais simples que preserve corretude, seguranca e manutencao. Equilibre simplicidade, desempenho, elegancia e custo total; nao maximize uma sacrificando as demais.
- Procure tipos, componentes e funcoes existentes antes de criar uma abstracao.
- Use patterns so quando reduzem complexidade real, melhoram clareza ou protegem invariantes. Evite abstracao especulativa, configuracao sem necessidade, interface de uma implementacao, wrapper vazio e infraestrutura imaginada.
- Antes de dependencia, servico ou infraestrutura, compare ganho com custo, lock-in, superficie de falhas e manutencao.
- Escolha banco, backend, hospedagem, framework e bibliotecas pelo problema, pelas restricoes e pelo custo total.
- Prefira tecnologia madura e previsivel quando o valor for equivalente.
- YAGNI nao bloqueia requisito real, seguranca, qualidade essencial ou correcao de causa raiz. Ideia ambiciosa com beneficio concreto vira proposta, nao escopo.
- Preserve compatibilidade, tratamento de erros, acessibilidade e protecao contra perda de dados.

### Quando houver uma decisao de desenho

Compare alternativas quando a escolha de contrato ou fronteira mudar o uso pelos chamadores, ou quando correcoes recorrentes indicarem responsabilidade mal definida.

1. Como em "Do chamador a regra" de `implementation`, siga uma entrada real do chamador e localize quem tem os dados, quem pode altera-los e onde uma falha chega ao consumidor.
2. Esboce dois desenhos plausiveis para a decisao em aberto. Inclua adaptar o contrato atual quando viavel. Mostre a mesma chamada e o mesmo caso de falha nos dois desenhos.
3. Compare quais invariantes cada desenho preserva, quais consumidores precisam mudar e quem tera de manter a solucao. Se a escolha depender de um fato desconhecido, proponha a menor observacao que distingue os desenhos. Execute-a quando o escopo permitir.
4. Recomende um desenho e explique o custo aceito. Durante a implementacao, se um consumidor real contrariar a premissa da escolha, reabra apenas essa decisao.

Em pedido de analise, apresente os esbocos na conversa.

## 3. Forma da entrega

- Mudanca visual nao trivial (tela nova, layout, fluxo ou animacao) entra no plano com mockup (`mockup`), consolidado no plano (`visual-plan`), e so e implementada depois da aprovacao do plano. Implemente direto apenas mudanca pequena, localizada e definida.
- Se o plano tiver validacao de UI, peca na mesma pergunta da aprovacao os pre-requisitos de ambiente de `verification`. Assim a entrega nao para depois esperando acesso ao ambiente.
