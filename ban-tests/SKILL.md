---
name: ban-tests
description: Revisao independente da cobertura de testes em um diff, proposta ou conjunto de arquivos. Use quando o pedido for auditar regressoes distintas, duplicacao e testes exclusivos de tooling interno.
---

# Testes de regras do produto

Execute `audit` com os criterios abaixo e o revisor da secao da harness.

## Criterios do parecer

- Entregue ao revisor os [criterios de cobertura](../implementation/references/tdd.md#cobertura-que-vale-manter). Para cada teste questionado, identifique a regra do produto e a regressao que ele detecta.
- Ao sugerir consolidacao, compare os testes sob a mesma falha. Cite qual deles continuaria detectando cada regressao.
- Para cada exclusao, indique qual teste preserva a cobertura ou por que nenhuma regra do produto esta envolvida. Falha legitima do produto pede correcao antes de remover o teste.
