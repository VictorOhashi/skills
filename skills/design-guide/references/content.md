# Conteudo e estados

Dado de demonstracao e escolhido, sem ninguem notar, para o design ficar bonito: nomes que cabem numa linha, contagens sem separador, todo campo opcional preenchido. Este arquivo desfaz essa escolha.

## Regras

- Todo valor de pior caso e plausivel ou e o limite real do contrato (schema, coluna do banco, API). Texto aleatorio gigante nao prova nada.
- Sem limite no contrato, e o layout nao absorve o valor longo, e achado **Fragil**: relate "sem limite".
- Se o limite do formulario e menor que o do armazenamento, o maior chega um dia (importacao, API); projete para ele.
- O pior caso entra pela mesma fronteira do dado de demonstracao (fixture, mock, props, story). Nao edite o componente para forcar a quebra.
- Espalhe as falhas pelos itens de uma lista, como dado real faz: item 1 com nome longo, item 2 com email longo, item 3 com nome de uma letra.
- Use dominios `example.com` e `.test` em emails e URLs de teste. Dado de teste segue a regra de dado real de usuario do perfil.

## Pior caso

| Tipo | Valores que quebram |
| --- | --- |
| Nome de pessoa | Longo e composto com acentos; uma ou duas letras; sobrenome com particula ("de la Cruz"); CJK sem espaco; RTL; comecando com emoji; com espacos extras; ausente |
| String sem espaco | Email longo, URL com caminho e query, UUID, nome de arquivo com versao no fim, palavra composta alema |
| Texto vindo do dado | Cargo longo, status longo em badge, traducao cerca de 30% maior, doze tags num item, titulo vazio, quebra de linha em campo de uma linha, texto colado de 2.000 caracteres, marcacao que deve aparecer literal |
| Numero e dinheiro | 0, 1, milhar sem separador, milhao, valor negativo, porcentagem acima de 100, nulo ou NaN, erro de ponto flutuante, locale com virgula decimal, valor que muda ao vivo |
| Colecao | Vazia, um item, exatamente o tamanho da pagina e mais um, 1.000+ sem paginacao, um item 10 vezes maior, itens com nomes iguais |
| Tempo | Agora, 12 dias, 11 meses, 3 anos, data futura, data zero, horario perto da meia-noite em outro fuso, duracao muito longa |
| Imagem | URL quebrada, sem imagem, panorama, imagem muito alta, logo escuro no tema escuro, carregamento lento |
| Estado | Carregando, erro da API, dado parcial, todos os status de um enum juntos, sem permissao, o proprio usuario na lista |

## Quebrar, truncar ou limitar

Decida por campo, nunca globalmente:

- **Quebre** o texto que o usuario precisa ler inteiro para identificar algo (nomes, titulos em detalhe). Duas linhas costumam bastar; quatro indicam coluna estreita demais.
- **Trunque no fim** o metadado secundario cujo inicio carrega o sentido (cargo, descricao, previa de mensagem). Sempre de um jeito de ver o valor inteiro.
- **Trunque no meio** quando os itens diferem no fim (arquivos, emails com dominio longo comum, caminhos, hashes).
- **Limite linhas** em previas de cartao, para a altura ficar previsivel.
- **Nunca trunque** numero, valor, data ou o que o usuario compara.

## Formatacao

- Numero, moeda, data e tempo relativo pelo locale do usuario, com as APIs de formatacao da plataforma. Nunca separador fixo no codigo.
- Tempo relativo vira data absoluta depois de cerca de uma semana. "Agora" no lugar de "0 segundos atras".
- Plural pelas regras do idioma ("1 membro", "2 membros"), nunca fixo.
- Nulo nunca aparece como texto ("null", "undefined", "NaN").
- Iniciais de avatar por grafema, com primeira e ultima palavra e icone de fallback.

## Estados

Toda tela e componente com dado tem os estados abaixo projetados, nao improvisados:

| Estado | O que precisa |
| --- | --- |
| Vazio | Explica o que aparece ali e oferece a proxima acao. Diferencie "ainda nao ha nada" de "o filtro nao achou nada". |
| Carregando | Placeholder com o layout final, para nada saltar. So aparece se a espera passar de cerca de 300ms. |
| Erro | Diz o que falhou e como seguir (tentar de novo, corrigir o campo). Mantem o que o usuario ja digitou. |
| Parcial | Campo opcional ausente some ou reserva o espaco de proposito; linhas continuam alinhadas. |
| Sem permissao | Acao indisponivel fica clara, com o motivo quando ajuda; o layout nao muda. |
| Sucesso | Confirma acao importante; nao interrompe acao frequente. |
| Offline e conflito | Quando o produto sincroniza, o usuario sabe o que foi salvo. |

## Ambiente

Depois de trocar o dado, troque o ambiente:

- Container na largura real, na menor (cerca de 320px ou o menor celular suportado) e na maior suportada.
- Texto ampliado a 200%.
- Tema escuro, RTL e outros idiomas, quando o produto suportar.
- Toque: acao que so aparece no hover fica inalcancavel.
