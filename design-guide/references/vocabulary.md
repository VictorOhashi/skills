# Vocabulario de motion

Nomes para descrever um efeito ao usuario, a um designer ou a outro agente. O termo fica em ingles quando e assim que ferramentas e documentacoes o chamam.

## Entrada e saida

- **Fade in / fade out:** aparece ou some mudando a opacidade.
- **Slide in:** entra deslizando de fora da tela.
- **Scale in:** cresce de um tamanho menor ao entrar, em geral com fade.
- **Pop in:** entra com um leve overshoot.
- **Reveal:** conteudo descoberto aos poucos por mascara ou recorte.
- **Origin-aware:** o elemento nasce do gatilho que o abriu.

## Tempo e sequencia

- **Duracao, atraso:** quanto dura e quanto espera para comecar.
- **Interpolacao (tween):** geracao dos quadros intermediarios entre inicio e fim.
- **Keyframes:** pontos definidos de uma animacao; o resto e interpolado.
- **Stagger:** itens animam um apos o outro com intervalo pequeno.
- **Orquestracao, coreografia:** varias animacoes cronometradas para parecer um movimento so.
- **Tempo assimetrico:** entrada e saida, ou pressionar e soltar, com tempos diferentes.

## Transicao entre estados

- **Crossfade:** um elemento some enquanto outro aparece no mesmo lugar.
- **Continuity transition:** mudanca que mantem o usuario orientado ligando o antes e o depois.
- **Morph:** uma forma vira outra de modo continuo.
- **Shared element transition:** um elemento viaja e se transforma de uma tela para outra.
- **Layout animation:** mudanca de tamanho ou posicao anima em vez de saltar.
- **Accordion / collapse:** secao expande e recolhe a altura.
- **Direction-aware transition:** avancar e voltar deslizam em direcoes opostas.
- **Page / view transition:** transicao entre telas ou rotas.

## Rolagem

- **Scroll reveal:** elemento anima ao entrar na area visivel.
- **Scroll-driven animation:** o progresso da animacao segue a posicao da rolagem.
- **Parallax:** camadas rolam em velocidades diferentes para dar profundidade.

## Interacao e gesto

- **Press / tap feedback:** resposta visual no toque, como encolher levemente.
- **Hold to confirm:** segurar enche um indicador ate confirmar.
- **Drag, drag to reorder:** arrastar, e arrastar para reordenar.
- **Swipe to dismiss:** deslizar para dispensar.
- **Flick:** gesto rapido que arremessa o elemento com impulso.
- **Rubber-banding:** resistencia progressiva alem do limite.
- **Snap points:** posicoes de repouso para onde o elemento encaixa.
- **Hysteresis:** folga de movimento antes de decidir direcao ou cancelar.
- **Shake / wiggle:** tremida curta, em geral para erro.

## Curva e fisica

- **Easing:** como a velocidade muda ao longo da animacao.
- **Ease-out, ease-in, ease-in-out, linear:** comeca rapido; comeca devagar; acelera e desacelera; velocidade constante.
- **Cubic-bezier:** curva definida por quatro pontos de controle.
- **Spring:** movimento por fisica, sem duracao fixa.
- **Damping ratio, response:** quanto o spring passa do alvo; quao rapido chega.
- **Stiffness, mass, bounce:** parametros alternativos de spring.
- **Momentum, velocity:** impulso e velocidade que o gesto entrega a animacao.
- **Momentum projection:** destino calculado a partir da velocidade na soltura.
- **Interruptible animation:** animacao que pode ser agarrada e redirecionada no meio.

## Loop e ambiente

- **Loop, alternate (yoyo):** repete; vai e volta.
- **Pulse, float, orbit:** pulsar, flutuar, orbitar.
- **Idle / attention loop:** animacao ociosa que convida a interagir.
- **Marquee:** texto ou faixa rolando continuamente.

## Acabamento

- **Blur de transicao:** desfoque leve que funde dois estados num crossfade.
- **Clip-path, mask:** recorte ou mascara que revela ou esconde.
- **Before / after slider:** comparador arrastavel.
- **Line drawing:** linha se desenhando.
- **Number ticker:** numero rolando de um valor para outro.
- **Tabular numbers:** algarismos de largura fixa, que nao tremem ao mudar.
- **Skeleton / shimmer:** placeholder de carregamento.
- **Material, vibrancy:** superficie translucida que mostra o fundo desfocado; texto que mantem contraste sobre ela.

## Desempenho

- **Frame rate, dropped frame, jank:** quadros por segundo; quadro perdido; engasgo visivel.
- **Compositing:** a plataforma move camadas prontas sem refazer layout ou pintura.
- **Layout thrashing:** leituras e escritas de layout alternadas que forcam recalculo.

## Principios

- **Purposeful animation:** animacao com proposito nomeado.
- **Frequency of use:** quanto mais frequente, menos animacao.
- **Spatial consistency:** sai por onde entrou; nasce de onde foi chamado.
- **Perceived performance:** o quanto a interface parece rapida, alem do quanto e.
- **Anticipation, follow-through, squash and stretch:** preparar o movimento; continuar depois dele; deformar para indicar forca.
- **Reduced motion:** preferencia do usuario por menos movimento.
