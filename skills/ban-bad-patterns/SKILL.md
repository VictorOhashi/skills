---
name: ban-bad-patterns
description: Aponta e corrige desvios de convencao local, uso de ferramenta e padrao de desenho em um diff ou area indicada, por um revisor critico independente. Use quando o pedido for investigar desvios de arquitetura, abstracoes que dificultam o uso, ferramentas aplicadas fora do contrato ou convencoes que custam mais do que entregam.
---

# Revisao de padroes

Um revisor independente aponta cada desvio do escopo. Prevalece o julgamento dele: confira o relatorio e rejeite so os casos listados no passo 2. Convencao vigente nao e defesa por si: se ela custa mais do que entrega, a propria convencao e achado. Corrija primeiro os achados locais; o redesign estrutural vem depois.

**Atencao:** sem **Corrigir localmente** de `send`, entregue o relatorio sem aplicar nada e pergunte uma vez se deve aplicar.

## Escopo

Use os arquivos ou o diff indicados. Sem indicacao, use o diff da branch contra a base do PR ou a branch padrao, incluindo a arvore de trabalho e os arquivos novos.

## Desvios

Na duvida sobre a justificativa de um desvio, ele e achado.

- **Convencao local:** o trecho contraria regra vigente, decisao de arquitetura, configuracao ou o padrao dos casos analogos.
- **Uso de ferramenta:** o trecho usa versao, comando, API ou configuracao diferente da do projeto e perde uma garantia, como o lockfile ou a validacao do workspace.
- **Convencao a substituir:** a convencao vigente causa erro recorrente, contorno, duplicacao ou atrito demonstravel, e uma alternativa entrega ganho concreto maior que o custo de migrar as ocorrencias. Ser a maioria ou ja existir nao justifica a convencao.
- **Padrao de desenho:** camada que so repassa chamadas, estrategia que multiplica classes, abstracao que o chamador contorna ou decisao repetida em mais de um chamador.

**Nota:** preferencia de estilo sem convencao ou consequencia demonstravel nao e desvio.

## Procedimento

1. Inicie o revisor pela secao da harness. Entregue o escopo, os Desvios e os [Criterios do revisor](#criterios-do-revisor), sem reescreve-los.
2. Confira o relatorio contra o codigo. Rejeite:
   - achado fora do escopo, exceto troca de convencao com ocorrencia no escopo;
   - preferencia de estilo sem convencao ou consequencia demonstravel;
   - convencao citada que nao existe ou nao se aplica ao trecho;
   - troca de convencao sem custo atual demonstrado ou sem ganho maior que o custo da migracao;
   - arquivo ou simbolo errado.
   Os demais achados ficam aceitos. Se a correcao sugerida quebrar um requisito ou um caso legitimo, mantenha o achado, redesenhe a correcao e reclassifique-o por ela.
3. Se rejeitar um achado por convencao inexistente ou que nao se aplica, ou por arquivo ou simbolo errado, rode o revisor mais uma vez so sobre esse achado, nomeando a falha. Se a segunda rodada tambem falhar, relate o achado como aberto. Achado fora do escopo, de estilo ou de troca de convencao sem custo ou ganho demonstrado so exige descartar.
4. **Local.** Aplique os achados locais aceitos e rode a verificacao pertinente. Reverta a correcao que quebrar a verificacao e relate o achado como aberto.

**Atencao:** antes de aplicar uma troca de convencao, escale ao usuario com o custo, o ganho e a migracao. Sem aprovacao, relate a proposta sem aplica-la.

5. **Estrutural.** Aplique cada achado estrutural aceito dentro do escopo em commit separado dos locais. Aplique a troca de convencao so se a migracao de todas as ocorrencias couber no escopo, e atualize na mesma mudanca o registro da convencao antiga: instrucao, regra de lint ou documento. Verifique pela entrada real do chamador afetado. Reverta a correcao que quebrar a verificacao e relate o achado como aberto. Relate o achado fora do escopo, inclusive a troca de convencao que nao cabe nele, e proponha uma issue com a migracao.
6. Se houver reincidencia ou uma correcao explicita do usuario indicar uma classe de erro, proponha a prevencao. Quando autorizada, use `retro-repo` com o caso confirmado e um uso valido que a protecao deve preservar. Se a prevencao acompanha uma troca aplicada, entregue a `retro-repo` a regra nova e a antiga ja retirada.
7. Relate os achados aceitos, os rejeitados com o motivo, as rodadas extras, as correcoes aplicadas e os achados abertos.

## Criterios do revisor

Para cada achado, de o arquivo, o simbolo, a regra ou o caso analogo violado, o efeito no chamador, na manutencao ou no fluxo de trabalho e a menor correcao. Classifique-o:

- **Local:** a correcao nao muda contrato entre modulos. Exemplos: usar o comando, a API ou a configuracao do projeto; seguir a convencao dos casos analogos.
- **Estrutural:** a correcao muda fronteira, abstracao, contrato ou convencao. Siga um uso concreto e diga o que o chamador ganha.

- Convencao inferida exige um caso analogo. Confira se a diferenca tem justificativa no historico, com `git log` e `git blame`, ou numa decisao de arquitetura.
- Em ferramenta, confira a versao e o comando que o projeto usa. Reaproveite diagnosticos existentes, como lint e typecheck.
- Uma camada que so repassa pode esconder uma fronteira publica necessaria. Confira os consumidores antes de propor remove-la.
- Se o trecho diverge de uma convencao que tambem e achado de troca, nao aponte o desvio local: relate o trecho junto com a troca, que decide o destino dele.
- Ao propor troca de convencao, cite o custo atual com ocorrencias, a alternativa, o ganho e as ocorrencias a migrar.
- Nao proponha mudanca sem evidencia. Fora do escopo, proponha so troca de convencao que tenha ocorrencia no escopo.
