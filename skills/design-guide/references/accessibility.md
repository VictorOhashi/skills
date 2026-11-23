# Acessibilidade

Cada item com criterio WCAG 2.2 AA entre parenteses e piso: vale em qualquer estetica, inclusive contra token do projeto (ver a Precedencia da skill). O piso segue o criterio citado com as excecoes dele: componente inativo, texto decorativo e logotipo em 1.4.3 e 1.4.11; espacamento, alvo dentro de texto e controle equivalente em 2.5.8; zoom de pagina cumpre 1.4.4. Os demais sao valores do guia, das diretrizes da Apple e do Material, e seguem a precedencia. A plataforma do projeto pode exigir mais.

## Percepcao

- Contraste de texto de pelo menos 4.5:1; texto grande (cerca de 18pt, ou 14pt em negrito) pelo menos 3:1 (1.4.3).
- Contraste de pelo menos 3:1 para a borda que identifica um controle (campo, checkbox, toggle), icones que carregam sentido e indicador de foco (1.4.11). Divisoria decorativa nao tem piso.
- Estado nunca depende so de cor: erro tem icone ou texto, selecao tem marca, grafico tem rotulo ou padrao (1.4.1).
- Confira contraste nos dois temas e sobre material translucido.
- Imagem com sentido tem texto alternativo; imagem decorativa fica oculta para leitor de tela (1.1.1).

## Semantica

- Todo controle expoe nome, papel e estado ao leitor de tela (4.1.2).
- Em controle repetido numa lista, o nome inclui o item ("Remover Maria", nao so "Remover").
- Lista, regiao e titulo sao expostos pela semantica, nao so pelo visual (1.3.1).
- Grupo com titulo visivel tem esse titulo como nome.
- Ordem de leitura e de foco preserva o sentido e a operacao (1.3.2, 2.4.3).
- Na duvida sobre a ordem, siga a ordem visual.
- Mensagem de status (sucesso, erro, contagem, carregando) e anunciada sem mover o foco (4.1.3).

## Operacao

- Na web, alvo de pelo menos 24x24px CSS para qualquer ponteiro (2.5.8).
- Alvo de toque de pelo menos 44x44pt (Apple) ou 48x48dp (Material); web que tambem recebe toque usa 44x44px nos alvos principais. A area de toque pode ser maior que o desenho.
- Todo controle funciona por teclado (2.1.1), com foco sempre visivel (2.4.7).
- Elemento focado nao fica totalmente coberto por barra fixa, cabecalho ou sheet (2.4.11).
- Gesto de caminho ou de arrasto tem alternativa por toque simples ou botao (2.5.1, 2.5.7).
- Nada essencial so no hover ou so no clique longo; existe alternativa por botao ou teclado.
- Conteudo que aparece no hover ou no foco pode ser dispensado sem mover o ponteiro (Esc), continua visivel com o ponteiro sobre ele e nao some sozinho (1.4.13).
- Abrir dialogo move o foco para ele; fechar devolve o foco ao gatilho (2.4.3).
- Remover o elemento focado move o foco para o vizinho.
- Movimento automatico que dura mais de 5s e roda junto com outro conteudo pode ser pausado, parado ou escondido (2.2.2). A preferencia de movimento reduzido do sistema nao substitui esse meio.
- Nao bloqueie o zoom da plataforma (1.4.4).
- Conteudo cabe em 320px CSS de largura sem rolagem horizontal, exceto o que precisa de duas dimensoes, como tabela ou mapa (1.4.10).

## Compreensao

- Campo tem rotulo visivel; placeholder nao e rotulo (3.3.2).
- Valide em linha, perto do campo, quando o usuario sai dele; nao so no envio.
- Erro diz o problema e a correcao, sem codigo tecnico cru (3.3.1, 3.3.3).
- No envio com erro, o foco vai ao primeiro campo com erro.
- Transacao financeira ou legal e alteracao de dados do usuario sao reversiveis, revisadas antes do envio ou confirmadas (3.3.4).
- Acao destrutiva e irreversivel pede confirmacao. O resto oferece desfazer.

## Preferencias do usuario

- Texto ampliado a 200%: o layout cresce sem cortar nem perder acao (1.4.4; ver [typography.md](typography.md#escala-com-o-usuario)).
- Movimento reduzido: ver [motion-values.md](motion-values.md#movimento-reduzido).
- Com transparencia reduzida, superficies translucidas ficam solidas.
- Com contraste aumentado, fundos ficam quase solidos e ganham borda definida.
- Tema escuro nao e inversao: confira contraste, sombras e logos no tema escuro.
