# Principios

O porque por tras dos passos do guia. Use para decidir casos que os passos nao cobrem e para explicar um achado de revisao.

## A ideia central

Uma interface e fluida quando se comporta como o mundo fisico: responde na hora, se move de forma continua, carrega impulso, resiste nos limites e pode ser redirecionada no meio do movimento. Os detalhes que o usuario nunca nota conscientemente sao a meta: quando algo funciona exatamente como ele supunha, ele segue sem pensar.

## Fluid interfaces

1. **Resposta.** Latencia destroi a sensacao de manipulacao direta. Mostre feedback no toque, nao na soltura. Audite debounce, timer artificial e espera de transicao no caminho da entrada. Durante um arraste ou slider, o feedback e continuo, nao so no fim.
2. **Manipulacao direta.** Durante o gesto, a interface e o dedo. O elemento acompanha 1:1 e respeita o ponto onde foi pego; saltar para o centro quebra a ilusao. Guarde um historico curto de posicao e tempo para medir velocidade na soltura.
3. **Interrupcao.** O principio mais importante. O usuario pode agarrar um elemento em movimento e inverte-lo sem esperar. Nunca bloqueie entrada durante transicao. Toda nova animacao parte do valor exibido, nao do alvo logico. Ao inverter, preserve a velocidade em vez de corta-la.
4. **Comportamento, nao roteiro.** Animacao com roteiro fixo nao responde a entrada nova. Spring responde: entrada nova so muda o alvo. Use spring no que o usuario arrasta e solta; no resto que pode ser interrompido, spring ou transicao que parte do valor atual.
5. **Passagem de velocidade.** Ao soltar, a animacao continua na velocidade exata do dedo. Nao deve haver costura visivel entre arrastar e animar.
6. **Projecao de impulso.** Anime para onde o gesto estava indo. Escolha o destino a partir do ponto projetado, como a rolagem faz ao desacelerar. Entrada pequena, saida grande.
7. **Consistencia espacial.** O que sai por um lado volta por ele. O elemento nasce do gatilho que o abriu.
8. **Indicar a direcao.** Os quadros intermediarios apontam para o resultado, nao so interpolam ate ele.
9. **Limites macios.** No limite, resistencia progressiva em vez de parada seca. Parada seca parece travamento; resistencia diz "responde, mas nao ha mais nada".
10. **Detalhes de gesto.** Destaque no toque, confirme na soltura. Detecte gestos plausiveis em paralelo desde o primeiro movimento e cancele os perdedores quando a intencao ficar clara. Pague o atraso de duplo toque so onde ele existe de fato.
11. **Suavidade quadro a quadro.** Suavidade e o conteudo dos quadros, nao so a taxa. Quais propriedades animar esta em [motion-values.md](motion-values.md#propriedades).

## Materiais e profundidade

Vale para produto que usa material translucido.

- Translucidez cria uma camada funcional flutuante que estrutura sem roubar foco. O conteudo rola por baixo.
- O peso do material codifica hierarquia: material mais pesado separa regioes estruturais, mais leve chama atencao para controles.
- Nunca empilhe superficie translucida clara sobre outra; a legibilidade cai.
- Painel paralelo usa translucidez e deslocamento; quando escurecer segue [layout.md](layout.md#profundidade).
- Texto sobre material translucido precisa de mais contraste, peso um pouco maior e tracking levemente aberto.
- Na borda onde o conteudo encontra cromo flutuante, use fade ou blur de borda em vez de divisoria de 1px.
- Superficie de vidro se materializa: blur e escala animam juntos, nao so opacidade.

## Feedback multimodal

1. **Causalidade.** Fica obvio o que causou o feedback. Ele dispara no evento real (o toggle virou, o item encaixou) e tem o carater fisico da acao.
2. **Harmonia.** Visual, som e haptica no mesmo quadro. Atraso entre eles desfaz a ilusao.
3. **Utilidade.** So onde o feedback paga o lugar: commit, sucesso, erro, encaixe. Excesso treina o usuario a ignorar tudo.

## Coreografia

- Para cada evento, liste o que se move e de um papel: **lider** (o que o usuario precisa notar), **suporte** (segue com movimento menor), **decoracao** (so fade ou nada) e **estatico**. Se mais de um elemento quer ser lider, o problema e de hierarquia e motion nao resolve.
- Dois elementos se relacionam de quatro formas:
  - **juntos:** mesmo objeto ou mesmo momento; e o padrao;
  - **sobrepostos:** stagger, quando a ordem tem sentido;
  - **em sequencia:** quando mostrar ambos pareceria quebrado;
  - **carregados:** anime o pai e os filhos vem junto.
- Um container tem uma unica entrada: se o painel entra, o conteudo ja esta nele.
- Saidas sao simultaneas; nao escalone a saida.
- Elemento que sai deixa de ocupar espaco na hora, para os vizinhos fecharem o vao enquanto ele some.
- Sub-animacoes de um mesmo componente compartilham a familia de tempo; tempos diferentes fazem parecer dois objetos.
- Efeito secundario se prende ao momento do lider (inicio, impacto ou assentamento) e ao evento que o causa, nao a um atraso que "parece certo".
- Coreografia nunca bloqueia interacao: o que esta visivel ja e clicavel.

## Fundamentos de design da Apple

1. **Proposito.** Decida o que nao construir. Cada recurso pede tempo, atencao e confianca.
2. **Agencia.** O usuario no controle, com desfazer facil e confirmacao conforme [accessibility.md](accessibility.md#compreensao).
3. **Responsabilidade.** Aja no interesse do usuario: privacidade no momento certo, prevencao de dano, sobretudo com IA.
4. **Familiaridade.** Construa sobre o que as pessoas ja sabem. O que parece igual se comporta igual e fica no mesmo lugar.
5. **Flexibilidade.** Contextos, dispositivos e habilidades diferentes. Adapte a plataforma: toque rapido no celular, fluxo profundo no desktop.
6. **Simplicidade, nao minimalismo.** Tire o desnecessario para o essencial aparecer. As vezes, mais contexto simplifica.
7. **Cuidado artesanal.** Nada e aleatorio: cada espaco, tempo e alinhamento e uma escolha defensavel.
8. **Encanto.** Resultado dos outros sete, nao confete por cima.

As regras taticas que servem a esses fundamentos estao em [layout.md](layout.md), [content.md](content.md) e [accessibility.md](accessibility.md).

## Coesao e processo

- O movimento combina com a personalidade do produto: um painel profissional e rapido e seco; algo ludico pode quicar mais.
- Percepcao de velocidade importa tanto quanto velocidade real. Ease-out a 200ms parece mais rapido que ease-in a 200ms.
- Revise motion com olhos frescos, em camera lenta ou quadro a quadro, e em dispositivo real quando houver gesto.
- Prototipo interativo revela a interface melhor que telas estaticas. Interacao e visual se projetam juntos.
