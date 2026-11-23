# Cor

Cor como funcao: o que ela diz, onde ela vive e quanto contraste ela precisa. Paleta e marca sao do projeto.

## Funcao

- Cor carrega sentido: acao principal, estado semantico, selecao, foco. Cor sem sentido e decoracao e compete com as que tem.
- Um momento de cor forte por tela. Neutralize os acentos decorativos; muitos destaques anulam o destaque.
- Monte a hierarquia com neutros (texto principal, apoio, desabilitado) antes de recorrer a cor.
- Cor semantica (sucesso, aviso, erro, informacao) so com esse sentido.
- Estado nunca depende so de cor; o piso esta em [accessibility.md](accessibility.md#percepcao).

## Tokens por papel

- O componente pede o papel (`text-muted`), nunca o valor cru (`#6b6b70`) nem o degrau da paleta (`gray-500`). A paleta crua pode existir por baixo dos papeis.
- Papeis minimos:
  - texto principal, de apoio, placeholder e desabilitado;
  - texto sobre preenchimento escuro ou de destaque;
  - superficie e dois degraus de preenchimento (botao secundario, campo, area recuada);
  - borda, borda em hover e divisoria, mais leve que a borda;
  - destaque da acao principal, com hover e pressionado;
  - foco, overlay de modal e dois niveis de sombra;
  - cada estado semantico com fundo, texto legivel sobre o fundo e versao forte.
- Um terceiro degrau de preenchimento ou um terceiro cinza de texto costuma indicar hierarquia confusa.

## Estados de interacao

- Hover e mais discreto que selecionado. Hover igual a selecionado parece uma segunda selecao.
- Peca com borda escurece so a borda no hover; peca sem borda ganha um tom mais leve que o de selecionado.
- Pressionado e mais forte que hover. Hover, pressionado e foco aumentam o contraste, nunca diminuem.
- Item ativo se distingue do trilho que o contem (aba ou segmento selecionado sobre fundo cinza).

## Contraste

- Os pisos estao em [accessibility.md](accessibility.md#percepcao).
- Fundo tingido ou cinza come contraste. Confira texto pequeno, icone e ponto de status sobre ele.
- Texto de apoio e o primeiro a cair abaixo do piso; confira antes do resto.

## Tema escuro

- Tema escuro nao e inversao. Elevacao sobe a luminosidade da superficie, porque sombra quase nao aparece.
- Acentos saturados vibram sobre fundo escuro; reduza saturacao ou luminosidade.
- Confira logos, imagens e graficos no tema escuro.
- Na web, declare o esquema de cor do tema para que controles nativos e barras de rolagem acompanhem.

## Dados e graficos

- Paleta categorica distinguivel por daltonicos, com rotulo direto em vez de legenda distante.
- Escala sequencial para magnitude, divergente so quando ha um ponto neutro com sentido.
- A cor de uma serie e a mesma em todos os graficos da tela.
