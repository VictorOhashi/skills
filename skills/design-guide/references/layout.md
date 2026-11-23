# Hierarquia e layout

Como distribuir o que esta na tela para que o mais importante seja o mais obvio. Escala de espaco, grid e cores vem do projeto; aqui ficam as decisoes que ele nao toma.

## Hierarquia

- Defina uma unica coisa mais importante por tela e uma unica acao principal por contexto. Se duas competem, o problema e de produto, nao de estilo; relate.
- Construa a hierarquia por ordem, peso, tamanho, espaco e contraste. Cor e o ultimo recurso.
- Rebaixe o secundario em vez de promover tudo. Metadado, rotulo e ajuda ficam com menos contraste e tamanho menor que o conteudo.
- Rotulo especifico vence rotulo generico ("Faturas", nao "Geral").
- Cada tela responde: onde estou, para onde posso ir, o que ha aqui, como saio.

## Agrupamento e mapeamento

- Proximidade sugere relacao. O espaco entre grupos e claramente maior que o espaco dentro do grupo (cerca de 2 vezes).
- Prefira espaco a divisoria, salvo convencao da plataforma (lista nativa). Use borda ou fundo so quando o espaco nao basta para separar.
- Uma camada de superficie por grupo; nao aninhe cartao dentro de cartao.
- O controle fica perto do que afeta e se arranja como o que ele muda. Se precisa de rotulo para explicar o que faz, o mapeamento e fraco.

## Alinhamento

- Alinhe a poucas linhas verticais. Cada borda nova de alinhamento e ruido.
- Texto alinhado a esquerda (ou ao inicio, em RTL) para leitura. Centralize so blocos curtos e isolados.
- Numeros em colunas alinham a direita (ou pelo separador decimal).
- Icone ao lado de texto alinha ao centro optico da primeira linha, nao ao centro da caixa quando o texto pode quebrar.
- Ajuste opticamente quando o geometrico parece errado: icone de play centralizado parece deslocado; circulo ao lado de quadrado do mesmo tamanho parece menor.

## Espaco e densidade

- Use apenas valores da escala de espaco do projeto. Sem escala, use uma progressao fixa (por exemplo, multiplos de 4).
- Densidade segue o uso: ferramenta de trabalho diario tolera mais densidade; fluxo raro ou de primeira vez pede mais respiro.
- Raio interno = raio externo - espacamento entre eles, para cantos aninhados parecerem concentricos.
- Reserve espaco para o que carrega depois (imagem, valor assincrono), para o layout nao saltar.

## Largura e responsividade

- Conteudo de leitura tem largura maxima; em tela larga, nao estique texto de borda a borda.
- Projete na largura real do container, nao so da tela: um componente pode viver numa coluna estreita.
- Na menor largura, acoes ficam alcancaveis; o piso de reflow esta em [accessibility.md](accessibility.md#operacao).
- Respeite areas seguras (entalhe, barra de gestos, teclado aberto).

## Cor como funcao

- Cor semantica (sucesso, aviso, erro, informacao) so com esse sentido; nunca como decoracao.
- A acao principal usa o destaque que o projeto define. Muitos destaques anulam o destaque.
- Divisoria decorativa pode ser sutil; borda que identifica controle segue o piso de [accessibility.md](accessibility.md#percepcao).

## Profundidade

- Camadas comunicam hierarquia: o que flutua (menu, popover, sheet) fica acima e se distingue do que esta embaixo.
- Tarefa modal escurece e recua o fundo. Painel paralelo nao escurece, para nao quebrar o fluxo.
- Em produto que usa material translucido, siga [principles.md](principles.md#materiais-e-profundidade).
