# Valores de motion

Valores em unidades neutras: milissegundos, pontos de controle de bezier, damping e response. Toda plataforma expressa esses valores, direto ou pela conversao em [Spring](#spring); traduza pela documentacao dela. Token de motion do design system e padrao ja usado no app vencem esta tabela.

## Frequencia

| Frequencia de uso | Decisao |
| --- | --- |
| 100+ vezes por dia (atalho de teclado, paleta de comandos, salto de foco, navegacao por setas, navegacao principal, troca de aba) | Nao anime. Transicao nativa de navegacao em app mobile (push e pop, sheet de sistema) fica como a plataforma faz. |
| Dezenas de vezes por dia (hover, navegacao em lista, toggle frequente) | Remova ou atenue ao quase imperceptivel. |
| Ocasional (modal, drawer, toast, configuracao) | Animacao padrao. |
| Raro ou primeiro uso (onboarding, estado vazio, sucesso, celebracao) | Cabe encanto. |

- Primitivo de design system usa a frequencia do consumidor mais frequente. Conte os usos no codigo; sem como saber, relate a suposicao em Decisoes.
- Tela ou fluxo sem dado de uso conta como ocasional; relate a suposicao em Decisoes.
- Fade-in ao rolar em toda secao nao anima; cabe no maximo uma entrada de destaque por pagina de marketing.
- Dado que o usuario le ou compara (grafico, tabela, numero) so anima quando o valor muda de fato, do antigo para o novo.
- Hover com movimento so em dispositivo com ponteiro fino; em toque, o hover dispara falso e gruda.

Atenuar significa uma versao menor do mesmo movimento:

| Hoje | Atenuado |
| --- | --- |
| Hover com escala, elevacao ou sombra crescendo | So cor ou opacidade, ate 150ms |
| Entrada com deslize ou escala em superficie frequente | So opacidade, 150ms, ease-out |
| Stagger acima de 80ms por item ou de 300ms no total | 30ms por item, ou o grupo inteiro num fade so |
| Loop infinito em elemento persistente | Uma execucao, ou o estado final estatico |

Se a versao atenuada deixar de cumprir o proposito, remova.

## Curva

| Situacao | Curva |
| --- | --- |
| Elemento entrando ou saindo | ease-out |
| Elemento se movendo ou mudando de forma na tela | ease-in-out |
| Hover e mudanca de cor | ease, curto (ate 150ms); aqui a curva padrao serve |
| Movimento constante (progresso, marquee) | linear |
| Sem certeza | ease-out |

- Nao use ease-in em UI. Ele atrasa o inicio, que e o instante em que o usuario esta olhando.
- Em entrada, saida e movimento, as curvas genericas (o ease e o ease-out padrao da CSS) sao fracas. Sem curva definida no projeto, prefira versoes mais fortes:

| Nome | Pontos de controle (x1, y1, x2, y2) | Uso |
| --- | --- | --- |
| ease-out forte | 0.23, 1, 0.32, 1 | Entrada e saida de UI |
| ease-in-out forte | 0.77, 0, 0.175, 1 | Movimento na tela |
| drawer estilo iOS | 0.32, 0.72, 0, 1 | Sheet preso a borda da tela, aberto ou fechado por botao, como alternativa ao spring |

## Duracao

| Elemento | Duracao |
| --- | --- |
| Feedback de toque em botao | 100 a 160ms |
| Tooltip, popover pequeno | 125 a 200ms |
| Dropdown, select | 150 a 250ms |
| Modal | 200 a 300ms |
| Sheet preso a borda da tela, com a curva estilo iOS | ate 500ms |
| Drawer ou sheet flutuante, que nao toca a borda da tela | cerca de 200ms |
| Marketing e explicacao | Pode ser maior |

- Animacao de UI fica abaixo de 300ms. Alem das excecoes da tabela, passar disso precisa de motivo declarado.
- Sheet preso a borda que percorre a tela (entra de fora dela), aberto por botao, usa o spring da tabela de [Spring](#spring) ou a curva estilo iOS ate 500ms. Escolha um e use o mesmo em todo o app, na mesma familia de tempo do overlay.
- Sheet com deslize curto (menor que a propria dimensao) e fade segue a regra geral: ease-out forte e ate 300ms.
- Saida e mais rapida que entrada.
- Tempo assimetrico: lento onde o usuario decide (segurar para confirmar: cerca de 2s linear), rapido onde o sistema responde (soltar: cerca de 200ms ease-out).
- Duracao de mudanca de tamanho escala com a distancia, com piso e teto. Salto pequeno com duracao longa parece cintilacao.
- Depois do primeiro tooltip aberto, os seguintes do mesmo grupo abrem sem atraso e sem animacao.

## Spring

Pense em dois parametros, como a Apple:

- **Damping ratio:** controla o overshoot. 1.0 nao passa do alvo. Abaixo de 1.0 passa e oscila.
- **Response:** em segundos, o quao rapido chega ao alvo. Nao e duracao; o tempo de assentar emerge dos parametros.

| Interacao | Damping | Response |
| --- | --- | --- |
| Padrao de UI | 1.0 | 0.3 a 0.4 |
| Reposicionar (picture-in-picture) | 1.0 | 0.4 |
| Rotacao | 0.8 | 0.4 |
| Drawer e sheet soltos por gesto | 0.8 | 0.3 |
| Drawer e sheet abertos ou fechados por botao | 1.0 | 0.3 |
| Gesto com impulso (flick, arremesso) | ~0.8 | 0.3 a 0.4 |

- Bounce so quando o gesto carregou impulso. Overshoot em menu que so apareceu parece errado.
- Em APIs que usam "bounce", quando houver bounce, fique entre 0.1 e 0.3. Zero equivale a damping 1.0, o padrao.
- Elemento pequeno pede um pouco mais de bounce que elemento grande para parecer vivo.
- Movimento em 2D usa um spring por eixo.

Conversao para APIs que pedem outros parametros, com massa `m` (use 1 quando a API nao pedir):

- Rigidez: `k = (2 * pi / response)^2 * m`.
- Amortecimento: `c = 4 * pi * damping ratio * m / response`.
- De volta: `damping ratio = c / (2 * raiz(k * m))` e `response = 2 * pi * raiz(m / k)`.
- APIs com bounce: `bounce` e cerca de `1 - damping ratio`, para damping ratio ate 1.
- Sem spring na plataforma, use a curva ease-out forte com a duracao da tabela de [Duracao](#duracao).

## Gesto

- **Limiar de direcao:** cerca de 10px de movimento antes de decidir a direcao; depois, rastreie 1:1.
- **Area de toque:** cerca de 10px de folga em volta do alvo. Arrastar para fora e voltar cancela e restaura.
- **Dispensar:** dispense se o arraste passar de cerca de 40 a 50% do percurso ou se a velocidade media (distancia total / tempo desde o toque) passar de cerca de 0.11 px/ms. Um flick basta. Com snap points, decida pelo ponto projetado.
- **Velocidade na soltura:** o spring comeca com a velocidade do dedo. APIs com velocidade relativa pedem `velocidade / (alvo - posicao atual)`.
- **Projecao de impulso:** o ponto de repouso projetado e `posicao + (velocidade em px/s / 1000) * d / (1 - d)`, com `d` cerca de 0.998 (rolagem normal) ou 0.99 (mais seco). Escolha o snap mais proximo do ponto projetado, nao do ponto de soltura.
- **Rubber-band:** alem do limite, o deslocamento visivel e `(excesso * dimensao * c) / (dimensao + c * |excesso|)`, com `c` cerca de 0.55.
- **Multitoque:** depois que o arraste comeca, ignore toques extras.
- **Valores ligados:** o que acompanha o arraste (opacidade do overlay, escala do fundo) deriva do progresso do arraste, numa unica fonte de verdade.
- **Volta:** soltar sem dispensar devolve o elemento rapido, com o spring da soltura.

## Grupos

- Produto: 30 a 80ms entre itens, total abaixo de cerca de 300ms. Em lista longa, escalone so os primeiros itens.
- Marketing e primeiro uso: passos de 100 a 150ms em entradas de 0.5 a 0.6s.
- Ordem segue importancia, nao a ordem do codigo.
- Varie o tratamento: o lider desloca mais, o suporte desloca menos, a decoracao so faz fade.
- Intervalos que encurtam ao longo do grupo parecem organicos. Intervalos iguais parecem metronomo.
- Loop que convida a interacao so cabe em momento raro ou primeiro uso. Espera cerca de 2.5s antes da primeira vez, repete a cada cerca de 6s, pausa enquanto o usuario interage e so volta depois que tudo assenta. Para depois de poucas repeticoes ou oferece pausa ([accessibility.md](accessibility.md#operacao), 2.2.2).

## Forma e profundidade

- Entrada por escala parte de 0.9 a 0.97 com opacidade 0. Nunca de escala 0.
- Feedback de toque: escala 0.95 a 0.98 enquanto pressionado.
- Blur para mascarar crossfade: cerca de 2px durante a transicao. Mantenha blur animado abaixo de 20px.
- Superficie maior parece mais espessa: mais blur e sombra mais funda que um chip.

## Propriedades

- Anime transformacao (posicao, escala, rotacao) e opacidade. A plataforma compoe essas propriedades sem refazer layout.
- Mudanca real de tamanho (accordion, vizinhos fechando o vao de um item removido) e aceitavel quando curta e isolada. Em lista grande ou elemento que se move junto com outros, anime por transformacao (tecnica FLIP) em vez de largura, altura ou margem.

## Movimento reduzido

- Troque deslocamento, spring e parallax por fade curto (cerca de 200ms). Remova overshoot.
- O rastreio 1:1 durante o gesto continua, porque o movimento vem do usuario. Reduza impulso, bounce e movimento decorativo.
- Mantenha mudancas de opacidade e cor que ajudam a entender o estado.
- Em grupo, tire os atrasos e mostre os itens juntos.
- Evite fundos de tela inteira em movimento, oscilacao lenta em loop (cerca de 1 ciclo a cada 5s) e saltos bruscos de brilho.
