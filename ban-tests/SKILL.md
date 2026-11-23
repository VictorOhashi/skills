---
name: ban-tests
description: Aponta e retira testes que nao protegem uma regra do produto em um diff ou conjunto de arquivos, por um revisor critico independente. Use quando o pedido for limpar testes duplicados, de tooling interno ou que repetem a implementacao.
---

# Testes de regras do produto

Um revisor independente aponta cada teste do escopo que nao protege uma regra do produto. Prevalece o julgamento dele: confira o relatorio e rejeite so os casos listados no passo 2. Retire e consolide primeiro; a falta de cobertura vira pendencia resolvida depois.

**Atencao:** sem **Corrigir localmente** de `send`, entregue o relatorio sem aplicar nada e pergunte uma vez se deve aplicar.

## Escopo

Use os arquivos ou o diff indicados. Sem indicacao, use o diff da branch contra a base do PR ou a branch padrao, incluindo a arvore de trabalho e os arquivos novos.

## Teste que vale manter

So fica o teste que nomeia uma regra do produto e uma regressao que ele detecta. Na duvida, o teste e achado.

- Testes com entradas parecidas ficam quando falham por motivos diferentes.
- O resultado esperado vem de um exemplo conhecido ou do contrato, nao de repetir o calculo da implementacao.
- Comando entregue ao usuario tem contrato testavel. Script exclusivo do desenvolvimento nao precisa de teste permanente.

## Procedimento

1. Inicie o revisor pela secao da harness. Entregue o escopo, o Teste que vale manter e os [Criterios do revisor](#criterios-do-revisor), sem reescreve-los.
2. Confira o relatorio contra o codigo. Rejeite:
   - achado fora do escopo;
   - arquivo ou teste errado;
   - **remover** ou **consolidar** sem o teste que continua detectando cada regressao, quando ha regra do produto envolvida;
   - **remover** de teste que falha por defeito legitimo do produto.
   Os demais achados ficam aceitos. Teste rejeitado por defeito legitimo do produto vira **Pendencia** de corrigir o produto.
3. Se rejeitar um achado por arquivo ou teste errado ou por cobertura nao demonstrada, rode o revisor mais uma vez so sobre esse achado, nomeando a falha. Se a segunda rodada tambem falhar, relate o achado como aberto. Achado fora do escopo so exige descartar.
4. **Remover e consolidar.** Aplique os achados aceitos e rode a suite afetada. Reverta a mudanca que introduzir falha nova na suite e relate o achado como aberto.
5. **Pendencias.** Em commit separado, resolva cada pendencia aceita dentro do escopo. Relate a pendencia fora do escopo e proponha uma issue.
6. Relate os achados aceitos, os rejeitados com o motivo, as rodadas extras, os testes removidos e consolidados, as pendencias resolvidas e as abertas.

## Criterios do revisor

Para cada teste questionado, de o arquivo, o nome do teste, a regra do produto e a regressao que ele detecta, ou diga que nao ha. Para regressao sem teste, de o arquivo de produto e a regra. Classifique-o:

- **Remover:** nenhuma regra do produto envolvida, ou outro teste detecta as mesmas regressoes. Cite esse teste.
- **Consolidar:** testes que falham pelo mesmo motivo. Diga qual continua detectando cada regressao.
- **Manter:** cite a regra e a regressao.
- **Pendencia:** a mudanca e de codigo, com arquivo e menor correcao.
  - Teste que falha por defeito legitimo do produto: corrigir o produto; o teste fica.
  - Assercao que repete o calculo da implementacao: derivar o esperado de exemplo ou contrato.
  - Regressao de produto sem teste no escopo: escrever o menor teste que a detecte, de preferencia de integracao pela entrada real.

- Compare testes sob a mesma falha antes de propor consolidacao.
- Nao proponha mudanca fora do escopo nem sem evidencia.
