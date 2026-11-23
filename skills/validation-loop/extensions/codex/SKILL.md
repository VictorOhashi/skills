## Codex

Revisor: sessao independente do Codex CLI, com papel `validation-reviewer`, modelo e esforco definidos no TOML do agente. O nivel completo usa os valores compilados do perfil ativo. O unico esforco aceito alem do TOML e `--effort medium`, no nivel leve de Delimitar; outro valor e recusado.

1. Crie a pasta de artefatos desta execucao pela regra do perfil; o pai da pasta de cada rodada deve existir. Salve o briefing em arquivo temporario, fora do repositorio.
2. Inicie a rodada com `node {{SCRIPTS_DIR}}/codex-review.mts validation-reviewer <pasta da rodada> --repo <repositorio revisado> [--effort medium] < <briefing>`. O executor inicia uma sessao nova, sem o historico da implementacao, em diretorio temporario neutro.
3. Confirme `model`, `effort`, `sandbox`, `approval`, `writeProbe` e `sessionId` em `runtime.json`. Exija o modelo do TOML, o esforco da rodada, `read-only`, `never` e `denied`. O executor bloqueia o resultado se nao confirmar esses dados. Leia o parecer em `review.md`.
4. Para retomar, acrescente a pasta da rodada anterior depois da pasta da nova rodada, antes de `--repo`, repita o mesmo `--effort` e envie o registro e o delta no briefing. O executor valida a origem, o papel e o repositorio no registro anterior e exige o mesmo ID retornado. Use pastas irmas dentro da mesma execucao; nunca retome a implementacao. Se a sessao nao puder ser retomada, siga a regra do nucleo para novo revisor.

O sandbox pertence ao processo revisor; a sessao principal continua com escrita. Antes de iniciar, o executor comprova a negacao de escrita em arquivo temporario. Ele ignora a configuracao pessoal do Codex, desativa apps, plugins, memoria, delegacao e pedido de permissoes. Nao carrega configuracao do projeto, pois inicia em pasta neutra; as instrucoes aplicaveis chegam pelo briefing. A autenticacao usa o mecanismo normal do Codex, sem copiar credenciais.

Esta e a rota principal da revisao no Codex. Nao use subagente nativo para esse isolamento: ele herda as permissoes da conversa principal. Falha do executor ou do sandbox segue as regras de erro e **Escalado** do nucleo, sem fallback para outra harness.
