## Claude Code

Rode em background (`run_in_background`) as verificacoes longas: gate local ou preflight, regressao visual e suite inteira de um workspace. Rode assim tambem o push quando o hook de pre-push for executar verificacoes. Rode uma verificacao longa por vez. Espere a notificacao de termino; nao leia o arquivo de saida em loop.

**Nota:** comando em primeiro plano que passa do timeout da chamada (padrao 2 minutos, maximo 10) vai para background, e a sessao fica parada ate esse limite.

Observador: agente `pr-observer`, iniciado em background pela ferramenta de subagentes. No prompt, passe o ciclo do observador de [references/watch.md](references/watch.md), o comando completo e o timeout do Bash de 600000 ms. Use uma subpasta do scratchpad como pasta do PR. A conclusao chega como notificacao; nao consulte o PR enquanto ele roda. Com o relato, leia o `pr.md` e siga o ciclo.

Sem ferramenta de subagentes, rode o mesmo comando com `--wait` em background no Bash.

Depois de **Pronto para merge**, nao mantenha o observador. Se o app oferecer acompanhamento do PR, ele cobre review e comentario que chegarem depois.
