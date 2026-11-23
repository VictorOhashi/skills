---
name: implementation
description: Orienta correcao de causa raiz, tipagem forte, migracao de legado e evolucao do desenho pelo uso real. Use ao escrever ou alterar codigo para implementar uma funcionalidade, corrigir um bug ou refatorar.
---

# Implementacao

Entregue o comportamento pedido pelo caminho que o produto usa. Aplique os criterios abaixo conforme as decisoes que a mudanca exigir.

## Criterios de implementacao

- Em bug, corrija a causa identificada em `planning`. Aplique um contorno temporario (workaround) somente quando o usuario pedir explicitamente. Nesse caso, relate o sintoma mitigado e a causa pendente.
- Expresse as garantias do dominio no sistema de tipos da linguagem. Faca o verificador detectar combinacoes invalidas, argumentos trocados e variantes esquecidas sempre que ele puder.
- Ao incorporar um requisito ou substituir um contrato interno, siga [Ao mudar uma interface](references/design.md#ao-mudar-uma-interface).
- Prefira compor funcoes puras sobre dados imutaveis. Concentre leitura, escrita e chamadas externas nas bordas. Mantenha dependencias explicitas. Documente o motivo de uma excecao arquitetural intencional.

## Do chamador a regra

1. Comece pelo chamador que precisa da mudanca. Acompanhe uma entrada concreta ate o resultado ou a falha que ele observa.
2. Localize quem tem os dados e a autoridade para garantir a regra e quem pode altera-los. Se dois chamadores repetem a mesma sequencia obrigatoria, concentre-a nesse ponto.
3. Implemente primeiro um caso de ponta a ponta. Exercite-o antes de estender a mudanca aos demais casos pedidos. Se o resultado contrariar a causa presumida, siga "Quando a causa estiver em aberto" de `planning`.

## Referencias por decisao

- Ao receber dados externos ou alterar tipos, fronteiras, dependencias ou contratos compartilhados, leia [Desenho pelo uso](references/design.md).
- Quando houver persistencia, falha parcial, repeticao ou concorrencia, leia [Estado e efeitos](references/state.md).
- Quando a escolha depender de uma medicao de desempenho, leia [Medidas](references/evidence.md).
- Ao escrever ou alterar testes, corrigir um bug com reproducao local barata ou atender a pedido de TDD, leia [Testes de comportamento e TDD](references/tdd.md).

## Comentarios e documentacao

Prefira nomes, tipos e fluxo que mostrem o que acontece. Comente o motivo de uma decisao, uma invariante ou uma restricao externa quando o leitor precisaria redescobri-la. Atualize contratos publicos, instrucoes operacionais e comentarios afetados pela mudanca. Evite repetir em texto o que o codigo ou o manifesto ja responde.
