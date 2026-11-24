---
name: ban-bad-ui
description: Aponta e corrige inconsistencias de estilo e design, uso incorreto de tokens e falhas do proprio design system em um diff ou area indicada, por um revisor critico independente. Use quando o pedido for auditar a conformidade da UI com o design system, achar valores literais no lugar de tokens, componentes recriados ou contornados, ou um design system incompleto ou incorreto.
---

# Revisao de UI contra o design system

Um revisor independente aponta cada desvio de UI do escopo em relacao ao design system do projeto e aos padroes do app. Prevalece o julgamento dele: confira o relatorio e rejeite so os casos listados no passo 3. Convencao vigente nao e defesa por si: se ela custa mais do que entrega, a propria convencao e achado. Corrija primeiro o uso; a mudanca no design system vem depois.

**Atencao:** sem **Corrigir localmente** de `send`, entregue o relatorio sem aplicar nada e pergunte uma vez se deve aplicar.

## Escopo

Use os arquivos ou o diff indicados. Sem indicacao, use o diff da branch contra a base do PR ou a branch padrao, incluindo a arvore de trabalho e os arquivos novos.

## Fontes do projeto

O design system e o que o projeto define em codigo e em documento:

- tokens de cor, tipografia, espaco, raio, sombra, camada, motion e breakpoint, com a camada (primitivo, semantico, de componente) e o papel documentado de cada um;
- componentes e kits de UI compartilhados, com variantes e estados;
- documentos de decisao e convencao e comentarios que justificam uma escolha no codigo;
- configuracao que impoe o sistema, como tema, preset de estilo e regras de lint de estilo.

Sem design system, os padroes do app sao os casos analogos ja usados. Referencia visual fornecida pelo usuario, como um arquivo de design, mostra a intencao e nao substitui o design system.

## Desvios

Na duvida sobre a justificativa de um desvio, ele e achado.

- **Valor literal:** cor, tipografia, espaco, raio, sombra, camada, duracao ou breakpoint escrito como valor quando um token cobre a propriedade e o papel.
- **Token incorreto:** token fora do papel documentado, como cor de erro usada como decoracao; token primitivo onde existe semantico; token de outro tema, plataforma ou componente; token obsoleto.
- **Componente recriado ou contornado:** controle nativo ou estilizado do zero quando o design system tem o componente; sobrescrita do estilo interno do componente por classe, estilo inline ou seletor; variante criada no chamador.
- **Inconsistencia:** o mesmo elemento resolvido de formas diferentes em casos analogos do app, como alturas de botao, espacamento de formulario ou estados de lista, sem decisao que justifique.
- **Convencao a substituir:** padrao do app ou decisao do design system que causa inconsistencia, contorno ou custo demonstravel, quando uma alternativa entrega ganho concreto maior que o custo de migrar os consumidores. Ser a maioria ou ja existir nao justifica a convencao.
- **Design system incompleto:** falta token, variante, estado ou tema que o uso real pede. O sinal e o mesmo literal ou a mesma sobrescrita em mais de um chamador, ou um token sem valor em um dos temas.
- **Design system incorreto:** token cujo nome contradiz o valor ou o papel; tokens duplicados com o mesmo papel; componente do design system que ignora os proprios tokens; documento que diverge da implementacao; par de cores de um papel de texto abaixo do contraste AA.

**Nota:** preferencia estetica sem token, decisao ou caso analogo nao e desvio.

## Procedimento

