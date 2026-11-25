## Codex

O revisor roda em sessao somente leitura e devolve a lista de remocoes, de **mover** e de trocas de referencia com arquivo, linha e trecho citado, mais o destino de cada **mover** e o trecho novo de cada troca. Com **Corrigir localmente**, aplique a lista sem reavalia-la, localizando cada trecho pelo texto citado, e siga o passo 4 sobre o diff resultante.

Crie a pasta de artefatos de `ban-docs` pela regra do perfil. Inicie a sessao isolada pelo executor compartilhado:

```bash
node {{SCRIPTS_DIR}}/codex-review.mts doc-reviewer <pasta da execucao>/r0 --repo <checkout revisado> < <briefing temporario>
```

Leia `review.md` quando o executor confirmar o isolamento. Na segunda rodada, use `<pasta da execucao>/r1` e acrescente `<pasta da execucao>/r0` antes de `--repo`.
