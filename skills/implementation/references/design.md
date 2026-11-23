# Desenho pelo uso

- Use os nomes do dominio e as convencoes do repositorio. Conceitos com efeitos diferentes merecem nomes distintos.
- Valide dados externos na entrada com os recursos que o projeto ja usa. Converta-os em tipos internos precisos. Modele estados mutuamente exclusivos de forma que o codigo so consiga construir combinacoes validas.
- Derive tipos do schema que define o contrato. Se trocar dois identificadores do mesmo tipo primitivo mudar o significado da operacao, use tipos distintos quando a linguagem permitir. Ao consumir um conjunto fechado de variantes, use verificacao exaustiva para que uma variante nova revele os casos pendentes.
- Aproveite a inferencia da linguagem. Ao precisar contornar o sistema de tipos, limite a excecao ao ponto onde a garantia possa ser demonstrada.
- Exponha uma operacao que o chamador consiga usar corretamente sem conhecer a ordem de passos internos. Antes de extrair uma abstracao, identifique a regra ou complexidade que ela retira dos consumidores.
- Em projeto novo, separe dominio, dados, apresentacao e codigo comum conforme surgirem responsabilidades distintas. Agrupe por funcionalidade quando isso aproximar codigo que muda junto.

## Ao mudar uma interface

1. Pergunte como desenharia a parte afetada se o requisito existisse desde o inicio e onde ele altera uma premissa do desenho atual. Se o contrato ja o comporta, preserve a estrutura. Se cada consumidor precisar de uma excecao igual, reveja quem deveria garantir a regra.
2. Localize os usos do contrato anterior, inclusive registros dinamicos, exemplos e testes. Migre os chamadores sob controle do projeto dentro do escopo da tarefa e exercite o novo contrato pela entrada real. Consumidor ou codigo de outro dono fora do escopo vira proposta, nao edicao.
3. Remova adaptadores, flags e ramificacoes que so serviam ao caminho substituido. Se consumidores externos, versoes suportadas ou dados persistidos ainda dependerem dele, mantenha a compatibilidade necessaria e identifique o que permite retira-la.
4. Confira se tipos, exemplos, documentacao e decisoes de desenho existentes ainda descrevem o comportamento entregue. Atualize os trechos afetados.

Ao encontrar duas representacoes do mesmo fato, identifique qual delas tem autoridade. Derive a outra quando viavel. Se uma nova variante exige editar condicionais em varios consumidores, represente a escolha no tipo que possui a regra. Uma transicao invalida deve falhar onde o estado e criado.

Antes de adicionar uma camada, experimente retirar a indirecao que obriga o leitor a percorrer arquivos. Preserve fronteiras que isolam uma dependencia externa ou garantem um contrato. Em uma migracao repetitiva, valide a primeira conversao em um chamador real antes de automatizar as demais.
