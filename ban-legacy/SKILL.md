---
name: ban-legacy
description: Audita e limpa codigo legado em um diff ou area indicada. Use quando o pedido for migrar chamadores e retirar APIs substituidas, flags encerradas, adaptadores de transicao e caminhos mortos.
---

# Limpeza de legado

Execute `audit` com os criterios abaixo e o revisor da secao da harness. Para cada candidato a remocao, determine qual contrato ele ainda atende.

- Identifique o substituto ou a mudanca que tornou o caminho obsoleto. Idade, nome e anotacao de depreciacao servem como pistas.
- Rastreie quem ainda pode ativa-lo. Confira exportacoes publicas, registros dinamicos, configuracao, versoes suportadas e leitura de dados antigos quando se aplicarem. Uma busca textual vazia so cobre referencias diretas.
- Para codigo interno substituido, indique cada consumidor a migrar e a verificacao pela entrada real. A correcao autorizada segue [Ao mudar uma interface](../implementation/references/design.md#ao-mudar-uma-interface), inclusive a compatibilidade que ainda tem dono. Se faltar evidencia, registre o que precisa ser confirmado antes de excluir.
- Verifique o fluxo substituto e um caso de compatibilidade em risco. Retire flags, exemplos ou testes associados apenas quando a regra de produto que protegiam tiver sido retirada ou continuar coberta.
