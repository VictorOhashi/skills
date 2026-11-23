# Anti-padroes

Escolhas que agentes fazem por padrao e que pioram a interface. Cada linha diz o sintoma, por que falha e a correcao.

## Hierarquia e layout

| Anti-padrao | Por que falha | Correcao |
| --- | --- | --- |
| Tudo com o mesmo peso visual | Nada guia o olhar | Uma coisa principal; rebaixar o secundario |
| Varias acoes primarias no mesmo contexto | O usuario nao sabe qual e o caminho | Uma primaria; demais secundarias |
| Cartao dentro de cartao dentro de cartao | Bordas competem com o conteudo | [layout.md](layout.md#agrupamento-e-mapeamento) |
| Divisoria entre cada item, fora de lista nativa da plataforma | Ruido onde o espaco bastava | Espaco entre grupos maior que dentro deles |
| Espacos fora da escala do projeto | Ritmo irregular | Valores da escala |
| Texto centralizado em bloco longo | Leitura cansa, margens irregulares | Alinhar ao inicio |
| Layout que salta quando a imagem ou o valor carrega | Perde o lugar do usuario | Reservar o espaco |
| Cor semantica como decoracao | O usuario le alerta onde nao ha | Cor semantica so com sentido |

## Tipografia e texto

| Anti-padrao | Por que falha | Correcao |
| --- | --- | --- |
| Hierarquia so por tamanho | Saltos grandes e telas barulhentas | Tamanho, peso e entrelinha juntos |
| Linha de leitura de borda a borda | Olho perde a linha seguinte | Medida de [typography.md](typography.md#medida-e-entrelinha) |
| Mesmo tracking em todos os tamanhos | Titulo grande fica frouxo | Tracking por tamanho |
| Numero que treme ao mudar ou coluna desalinhada | Algarismos proporcionais | Algarismos tabulares |
| "1 membros", "0 membro" | Plural fixo | Regras de plural do idioma |
| `1284`, separador fixo, `NaN` na tela | Numero cru | Formatar pelo locale; tratar nulo |
| "Ha 340 dias" | Tempo relativo longo nao informa | Regra de tempo em [content.md](content.md#formatacao) |
| Botao "OK" em decisao ambigua | O usuario nao sabe o que confirma | Verbo da acao |
| Erro tecnico cru na tela | O usuario nao sabe o que fazer | O que falhou e como seguir |

## Conteudo e estados

| Anti-padrao | Por que falha | Correcao |
| --- | --- | --- |
| Projetar so com o dado de demonstracao | Quebra no primeiro dado real | Pior caso de [content.md](content.md#pior-caso) |
| Texto que transborda o container | Filho flexivel sem largura minima zero, string sem ponto de quebra | Permitir encolher e quebrar em qualquer ponto so quando preciso |
| Avatar ou icone achatado | Elemento de tamanho fixo encolhendo | Impedir que encolha |
| Acao final empurrada para fora da linha | O meio ocupou todo o espaco | Meio encolhe, acao fica fixa |
| Texto truncado sem como ler o resto | Informacao perdida | Valor inteiro em dica ou detalhe |
| Truncar no fim nomes que diferem no fim | Itens ficam identicos | Truncar no meio |
| Botao de largura fixa | Traducao estoura | [typography.md](typography.md#texto-de-interface) |
| Linha vazia ou traco orfao no lugar do campo ausente | Parece erro | Omitir ou reservar de proposito |
| Imagem quebrada sem fallback | Icone de erro do sistema | Iniciais ou icone |
| Sem estado vazio, de erro ou de carregamento | Tela em branco ou improvisada | Os estados de [content.md](content.md#estados) |
| Lista de 1.000+ itens renderizada inteira | Rolagem engasga | Virtualizar ou paginar |

## Acessibilidade

| Anti-padrao | Por que falha | Correcao |
| --- | --- | --- |
| Estado so por cor | Quem nao distingue a cor perde o estado | Icone, texto ou marca junto |
| Texto cinza claro sobre branco | Contraste abaixo do AA | Contraste de [accessibility.md](accessibility.md#percepcao) |
| Alvo de toque pequeno | Erro de toque | Alvos de [accessibility.md](accessibility.md#operacao) |
| Foco invisivel | Teclado se perde | Indicador de foco com contraste |
| Placeholder como rotulo | Some ao digitar | Rotulo visivel |
| Validacao so no envio | O usuario descobre tudo no fim | Validar em linha |
| Altura fixa em bloco de texto | Texto ampliado e cortado | Altura pelo conteudo |

## Motion

### Decidir se anima

| Anti-padrao | Por que falha | Correcao |
| --- | --- | --- |
| Animar atalho de teclado, paleta de comandos, salto de foco ou navegacao por setas | Repetida centenas de vezes, qualquer duracao vira atraso | Sem animacao ([motion-values.md](motion-values.md#frequencia)) |
| Animar navegacao principal, troca de aba ou rota interna na web | Alta frequencia, o usuario espera a cada uso | Sem animacao; em app mobile, transicao nativa da plataforma |
| Fade-in ao rolar em toda secao | Segura conteudo e se repete a cada visita | [motion-values.md](motion-values.md#frequencia) |
| Numero contando a partir de zero ao carregar | Decoracao sobre dado que o usuario quer ler | Regra de dado em [motion-values.md](motion-values.md#frequencia) |
| Grafico redesenhando do zero a cada refresh | Idem | Transicao so entre o valor antigo e o novo |
| Loop infinito em elemento persistente (pulso, brilho, shimmer fora de loading) | Rouba atencao para sempre | Uma vez, ou estado final estatico |
| Spinner ou skeleton em espera curta | O flash parece defeito | Atraso de [content.md](content.md#estados) |
| Escala ou elevacao no hover de card secundario | Ruido em superficie varrida pelo cursor | [motion-values.md](motion-values.md#frequencia) |

### Curva e tempo

| Anti-padrao | Por que falha | Correcao |
| --- | --- | --- |
| ease-in em entrada | Atrasa o instante em que o usuario olha | ease-out forte |
| Curva generica (ease ou ease-out padrao da CSS) em entrada, saida ou movimento, onde o projeto nao define curva | Falta firmeza, parece generico | Curvas fortes de [motion-values.md](motion-values.md#curva) |
| Mesma duracao para tudo, ou UI acima de 300ms sem motivo | Parece lento e uniforme | Duracao de [motion-values.md](motion-values.md#duracao) |
| Saida tao lenta quanto a entrada | O usuario ja decidiu sair | Saida mais curta |
| Bounce em menu, dialog ou elemento sem impulso | Overshoot sem causa fisica | [motion-values.md](motion-values.md#spring) |
| Transicao em todas as propriedades | Anima o que nao devia e custa desempenho | Listar so as propriedades necessarias |
| Animar largura, altura, margem ou posicao de layout (topo, esquerda) em lista grande ou elemento que se move com outros | Refaz layout a cada quadro e engasga | Transformacao e opacidade; mudanca de tamanho curta e isolada ou por FLIP, conforme [motion-values.md](motion-values.md#propriedades) |

### Espaco e forma

| Anti-padrao | Por que falha | Correcao |
| --- | --- | --- |
| Entrada a partir de escala 0 | Nada no mundo real surge do nada | [motion-values.md](motion-values.md#forma-e-profundidade) |
| Popover ou menu crescendo do proprio centro | Perde a ligacao com o gatilho | Origem no gatilho |
| Modal crescendo do gatilho | Modal e global, nao pertence ao botao | Modal centrado |
| Entrar por um lado e sair por outro | Quebra o modelo espacial | Mesmo caminho na saida |
| Avancar e voltar deslizando para o mesmo lado | O movimento contradiz a acao | Direcoes opostas |
| Material translucido sobre material translucido | Legibilidade cai | Uma camada translucida por vez |

### Resposta e gesto

| Anti-padrao | Por que falha | Correcao |
| --- | --- | --- |
| Feedback so na soltura | Parece morto | Feedback no toque |
| Bloquear entrada durante transicao | O usuario espera a animacao | Interrupcao a qualquer momento |
| Animacao nova partindo do alvo anterior | Salto visivel ao interromper | Partir do valor exibido |
| Animacao por roteiro fixo em elemento interrompivel | Reinicia do zero ao ser disparada de novo | Transicao reajustavel ou spring |
| Arraste que salta o elemento para o centro do dedo | Quebra a manipulacao direta | Respeitar o ponto onde foi pego |
| Exigir distancia minima para dispensar | Um flick rapido nao funciona | Dispensar tambem por velocidade |
| Encaixar no snap mais proximo da soltura | Ignora para onde o gesto ia | Snap mais proximo do ponto projetado |
| Parada seca no limite | Parece travamento | Rubber-band |
| Feedback apenas ao concluir o gesto | Sem continuidade durante o arraste | Rastreio 1:1 o tempo todo |
| Hover com movimento em tela de toque | Toque dispara hover falso e ele gruda | [motion-values.md](motion-values.md#frequencia) |
| Atraso em cada tooltip de um grupo | A barra inteira parece lenta | Sem atraso depois do primeiro |

### Grupos

| Anti-padrao | Por que falha | Correcao |
| --- | --- | --- |
| Pai entra e filhos fazem stagger | Duas camadas de entrada, o usuario espera as duas | [principles.md](principles.md#coreografia) |
| Stagger em lista ou menu frequente | Encanta na primeira vez, atrasa nas outras | Itens juntos |
| Stagger uniforme | Metronomo, igual a curva linear | Intervalo e tratamento por importancia |
| Item 20 esperando 20 vezes o intervalo | Fim da lista chega tarde | Escalonar so os primeiros |
| Saida em stagger reverso | Prolonga uma decisao ja tomada | [principles.md](principles.md#coreografia) |
| Vao fechando so depois da saida terminar | Dois movimentos em fila | Vizinhos fecham enquanto o item some |
| Sub-animacoes do mesmo componente com tempos diferentes | Parece dois objetos | Mesma familia de tempo |

### Acessibilidade e feedback

| Anti-padrao | Por que falha | Correcao |
| --- | --- | --- |
| Ignorar movimento reduzido | Causa desconforto vestibular | [motion-values.md](motion-values.md#movimento-reduzido) |
| Movimento reduzido removendo todo feedback | O usuario perde o estado | Manter opacidade e cor |
| Haptica ou som fora do quadro do visual | Desfaz a causalidade | Mesmo quadro |
| Haptica em toda interacao | O usuario passa a ignorar | So em commit, sucesso, erro e encaixe |
