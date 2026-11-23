## Codex

Crie a pasta de artefatos de `ban-legacy` pela regra do perfil. Inicie a sessao isolada pelo executor compartilhado:

```bash
node {{SCRIPTS_DIR}}/codex-review.mts legacy-reviewer <pasta da execucao>/r0 --repo <checkout revisado> < <briefing temporario>
```

Leia `review.md` quando o executor confirmar o isolamento. Na segunda rodada, use `<pasta da execucao>/r1` e acrescente `<pasta da execucao>/r0` antes de `--repo`.
