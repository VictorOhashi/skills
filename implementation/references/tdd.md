# Testes de comportamento e TDD

## Cobertura que vale manter

- Antes de adicionar um teste, nomeie a regressao de produto que ele detecta e procure cobertura existente. Preserve testes com entradas parecidas quando falharem por motivos diferentes.
- Prefira um teste de integracao pela entrada real, com os colaboradores internos reais. Isole dependencias externas quando necessario. Use testes unitarios para regras isoladas cujos limites a integracao cobre mal.
- Derive o resultado esperado de um exemplo conhecido ou do contrato. Repetir o calculo da implementacao na assercao reproduz o mesmo erro.
- Reserve testes permanentes para comportamento do produto. Um comando entregue ao usuario tem contrato testavel. Um script auxiliar exclusivo do desenvolvimento pode ser exercitado diretamente.

## Ciclo de desenvolvimento guiado por testes

Use o ciclo quando o pedido exigir TDD ou quando uma falha tiver reproducao local barata e estavel.

1. Escolha um comportamento observavel. Use primeiro a cobertura existente. Quando faltar uma regressao de produto que valha manter, escreva o menor teste que a detecte. Para uma reproducao pontual, basta uma verificacao executavel.
2. Rode o caso antes de editar o produto. Confira a falha exata. Se ele ja passar ou falhar por outro motivo, ajuste a reproducao.
3. Corrija a regra pela entrada usada pelo produto. Rode o mesmo caso, com a mesma expectativa. Preserve as assercoes de comportamentos que continuam exigidos.
4. Com o caso passando, simplifique o trecho alterado quando isso melhorar a leitura. Rode o caso outra vez e exercite o comportamento vizinho em risco. Repita o ciclo se faltar outro comportamento pedido.

Em falha intermitente, controle a condicao relevante, como o relogio ou a ordem das entregas. Se a reproducao exigir infraestrutura desproporcional ou mocks que simulem a propria regra, use o fluxo executavel mais proximo. Relate o que observou antes e depois e qual evidencia faltou.

Para avaliar a assercao, imagine o produto omitindo o efeito esperado. O teste deve falhar. Depois imagine trocar apenas a implementacao interna. Com o contrato preservado, o teste deve continuar passando.
