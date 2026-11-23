## Codex

Observador: papel `pr-observer`, como subagente nativo. No prompt, passe o ciclo do observador de [references/watch.md](references/watch.md), o comando completo e o timeout de shell de 10 minutos. Espere o relato; com ele, leia o `pr.md` e siga o ciclo.

O subagente nativo herda as permissoes da conversa principal. Por isso o observador nao le o `pr.md` nem os logs: ele so repete o comando e devolve a saida.