1. Levante as [Fontes do projeto](#fontes-do-projeto) que cobrem o escopo e a referencia visual fornecida, se houver. Relate em uma lista curta o que foi lido; o que nao foi encontrado vale como "projeto nao define".
2. Inicie o revisor pela secao da harness. Entregue o escopo, as fontes levantadas com caminhos, a referencia visual como arquivo local ou descricao textual, marcada como intencao, os Desvios e os [Criterios do revisor](#criterios-do-revisor), sem reescreve-los.
3. Confira o relatorio contra o codigo. Rejeite:
   - achado fora do escopo, exceto troca de convencao com ocorrencia no escopo;
   - preferencia estetica sem token, decisao ou caso analogo;
   - troca de convencao sem custo atual demonstrado ou sem ganho maior que o custo da migracao;
   - token, componente, decisao ou caso analogo citado que nao existe ou nao cobre o caso;
   - arquivo, linha ou simbolo errado.
   Os demais achados ficam aceitos. Se a correcao sugerida quebrar um requisito ou um caso legitimo, mantenha o achado, redesenhe a correcao e reclassifique-o por ela.
4. Se rejeitar um achado por fonte inexistente ou que nao cobre o caso, ou por arquivo, linha ou simbolo errado, rode o revisor mais uma vez so sobre esse achado, nomeando a falha. Se a segunda rodada tambem falhar, relate o achado como aberto. Achado fora do escopo, de preferencia estetica ou de troca de convencao sem custo ou ganho demonstrado so exige descartar.
5. Se um achado aceito depende de divergencia entre a referencia visual e o design system, escale a divergencia como pergunta e nao aplique o achado ate a resposta.
6. **Uso.** Aplique os achados de uso aceitos. Rode a verificacao pertinente e confira as telas afetadas pela validacao de UI de `verification`. Reverta a correcao que quebrar a verificacao e relate o achado como aberto.
7. Se a correcao de um achado de sistema altera arquivo fora do escopo, renomeia ou retira token ou componente com consumidor fora do escopo, muda o que um consumidor fora do escopo renderiza, troca uma convencao com ocorrencia fora do escopo ou depende de design system em outro repositorio ou pacote, nao a aplique: relate o achado e proponha uma issue com a migracao. O registro da convencao trocada nao conta como arquivo fora do escopo.

**Atencao:** antes de aplicar uma troca de convencao, escale ao usuario com o custo, o ganho e a migracao. Sem aprovacao, relate a proposta sem aplica-la.

8. **Sistema.** Aplique cada um dos demais achados de sistema aceitos em commit separado dos de uso. Na troca de convencao, atualize na mesma mudanca o registro da convencao antiga: instrucao, regra de lint ou documento. Migre para o token ou componente corrigido os chamadores do escopo. Rode a verificacao pertinente e confira os consumidores afetados pela validacao de UI de `verification`. Reverta a correcao que quebrar a verificacao e relate o achado como aberto.
9. Se o mesmo desvio de uso aparecer em mais de um ponto, se houver reincidencia ou se uma correcao explicita do usuario indicar uma classe de erro, proponha a prevencao. Quando autorizada, use `retro-repo` com o caso confirmado, o token ou componente correto e um uso valido que a protecao deve preservar, como o arquivo que define os tokens. Se a prevencao acompanha uma troca aplicada, entregue a `retro-repo` a regra nova e a antiga ja retirada.
10. Relate as fontes lidas, os achados aceitos, os rejeitados com o motivo, as divergencias escaladas, as rodadas extras, as correcoes aplicadas, a validacao de UI e os achados abertos.

## Criterios do revisor

Para cada achado, de o arquivo, a linha ou o simbolo, o desvio, o token, componente, decisao ou caso analogo violado, o efeito e a menor correcao. O efeito diz o que o usuario ou o mantenedor perde, como tela que destoa, tema que quebra ou mudanca de token que nao propaga. Classifique-o:

- **Uso:** a correcao fica no chamador e usa o que o design system ja tem. Exemplos: trocar o literal pelo token; usar o componente; retirar a sobrescrita.
- **Sistema:** a correcao muda o design system ou uma convencao de UI do app: cria, corrige, renomeia ou retira token, variante, estado, componente ou padrao. Cite os chamadores que ganham com ela.

- Valor no arquivo que define os tokens e definicao, nao valor literal. No codigo do componente do design system, literal com token correspondente e achado de sistema.
- Sem token para a propriedade, literal repetido em mais de um chamador e achado de sistema; literal unico sem token nao e achado.
- Convencao inferida exige caso analogo. Confira se a diferenca tem justificativa no historico, com `git log` e `git blame`, ou numa decisao documentada.
- Antes de propor renomear ou retirar um token ou componente, conte os consumidores, inclusive fora do escopo.
- Reaproveite diagnosticos existentes, como lint de estilo e typecheck de tema.
- Se o trecho diverge de uma convencao que tambem e achado de troca, nao aponte o desvio local: relate o trecho junto com a troca, que decide o destino dele.
- Ao propor troca de convencao, cite o custo atual com ocorrencias, a alternativa, o ganho e as ocorrencias a migrar.
- Nao proponha mudanca sem evidencia. Fora do escopo, proponha so troca de convencao que tenha ocorrencia no escopo.
