## Codex

Revisor: sessao independente do Codex CLI, com papel `council-reviewer`, modelo e esforco definidos no TOML do agente.

Execute cada rodada em sessao isolada com `node {{SCRIPTS_DIR}}/codex-review.mts council-reviewer <pasta da rodada> --repo <repositorio revisado> < <briefing>`. Salve os resultados na pasta de artefatos da execucao do conselho.

Avaliador inicial, Revisor A e Revisor B sao tres sessoes novas, sem ID de retomada e sem historico da implementacao. Confirme os dados efetivos de cada uma em `runtime.json`: modelo e esforco do TOML, sandbox `read-only`, aprovacao `never`, teste de escrita `denied` e ID proprio.

Retome o Revisor A acrescentando a pasta anterior dele depois da pasta da nova rodada, antes de `--repo`; faca o mesmo para B depois da primeira avaliacao dele. Mantenha cada cadeia em pai proprio dentro da execucao: `initial/r0`, `a/a1`, `a/a2`, `b/b1`. O executor exige rodadas irmas para retomar. Nao entregue a B sessoes ou avaliacoes de A. Se a troca de modelo ou esforco impedir a retomada, encerre a cadeia antiga e identifique a nova execucao como independente. Para outras falhas, relate o bloqueio sem substituir o revisor silenciosamente.

O processo revisor recebe sandbox proprio; a sessao principal continua com escrita. Falha de isolamento ou dados efetivos nao confirmados bloqueiam a avaliacao. Nao use subagente nativo nem outra harness como fallback.
