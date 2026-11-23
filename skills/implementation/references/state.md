# Estado e efeitos

- Preserve a diferenca entre ausencia prevista e falha quando o chamador precisar reagir de maneiras diferentes. Propague contexto suficiente para ele tomar essa decisao.
- Se uma operacao puder ser repetida, distinga a repeticao da mesma solicitacao de uma segunda solicitacao legitima. Depois de uma falha parcial, use o estado confirmado para decidir o que falta aplicar.
- Se execucoes concorrentes puderem violar uma regra, garanta-a no ponto que controla a escrita. Por exemplo, consultar a existencia antes de inserir ainda permite que dois escritores observem a mesma ausencia.

Antes de serializar escritas, identifique o que precisa ser compartilhado. Se cada trabalhador publica um resultado independente, grave cada resultado sob sua propria chave. Se ambos disputam a ultima vaga, a reserva precisa de uma decisao atomica comum.

Localize o intervalo entre produzir um efeito externo e registrar seu sucesso. Se a resposta se perder nesse intervalo, uma nova tentativa pode cobrar duas vezes. Quando o provedor oferecer uma chave de idempotencia, reutilize a chave da mesma compra. Uma nova compra recebe outra chave. Se o resultado for incerto e a repeticao puder causar dano, reconcilie com o provedor antes de repetir.
