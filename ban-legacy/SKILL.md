---
name: ban-legacy
description: Aponta e retira codigo legado em um diff ou area indicada, por um revisor critico independente. Use quando o pedido for migrar chamadores e retirar APIs substituidas, flags encerradas, adaptadores de transicao e caminhos mortos.
---

# Limpeza de legado

Um revisor independente aponta cada caminho legado do escopo. Prevalece o julgamento dele: confira o relatorio e rejeite so os casos listados no passo 2. Retire primeiro os caminhos sem consumidor; a migracao de chamadores vem depois.

**Atencao:** sem **Corrigir localmente** de `send`, entregue o relatorio sem aplicar nada e pergunte uma vez se deve aplicar.

## Escopo

Use os arquivos ou o diff indicados. Sem indicacao, use o diff da branch contra a base do PR ou a branch padrao, incluindo a arvore de trabalho e os arquivos novos.

## Legado

API substituida, flag encerrada, adaptador de transicao, ramificacao de versao nao suportada e caminho sem chamador. Compatibilidade so fica com consumidor e condicao de retirada nomeados.

## Procedimento

1. Inicie o revisor pela secao da harness. Entregue o escopo, o Legado e os [Criterios do revisor](#criterios-do-revisor), sem reescreve-los.
2. Confira o relatorio contra o codigo. Rejeite:
   - achado fora do escopo;
   - arquivo ou simbolo errado;
   - **remover** ou **migrar** com consumidor que o revisor nao rastreou, como exportacao publica, registro dinamico, configuracao ou dado persistido.
   Os demais achados ficam aceitos.
3. Se rejeitar um achado por arquivo ou simbolo errado ou por consumidor nao rastreado, rode o revisor mais uma vez so sobre esse achado, nomeando a falha. Se a segunda rodada tambem falhar, relate o achado como aberto. Achado fora do escopo so exige descartar.
4. **Remover.** Retire os caminhos aceitos e as flags, exemplos e testes que so serviam a eles. Atualize os tipos, exemplos e documentacao apontados. Verifique o fluxo substituto e um caso de compatibilidade em risco. Reverta a remocao que quebrar a verificacao e relate o achado como aberto.
5. **Migrar.** Em commit separado, migre cada consumidor sob controle do projeto e dentro do escopo para o substituto e atualize os tipos, exemplos e documentacao apontados. Verifique pela entrada real do consumidor. Retire o caminho antigo quando nenhum consumidor restar; senao relate-o como **Manter**, com o consumidor e a condicao de retirada. Consumidor de outro dono ou fora do escopo vira proposta de issue.
6. Relate os achados aceitos, os rejeitados com o motivo, as rodadas extras, as remocoes, as migracoes, as compatibilidades mantidas com a condicao de retirada e os itens a confirmar.

## Criterios do revisor

Para cada caminho, de o arquivo, o simbolo, o substituto ou a mudanca que o tornou obsoleto e os consumidores encontrados. Classifique-o:

- **Remover:** nenhum consumidor ativo.
- **Migrar:** so consumidores sob controle do projeto; liste cada um e a verificacao pela entrada real.
- **Manter:** consumidor externo, versao suportada ou dado persistido ainda depende dele; nomeie o consumidor e a condicao que permite retira-lo.
- **Confirmar:** a evidencia nao decide entre os casos acima; diga o que falta confirmar.

- Idade, nome e anotacao de depreciacao sao pistas, nao prova.
- Rastreie exportacoes publicas, registros dinamicos, configuracao, versoes suportadas e leitura de dados antigos. Uma busca textual vazia so cobre referencias diretas.
- Aponte tipos, exemplos e documentacao que ainda descrevem o caminho antigo.
- Flag, exemplo ou teste associado sai so quando a regra de produto que protegia saiu ou continua coberta.
- Nao proponha mudanca fora do escopo nem sem evidencia.
