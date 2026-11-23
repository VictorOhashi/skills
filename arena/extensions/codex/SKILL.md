## Codex

Use uma sessao pai isolada para produzir as candidaturas. Confira que `~/.codex/agents/arena-candidate.toml` e o papel do build ativo, como no bloco abaixo; se estiver ausente ou vinculado a outro arquivo, relate a indisponibilidade.

Inicie o CLI em uma pasta temporaria neutra. Passe no briefing o caminho absoluto da base e a tarefa comum. Peca um agente nativo `arena-candidate` novo por participante, todos em paralelo, sem compartilhar historico, e cada resposta integral com seu rotulo. A sessao usa somente leitura, aprovacao `never` e recursos externos desativados. Descarte candidaturas se a rota isolada ou o papel nao estiverem disponiveis.

```bash
candidate_role="$HOME/.codex/agents/arena-candidate.toml"
expected_role="{{SCRIPTS_DIR}}/../agents/arena-candidate.toml"
test -f "$expected_role" && test "$candidate_role" -ef "$expected_role" || exit 1
candidate_role=$(realpath "$expected_role") || exit 1
codex exec --ephemeral --ignore-user-config --ignore-rules --sandbox read-only --skip-git-repo-check \
  -c 'approval_policy="never"' -c features.apps=false -c features.plugins=false \
  -c features.request_permissions_tool=false -c features.multi_agent=true -c 'agents.arena-candidate.description="Candidato da arena"' \
  -c "agents.arena-candidate.config_file=\"$candidate_role\"" - < "$briefing"
```

Para o juiz, use o executor isolado do papel `council-reviewer`. Crie a pasta de artefatos da arena. Com o checkout e um arquivo de briefing, separe lancamento e coleta:

1. Lance o comando com `exec_command` e `yield_time_ms: 1`. Guarde o ID de sessao ou o codigo se ja terminou. A saida redirecionada mantem o parecer fechado.

   ```bash
   node {{SCRIPTS_DIR}}/codex-review.mts council-reviewer "$arena_dir/judge" --repo "$checkout" \
     < "$briefing" > "$arena_dir/judge.log" 2>&1
   ```

2. Avalie os candidatos e registre sua escolha. Depois, se houver sessao pendente, recolha o codigo de saida com `write_stdin` ate terminar. Com codigo zero, confirme o isolamento em `runtime.json` e leia `review.md`. Em falha, registre a ausencia do juiz.
