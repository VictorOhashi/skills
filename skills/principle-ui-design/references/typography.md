# Tipografia

Legibilidade que vale para qualquer fonte. A escolha da fonte e da escala de tipo e do projeto; sem escala, siga os padroes do app e os da plataforma.

## Hierarquia

- Monte cada nivel com tamanho, peso e entrelinha juntos, nao so com tamanho.
- Enfatize com peso antes de aumentar o tamanho.
- Poucos niveis: titulo, corpo e apoio costumam bastar numa tela. Cada nivel novo precisa de motivo.
- Uma familia, ou duas claramente distintas. Duas parecidas parecem erro.
- Caixa alta so em rotulo curto, com tracking levemente aberto. Nunca em frase.

## Medida e entrelinha

- Linha de leitura entre 45 e 75 caracteres; cerca de 65 e o alvo.
- Entrelinha anda ao contrario do tamanho: corpo entre 1.4 e 1.6, titulo grande entre 1.05 e 1.2.
- Scripts com acentos empilhados ou altos (vietnamita, tailandes, devanagari) pedem entrelinha maior. Nunca corte texto com altura fixa.

## Quebra de linha

- Equilibre titulos de varias linhas e evite uma palavra sozinha na ultima linha de paragrafo curto.
- Titulo cabe em ate 3 linhas na menor largura; se nao cabe, o tamanho diminui na largura estreita.
- Titulo de linha de lista fica em uma linha; o detalhe vai na segunda.
- Unidade e valor, atalho e tecla e nome proprio nao quebram entre si (espaco nao separavel).
- Quando quebrar, truncar ou limitar esta em [states.md](states.md#texto-longo).

## Tracking

- Tracking depende do tamanho: titulo grande pede levemente negativo (cerca de -0.02em), corpo fica perto de zero, texto muito pequeno pede levemente positivo.
- Nunca um unico tracking para todos os tamanhos.
- Fontes do sistema ja trazem tracking e tamanho optico por tamanho; nao sobrescreva sem motivo.

## Numeros

- Numero que muda ao vivo ou se compara em coluna usa algarismos tabulares, para nao tremer nem desalinhar.
- Formatacao de numero, data e moeda esta em [writing.md](writing.md#formatacao).

## Escala com o usuario

- O layout cresce com o tamanho de texto escolhido pelo usuario. Espacos ligados ao texto escalam junto.
- Texto a 200% segue o piso de [accessibility.md](accessibility.md#preferencias-do-usuario).
- Na web em celular, campo de texto com fonte menor que 16px dispara zoom no iOS.
