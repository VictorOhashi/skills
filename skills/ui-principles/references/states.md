# Estados e dados reais

O caminho feliz e um estado entre muitos. O dado de demonstracao e escolhido, sem ninguem notar, para o desenho ficar bonito: nomes que cabem numa linha, contagens pequenas, todo campo opcional preenchido. Este arquivo desfaz essa escolha.

## Catalogo

Percorra cada grupo. Marque cada estado como "se aplica" (com o que a tela mostra), "nao se aplica" (com o motivo) ou "pergunta aberta".

### Dado

| Estado | Quando se aplica | O que precisa |
| --- | --- | --- |
| Padrao | Sempre | Dado plausivel e variado, nao o melhor caso. |
| Vazio, primeiro uso | Nunca houve dado aqui | Explica o que aparece ali e oferece a proxima acao. |
| Vazio por filtro | Busca ou filtro esconde tudo | Diz o que foi filtrado e oferece limpar o filtro. |
| Um item, poucos | Lista, tabela, grade | O layout continua parecendo intencional. |
| Muitos | Colecao que cresce | Rolagem, cabecalho fixo, paginacao ou "Ver todos (60)". |
| Texto longo | Nome, titulo, nota, numero | Ver [Texto longo](#texto-longo). |
| Campo opcional ausente | Dado opcional | Some ou reserva o espaco de proposito; linhas continuam alinhadas. |

### Sistema

| Estado | Quando se aplica | O que precisa |
| --- | --- | --- |
| Primeiro carregamento | Dado vem de fora | Placeholder com o layout final, nos tempos de [interaction.md](interaction.md#resposta). |
| Atualizacao | Dado muda com a tela aberta | O conteudo fica; um indicador pequeno aparece. Sem placeholder de tela inteira. |
| Falha ao carregar | Toda busca | Diz o que falhou e oferece tentar de novo. |
| Falha parcial | Varias fontes ou itens | O que carregou aparece; o item que falhou mostra o erro no lugar. |
| Lento | Operacao de segundos | Diz que continua, nos tempos de [interaction.md](interaction.md#resposta); nunca uma tela congelada. |
| Offline | Produto online | Mantem o ultimo dado, diz desde quando e o que ficou na fila. |
| Mudou enquanto via | Dado compartilhado ou ao vivo | Avisa e oferece revisar, sem trocar o conteudo sob o cursor. |
| Ja feito por outra pessoa | Mais de uma pessoa age no mesmo item | Diz quem fez e quando. |
| Expirado | Link, sessao, aprovacao, oferta | Diz que expirou e como conseguir outro. |

### Atividade

| Estado | Quando se aplica | O que precisa |
| --- | --- | --- |
| Em andamento | Trabalho longo ou em segundo plano | Etapas feitas, atual e proximas. |
| Aguardando outra pessoa | Aprovacao, resposta | Diz de quem depende. |
| Concluido agora | Depois de uma acao | Confirma acao importante; nao interrompe acao frequente. |
| Janela de desfazer | Acao reversivel | Desfazer visivel pelo tempo combinado, e o que acontece se desfazer falhar. |
| Pausado ou falhou | O que pode parar | Pausado (neutro, retomar) se distingue de falhou (erro, tentar de novo). |

### Pessoas

| Estado | Quando se aplica | O que precisa |
| --- | --- | --- |
| Papel e permissao | Mais de um tipo de usuario | Acao indisponivel fica clara, com o motivo quando ajuda; o layout nao muda. |
| Primeira vez ou recorrente | Onboarding, conta nova | A primeira vez orienta; o uso diario nao repete a orientacao. |
| Pendente de aprovacao | O que alguem precisa confirmar | Diz o que falta e de quem. |

### Interacao

Normal, hover, pressionado, foco por teclado, desabilitado, carregando e selecionado vem da matriz de estados do design system. Desenhe na tela so o estado que muda layout ou conteudo, como botao que troca o rotulo ao carregar. Regras em [interaction.md](interaction.md#estados-do-controle).

## Pior caso

Regras:

- Todo valor de pior caso e plausivel ou e o limite real do contrato (schema, coluna, API). Texto aleatorio gigante nao prova nada.
- Sem limite no contrato, e o layout nao absorve o valor longo, e achado **Fragil**: relate "sem limite".
- Se o limite do formulario e menor que o do armazenamento, o maior chega um dia por importacao ou API; projete para ele.
- Espalhe as falhas pelos itens de uma lista, como dado real faz: item 1 com nome longo, item 2 com email longo, item 3 com nome de uma letra.
- Use dominios `example.com` e `.test` em emails e URLs de teste. Dado de teste segue a regra de dado real de usuario do perfil.

| Tipo | Valores que quebram |
| --- | --- |
| Nome de pessoa | Longo e composto com acentos; uma ou duas letras; particula ("de la Cruz"); CJK sem espaco; RTL; comecando com emoji; espacos extras; ausente |
| String sem espaco | Email longo, URL com caminho e query, UUID, nome de arquivo com versao no fim, palavra composta alema |
| Texto vindo do dado | Cargo longo, status longo em badge, traducao cerca de 30% maior, doze tags num item, titulo vazio, quebra de linha em campo de uma linha, texto colado de 2.000 caracteres, marcacao que deve aparecer literal |
| Numero e dinheiro | 0, 1, milhar, milhao, negativo, porcentagem acima de 100, nulo ou NaN, erro de ponto flutuante, locale com virgula decimal, valor que muda ao vivo |
| Colecao | Vazia, um item, tamanho da pagina mais um, 1.000+ sem paginacao, um item 10 vezes maior, itens com nomes iguais |
| Tempo | Agora, 12 dias, 11 meses, 3 anos, data futura, data zero, perto da meia-noite em outro fuso, duracao muito longa |
| Imagem | URL quebrada, sem imagem, panorama, imagem muito alta, logo escuro no tema escuro, carregamento lento |
| Estado | Carregando, erro da API, dado parcial, todos os valores de um enum juntos, sem permissao, o proprio usuario na lista |

## Texto longo

Decida por campo, nunca globalmente:

- **Quebre** o texto que o usuario precisa ler inteiro para identificar algo (nome, titulo em detalhe). Duas linhas costumam bastar; quatro indicam coluna estreita demais.
- **Trunque no fim** o metadado cujo inicio carrega o sentido (cargo, descricao, previa de mensagem), sempre com um jeito de ver o valor inteiro.
- **Trunque no meio** quando os itens diferem no fim (arquivo, email com dominio comum, caminho, hash).
- **Limite linhas** em previa de cartao, para a altura ficar previsivel.
- **Nunca trunque** numero, valor, data ou o que o usuario compara.

## Ambiente

Depois de trocar o dado, troque o ambiente:

- Container na largura real, na menor (cerca de 320px ou o menor celular suportado) e na maior suportada.
- Texto ampliado a 200%.
- Tema escuro, RTL e outros idiomas, quando o produto suportar.
- Toque, quando o produto aceita toque.
- Rede lenta e falha de rede, para ver carregamento e erro de verdade.
