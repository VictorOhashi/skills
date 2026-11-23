# Hierarquia e layout

Como distribuir o que esta na tela para que o mais importante seja o mais obvio. Escala de espaco, grid e cores vem do projeto; aqui ficam as decisoes que ele nao toma.

## Hierarquia

- Uma unica coisa vence o primeiro olhar, e e a informacao mais importante do trabalho da tela.
- No maximo uma acao principal por contexto. As outras ficam secundarias ou em texto; acoes duplicadas ("Salvar" e "Salvar alteracoes") viram uma.
- Construa a hierarquia por ordem, tamanho, peso, espaco e contraste. Cor e o ultimo recurso.
- Rebaixe o secundario em vez de promover tudo. Metadado, rotulo e ajuda ficam menores e com menos contraste que o conteudo.
- Uma ideia por bloco. Coisa rara vai para tras de "Mais", nao para a tela principal.
- Cada tela responde: onde estou, o que ha aqui, o que posso fazer, como saio.

## Agrupamento

- O espaco entre grupos e claramente maior que o espaco dentro do grupo, cerca de 2 vezes.
- Prefira espaco a divisoria. Use borda ou fundo so quando o espaco nao basta, ou quando a plataforma convenciona (lista nativa).
- Uma camada de superficie por grupo. Nao aninhe cartao dentro de cartao.
- O controle fica perto do que afeta e se arranja como o que ele muda. Controle que precisa de rotulo para explicar o efeito tem mapeamento fraco.

## Alinhamento

- Alinhe a poucas linhas verticais. Cada borda de alinhamento nova e ruido.
- Texto de leitura alinha ao inicio (esquerda, ou direita em RTL). Centralize so blocos curtos e isolados.
- Numeros em coluna alinham a direita ou pelo separador decimal.
- Linhas repetidas usam faixas de largura fixa para icone, titulo e acao final, mesmo quando a faixa fica vazia.
- Icone ao lado de texto alinha ao centro optico da primeira linha quando o texto pode quebrar.
- Ajuste opticamente quando o geometrico parece errado: icone de play centralizado parece deslocado; circulo ao lado de quadrado do mesmo tamanho parece menor.

## Espaco e densidade

- Use so valores da escala de espaco do projeto. Sem escala, use uma progressao fixa, como multiplos de 4.
- Densidade segue o uso: ferramenta diaria tolera mais densidade; fluxo raro ou de primeira vez pede mais respiro.
- Container acompanha o conteudo. Caixa muito maior que o conteudo, ou altura fixa em volta de pouco conteudo, parece quebrada.
- Raio interno = raio externo - espaco entre eles, para cantos aninhados parecerem concentricos.

## Largura e responsividade

- Texto de leitura tem largura maxima; a medida esta em [typography.md](typography.md#medida-e-entrelinha).
- Projete na largura real do container, nao so da tela. Um componente pode viver numa coluna estreita.
- Na menor largura, as acoes continuam alcancaveis. O piso de reflow esta em [accessibility.md](accessibility.md#operacao).
- Confira tambem a tela muito larga: conteudo esticado de borda a borda ou ilhado no centro.
- Respeite areas seguras: entalhe, barra de gestos, teclado aberto.

## Profundidade

- Camadas comunicam hierarquia. O que flutua (menu, popover, sheet) fica acima e se separa do que esta embaixo por sombra, borda ou contraste.
- Poucos niveis de elevacao, cada um com sentido.
- Tarefa modal escurece e recua o fundo. Painel paralelo nao escurece, para nao quebrar o fluxo.
- Em material translucido: nao empilhe superficie translucida clara sobre outra; texto sobre ela pede mais contraste e peso; na borda com cromo flutuante, prefira fade ou blur a divisoria de 1px.
