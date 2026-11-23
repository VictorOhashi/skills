## Codex

O revisor roda em sessao somente leitura e devolve a lista de remocoes com arquivo, linha e trecho citado. Com **Corrigir localmente**, aplique a lista sem reavalia-la, localizando cada remocao pelo trecho, e siga o passo 2 sobre o diff resultante.

Crie a pasta de artefatos de `ban-comments` pela regra do perfil. Inicie a sessao isolada pelo executor compartilhado:

```bash
node {{SCRIPTS_DIR}}/codex-review.mts comment-reviewer <pasta da execucao>/r0 --repo <checkout revisado> < <briefing temporario>
```

Leia `review.md` quando o executor confirmar o isolamento. Na segunda rodada, use `<pasta da execucao>/r1` e acrescente `<pasta da execucao>/r0` antes de `--repo`.
