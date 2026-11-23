---
name: ban-bad-pattern
description: Audita e corrige padroes de desenho, convencoes locais e uso de ferramentas em um diff ou area indicada. Use quando o pedido for investigar desvios de arquitetura, abstracoes que dificultam o uso e ferramentas aplicadas fora do contrato.
---

# Revisao de padroes

Execute `audit` com os criterios abaixo e o revisor da secao da harness. Para cada achado, mostre a decisao no codigo e seu efeito no chamador, na manutencao ou no fluxo de trabalho.

- **Convencao local.** Cite a regra vigente, decisao de arquitetura ou configuracao aplicavel ao trecho. Se a convencao for inferida, mostre um caso analogo e verifique se a diferenca tem justificativa.
- **Padrao de projeto.** Siga um uso concreto. Uma camada que so repassa chamadas pode esconder uma fronteira publica necessaria. Uma estrategia pode eliminar uma decisao repetida ou apenas multiplicar classes. Indique o que o chamador ganha com a menor correcao.
- **Uso de ferramenta.** Confira a versao e o comando, API ou configuracao que o projeto usa. Mostre qual garantia se perde, como ignorar o lockfile ou contornar a validacao do workspace. Reaproveite diagnosticos existentes.
- Confira se a alternativa preserva o requisito e os casos legitimos. Quando houver apenas preferencia de estilo e nenhuma convencao ou consequencia demonstravel, descarte o achado.
- Se houver reincidencia ou uma correcao explicita do usuario indicar uma classe de erro, inclua a prevencao na proposta. Quando autorizada, use `correct-repo` com o caso confirmado e um uso valido que a protecao deve preservar.
