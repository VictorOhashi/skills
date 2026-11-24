# Motion

Quando animar, como e com que valores. Os valores usam unidades neutras (milissegundos, pontos de bezier, damping e response); traduza pela documentacao da plataforma. Token de motion do projeto e padrao do app vencem estas tabelas.

## Decidir

Responda na ordem, antes de escrever a animacao:

1. **Classifique a frequencia** pela secao [Frequencia](#frequencia). Com "nao anima", encerre aqui.
2. **Nomeie o proposito:** feedback, consistencia espacial, indicacao de estado, evitar mudanca brusca, explicacao ou encanto. Encanto so cabe em momento raro (primeiro uso, vazio, sucesso). Sem proposito, nao anime.
3. **Escolha o motor.** Mudanca de estado predeterminada usa duracao e curva. Gesto solto e o que pode ser interrompido usam spring ou transicao que parte do valor atual.
4. **Aplique as secoes abaixo** que o caso toca e a versao de [Movimento reduzido](#movimento-reduzido).

## Frequencia

| Frequencia de uso | Decisao |
| --- | --- |
| 100+ vezes por dia (atalho, paleta de comandos, salto de foco, setas, navegacao principal, troca de aba) | Nao anime. Transicao nativa de navegacao em app mobile fica como a plataforma faz. |
| Dezenas de vezes por dia (hover, navegacao em lista, toggle frequente) | Remova ou atenue ao quase imperceptivel. |
| Ocasional (modal, drawer, toast, configuracao) | Animacao padrao. |
| Raro ou primeiro uso (onboarding, vazio, sucesso) | Cabe encanto. |

- Primitivo de design system usa a frequencia do consumidor mais frequente. Sem como contar, relate a suposicao em Decisoes.
- Tela sem dado de uso conta como ocasional; relate a suposicao em Decisoes.
- Pagina de marketing tem no maximo uma entrada de destaque; fade em cada secao e [padrao generico](principles.md#padroes-genericos).
- Dado que o usuario le ou compara so anima quando o valor muda de fato, do antigo para o novo.

Atenuar e uma versao menor do mesmo movimento:

| Hoje | Atenuado |
| --- | --- |
| Hover com escala, elevacao ou sombra crescendo | So cor ou opacidade, ate 150ms |
| Entrada com deslize ou escala em superficie frequente | So opacidade, 150ms, ease-out |
| Stagger acima de 80ms por item ou 300ms no total | 30ms por item, ou o grupo num fade so |
| Loop infinito em elemento persistente | Uma execucao, ou o estado final estatico |

Se a versao atenuada deixa de cumprir o proposito, remova.

## Interfaces fluidas

1. **Resposta.** Feedback no toque, nao na soltura; regras em [interaction.md](interaction.md#resposta).
2. **Manipulacao direta.** Durante o gesto, o elemento acompanha o dedo 1:1 e respeita o ponto onde foi pego.
3. **Interrupcao.** O usuario agarra um elemento em movimento e o inverte sem esperar. Toda nova animacao parte do valor exibido, nao do alvo logico, e preserva a velocidade.
4. **Comportamento, nao roteiro.** Animacao de roteiro fixo nao responde a entrada nova; spring so muda o alvo.
5. **Passagem de velocidade.** Ao soltar, a animacao continua na velocidade do dedo, sem costura.
6. **Projecao de impulso.** O destino sai do ponto projetado, como a rolagem ao desacelerar.
7. **Consistencia espacial.** O que sai por um lado volta por ele; avancar e voltar movem em direcoes opostas. O elemento nasce do gatilho que o abriu; modal fica centrado.
8. **Limites macios.** No limite, resistencia progressiva em vez de parada seca.
9. **Detalhes de gesto.** Destaque no toque, confirme na soltura. Detecte gestos plausiveis em paralelo e cancele os perdedores quando a intencao ficar clara.

## Coreografia

- Para cada evento, de um papel ao que se move: **lider** (o que o usuario precisa notar), **suporte** (movimento menor), **decoracao** (so fade ou nada) e **estatico**. Dois lideres e problema de hierarquia, nao de motion.
- Um container tem uma unica entrada: se o painel entra, o conteudo ja esta nele.
- Saidas sao simultaneas; nao escalone a saida.
- Elemento que sai deixa de ocupar espaco na hora, para os vizinhos fecharem o vao enquanto ele some.
- Sub-animacoes de um componente compartilham a familia de tempo.
- Efeito secundario se prende ao momento do lider (inicio, impacto, assentamento), nao a um atraso que "parece certo".
- O que esta visivel ja e clicavel.

## Curva

| Situacao | Curva |
| --- | --- |
| Elemento entrando ou saindo | ease-out |
| Elemento se movendo ou mudando de forma na tela | ease-in-out |
| Hover e mudanca de cor | ease, ate 150ms |
| Movimento constante (progresso, marquee) | linear |
| Sem certeza | ease-out |

- Nao use ease-in em UI: ele atrasa o inicio, o instante em que o usuario esta olhando.
- Sem curva no projeto, prefira versoes fortes as genericas:

| Nome | Pontos (x1, y1, x2, y2) | Uso |
| --- | --- | --- |
| ease-out forte | 0.23, 1, 0.32, 1 | Entrada e saida |
| ease-in-out forte | 0.77, 0, 0.175, 1 | Movimento na tela |
| drawer estilo iOS | 0.32, 0.72, 0, 1 | Sheet preso a borda, aberto por botao |

## Duracao

| Elemento | Duracao |
| --- | --- |
| Feedback de toque | 100 a 160ms |
| Tooltip, popover pequeno | 125 a 200ms |
| Dropdown, select | 150 a 250ms |
| Modal | 200 a 300ms |
| Sheet preso a borda, com a curva estilo iOS | ate 500ms |
| Drawer flutuante | cerca de 200ms |
| Marketing e explicacao | Pode ser maior |

- Animacao de UI fica abaixo de 300ms. Fora das excecoes da tabela, passar disso precisa de motivo declarado.
- Saida e mais rapida que entrada, cerca de dois tercos.
- Tempo assimetrico: lento onde o usuario decide (segurar para confirmar, cerca de 2s linear), rapido onde o sistema responde (cerca de 200ms ease-out).
- Mudanca de tamanho escala a duracao com a distancia, com piso e teto.

## Spring

- **Damping ratio** controla o overshoot: 1.0 nao passa do alvo; abaixo disso, oscila.
- **Response**, em segundos, e o quao rapido chega ao alvo. Nao e duracao.

| Interacao | Damping | Response |
| --- | --- | --- |
| Padrao de UI | 1.0 | 0.3 a 0.4 |
| Drawer e sheet soltos por gesto | 0.8 | 0.3 |
| Drawer e sheet por botao | 1.0 | 0.3 |
| Gesto com impulso | ~0.8 | 0.3 a 0.4 |

- Bounce so quando o gesto carregou impulso. Em APIs com "bounce", fique entre 0.1 e 0.3.
- Conversao com massa `m` (1 quando a API nao pede): `k = (2 * pi / response)^2 * m`; `c = 4 * pi * damping * m / response`; `bounce` e cerca de `1 - damping`.
- Sem spring na plataforma, use ease-out forte com a duracao da tabela.

## Gesto

- **Direcao:** cerca de 10px de movimento antes de decidir; depois, rastreie 1:1.
- **Dispensar:** ao passar de 40 a 50% do percurso ou de cerca de 0.11 px/ms de velocidade media. Com pontos de encaixe, decida pelo ponto projetado.
- **Projecao:** `posicao + (velocidade em px/s / 1000) * d / (1 - d)`, com `d` cerca de 0.998.
- **Rubber-band:** alem do limite, `(excesso * dimensao * c) / (dimensao + c * |excesso|)`, com `c` cerca de 0.55.
- **Valores ligados:** o que acompanha o arraste (opacidade do overlay, escala do fundo) deriva do progresso, numa fonte unica.
- **Multitoque:** depois que o arraste comeca, ignore toques extras.

## Grupos

- Produto: 30 a 80ms entre itens, total abaixo de cerca de 300ms. Em lista longa, escalone so os primeiros.
- Marketing e primeiro uso: passos de 100 a 150ms em entradas de 0.5 a 0.6s.
- A ordem segue a importancia, nao a ordem do codigo.

## Forma e propriedades

- Entrada por escala parte de 0.9 a 0.97 com opacidade 0, nunca de escala 0. Pressionado: 0.95 a 0.98.
- A origem da transformacao fica onde o movimento nasce fisicamente (o gatilho do popover).
- Anime transformacao e opacidade. Mudanca real de tamanho so curta e isolada; em lista grande, anime por transformacao (FLIP).
- Liste as propriedades animadas; nunca "todas".
- Blur animado abaixo de 20px.

## Movimento reduzido

- Troque deslocamento, spring e parallax por fade curto (cerca de 200ms). Remova overshoot.
- O rastreio 1:1 do gesto continua, porque o movimento vem do usuario.
- Mantenha mudancas de opacidade e cor que explicam o estado.
- Em grupo, tire os atrasos e mostre os itens juntos.
- Evite fundo de tela inteira em movimento e saltos bruscos de brilho.
- Movimento automatico longo segue o piso de pausa de [accessibility.md](accessibility.md#operacao).
