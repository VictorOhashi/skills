# Texto de interface

Palavras sao conteudo de design, nao decoracao: existem para a interface ser entendida e usada. Lingua, tom e glossario vem da localizacao do projeto.

## Principios

- Escreva do ponto de vista de quem usa. O usuario gerencia notificacoes, nao configura webhooks.
- Especifico vence generico e vence esperto. "Faturas", nao "Geral".
- Frase curta, voz ativa, sem enchimento. Corte metade das palavras quando der.
- Cada elemento de texto faz um trabalho so. Rotulo que explica o obvio sai.
- Ajuda em linha, perto de onde e usada, antes de tooltip ou pagina de ajuda.

## Acoes

- Botao diz o que acontece: verbo e objeto ("Salvar fatura", "Agendar 9h30"), nao "OK", "Enviar" ou "Sim".
- A acao mantem o nome no fluxo inteiro: o botao "Publicar" gera a mensagem "Publicado".
- Acao que abre um passo seguinte antes de agir indica isso, pela convencao da plataforma (reticencias em "Renomear…").
- Link diz para onde leva; "clique aqui" nao diz nada.

## Erros

- O piso esta em [accessibility.md](accessibility.md#compreensao): o problema e a correcao, sem codigo cru.
- Diga tambem quem corrige, e o motivo quando ajuda a decidir.
- Sem culpar o usuario e sem desculpa vaga.
- O erro aparece perto da causa: no campo, no item, na acao.

## Confirmacao e sucesso

- Confirmacao de acao destrutiva nomeia o objeto e a consequencia ("Excluir o projeto Atlas e seus 12 arquivos?"). O botao repete a acao ("Excluir projeto").
- Mensagem de sucesso confirma o que foi feito, com o mesmo verbo da acao.

## Consistencia

- O mesmo conceito tem o mesmo nome em toda a interface. Sinonimos parecem coisas diferentes.
- Use o glossario do produto. Sem glossario, mantenha o primeiro termo usado.
- Caixa de titulos e botoes segue uma regra so, a da localizacao do projeto.
- Botao tem largura pelo conteudo, com minimo, para caber a traducao.

## Formatacao

- Numero, moeda, data e tempo relativo pelo locale do usuario, com as APIs de formatacao da plataforma. Nunca separador fixo no codigo.
- Tempo relativo vira data absoluta depois de cerca de uma semana. "Agora" no lugar de "0 segundos atras".
- Plural pelas regras do idioma ("1 membro", "2 membros"), nunca fixo.
- Nulo nunca aparece como texto ("null", "undefined", "NaN").
- Iniciais de avatar por grafema, com primeira e ultima palavra e icone de fallback.
- Nome de marca, codigo e identificador nao passam por traducao automatica.
