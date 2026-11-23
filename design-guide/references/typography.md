# Tipografia

Detalhes de legibilidade que valem para qualquer fonte. A escolha da fonte e da escala de tipo e do projeto; sem escala definida, siga os padroes ja usados no app e os da plataforma.

## Hierarquia

- Monte a hierarquia com tamanho, peso e entrelinha juntos, nao so com tamanho.
- Enfatize com peso antes de aumentar tamanho: peso ganha presenca sem ocupar espaco.
- Poucos niveis: em geral titulo, corpo e apoio bastam numa tela. Cada nivel novo precisa de motivo.
- Caixa alta so em rotulos curtos, com tracking levemente aberto. Nunca em frases.

## Medida e entrelinha

- Linha de leitura entre 45 e 75 caracteres; cerca de 65 e o alvo.
- Entrelinha anda ao contrario do tamanho: mais solta no corpo (cerca de 1.4 a 1.6), mais apertada em titulos grandes (cerca de 1.05 a 1.2).
- Aumente a entrelinha para scripts com acentos empilhados ou altos (vietnamita, tailandes, devanagari) e nunca corte texto com altura fixa.
- Equilibre a quebra de titulos de varias linhas e evite uma palavra sozinha na ultima linha de paragrafos curtos.

## Tracking

- Tracking depende do tamanho: titulos grandes pedem tracking negativo (cerca de -0.02em), corpo fica perto de zero, texto muito pequeno pede levemente positivo.
- Nunca um unico valor de tracking para todos os tamanhos.
- Fontes do sistema ja trazem tracking e tamanho optico por tamanho; nao sobrescreva sem motivo.

## Numeros

- Numeros que mudam ao vivo ou se comparam em coluna usam algarismos tabulares, para nao tremer nem desalinhar.
- Formatacao de numero segue [content.md](content.md#formatacao); numero nunca e truncado ([content.md](content.md#quebrar-truncar-ou-limitar)).

## Escala com o usuario

- O layout cresce com o tamanho de texto escolhido pelo usuario. Espacos ligados ao texto escalam junto.
- Texto a 200% segue o piso de [accessibility.md](accessibility.md#preferencias-do-usuario).

## Texto de interface

- Frases curtas, voz ativa, na lingua e no tom da localizacao do projeto.
- O mesmo conceito tem o mesmo nome em toda a interface.
- Botao diz a acao ("Salvar fatura"), nao uma resposta generica ("OK"), quando ha ambiguidade.
- Botao tem largura pelo conteudo, com minimo, para caber a traducao.
- Mensagem de erro e plural seguem [accessibility.md](accessibility.md#compreensao) e [content.md](content.md#formatacao).
