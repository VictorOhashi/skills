# Interacao e feedback

Como a interface responde, se mantem estavel e deixa o usuario no controle.

## Resposta

- Feedback visual no toque ou no clique, abaixo de cerca de 100ms: o estado pressionado aparece sem atraso; valores em [motion.md](motion.md#duracao).
- Espera acima de cerca de 400ms mostra progresso ou placeholder. Acima de cerca de 2s, diz que continua.
- Prefira atualizacao otimista quando a acao e reversivel e quase sempre da certo. Na falha, reverta e avise com a saida.
- Audite debounce, timer artificial e espera de animacao no caminho da entrada. Nada bloqueia entrada durante transicao.
- Durante arraste ou slider, o feedback e continuo, nao so no fim.

## Estabilidade

Nada muda de tamanho sob o cursor. Elemento que salta faz o usuario clicar na coisa errada.

- Carregando mantem o tamanho: o rotulo fica no layout, invisivel, com o indicador centralizado por cima.
- Troca de rotulo ("Copiar" e "Copiado", "Seguir" e "Seguindo") usa a largura do rotulo mais longo.
- Selecao e toggle nao mudam peso de fonte nem inserem borda ou icone. Use fundo ou borda sempre presente, transparente em repouso.
- Troca de conteudo (abas, etapas, sucesso no lugar do formulario) reserva a altura ou troca dentro de container de altura fixa.
- Reserve o espaco do que carrega depois (imagem, valor assincrono), com dimensoes explicitas.
- Placeholder de carregamento espelha o layout final.

## Estados do controle

- Todo controle tem normal, hover, pressionado, foco, desabilitado e, quando age de forma assincrona, carregando. Os valores vem da matriz do design system; as regras de cor estao em [color.md](color.md#estados-de-interacao).
- Hover so em ponteiro fino. Em toque, hover dispara falso e gruda.
- Anel de foco aparece na navegacao por teclado, nao apos clique, com o raio da peca. O piso esta em [accessibility.md](accessibility.md#operacao).
- Prefira explicar por que algo esta indisponivel a so desabilitar. Botao de envio fica habilitado ate o envio comecar.
- Cursor segue a plataforma: em app nativo, seta, e mao so em link; na web, siga a convencao do projeto.

## Affordance

- O que parece clicavel e clicavel; o que e clicavel parece clicavel.
- Acao dentro de linha ou tabela e botao real, nao texto solto.
- Link navega, botao age. Na web, navegacao usa link de verdade, para abrir em nova aba funcionar.
- Use o controle nativo onde ele existe (menu de contexto, seletor, rolagem): acessibilidade e atalhos vem junto.
- Rotulo e controle formam um alvo so; checkbox e radio nao tem zona morta.
- Alvo frequente fica grande e perto; alvo destrutivo fica longe do frequente (lei de Fitts). Pisos de tamanho em [accessibility.md](accessibility.md#operacao).

## Formularios

- Rotulo, validacao em linha e foco no primeiro erro seguem [accessibility.md](accessibility.md#compreensao). Placeholder mostra exemplo do formato.
- Tipo de campo, teclado e preenchimento automatico corretos para o dado (email, telefone, codigo, senha).
- Nao bloqueie colar. Aceite texto livre e normalize depois, em vez de travar a digitacao.
- Erro e falha de envio preservam o que o usuario digitou.
- Enter envia o campo unico; em texto de varias linhas, o atalho da plataforma envia.
- Avise antes de sair com alteracoes nao salvas.
- Padroes seguros e restricoes (seletor de data, mascara tolerante) previnem erro melhor que mensagem depois.

## Navegacao e estado

- Na web, estado que o usuario quer compartilhar ou recuperar (filtro, aba, pagina, painel aberto) fica na URL.
- Voltar restaura a rolagem e o estado anterior.
- Nenhum beco sem saida: toda tela oferece proximo passo ou caminho de volta.
- Atalhos de teclado para acao frequente em ferramenta de uso diario, sem esconder a acao de quem nao os conhece.
- Foco automatico so no desktop e com um unico campo principal.

## Acoes destrutivas e reversao

- Prefira desfazer a confirmacao. Confirmacao cansa e treina o usuario a clicar sem ler.
- Confirme so o irreversivel ou o que afeta outras pessoas. O texto da confirmacao esta em [writing.md](writing.md#confirmacao-e-sucesso).
- Acao destrutiva tem aparencia propria e nao fica no lugar habitual da acao principal.

## Sobreposicoes

- Modal so para tarefa que precisa bloquear o resto. Tarefa paralela usa painel ou pagina.
- Banner so para problema do app inteiro. Mensagem sobre um item fica no item.
- Toast usa a peca do sistema, na posicao de sempre, com conteudo nao essencial e anunciado ao leitor de tela.
- Tooltip nao traz acao nem informacao essencial. O primeiro do grupo abre com atraso; os seguintes, sem atraso.
- Dentro de modal ou drawer, a rolagem nao vaza para a pagina de baixo.

## Feedback multimodal

1. **Causalidade.** O feedback dispara no evento real (o toggle virou, o item encaixou) e tem o carater fisico da acao.
2. **Harmonia.** Visual, som e haptica no mesmo quadro. Atraso entre eles desfaz a ilusao.
3. **Utilidade.** So onde paga o lugar: conclusao, sucesso, erro, encaixe. Excesso treina o usuario a ignorar tudo.
