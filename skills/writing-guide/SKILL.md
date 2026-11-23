---
name: writing-guide
description: Regras de redacao para texto que um agente ou uma pessoa executa ao pe da letra. Use ao escrever ou revisar skills, AGENTS.md, CLAUDE.md, arquivos de agente, briefings de subagente e templates de issue e PR do GitHub, em qualquer repositorio.
---

# Guia de redacao

Texto que o leitor executa sem ambiguidade: resultado primeiro, limites antes do procedimento, um verbo por acao e cada regra em um so lugar. As regras adaptam praticas de manuais tecnicos: ASD-STE100 (vocabulario e sintaxe controlados), MIL-STD-38784 (niveis de aviso), S1000D (modulos e informacao comum) e BLUF (conclusao primeiro).

O leitor executa o texto literalmente. Sinonimos viram acoes diferentes; um limite enterrado num paragrafo vira opcional.

## Precedencia

1. O guia de redacao, o vocabulario e os templates do repositorio vencem os itens 2 e 3.
2. O formato fixo da skill que pede o texto (briefing, corpo de PR) vence o item 3.
3. Este guia preenche o que os dois nao definem.

Dentro deste guia, a referencia do tipo de texto vence este arquivo onde os dois divergem.

Escreva no idioma do repositorio. Em repositorio com mais de um idioma, use o idioma dos arquivos vizinhos do mesmo tipo. Os exemplos estao em portugues; as regras valem em qualquer idioma.

Fora do portugues, traduza uma vez os rotulos de aviso, os verbos padrao e os sinonimos a evitar. Registre a traducao no guia de redacao do repositorio. Sem guia, use a mesma traducao em todo o arquivo. Relate a traducao.

## Procedimento

1. Leia o que o repositorio ja define: guia de redacao, glossario, templates e arquivos vizinhos do mesmo tipo.
2. Leia a referencia do tipo de texto. Sem referencia para o tipo, siga so este arquivo.
   - Skill, `AGENTS.md`, `CLAUDE.md`, agente ou briefing: [agent-instructions.md](references/agent-instructions.md).
   - Template de issue ou PR do GitHub: [github-templates.md](references/github-templates.md).
3. Ao escrever, aplique as secoes abaixo.
4. Confira o texto pela secao Revisar.

## Estrutura

- O primeiro paragrafo diz o resultado esperado.
- Os limites duros vem logo depois, antes de qualquer procedimento.
- Procedimento vai em passos numerados. Para repetir uma etapa, diga qual: "volte ao passo 1".
- Detalhe longo, comandos, templates e exemplos longos vao em arquivo separado, ligado por link relativo.

## Frases

- Imperativo e voz ativa: "Leia o log", nao "o log deve ser lido".
- Uma instrucao por frase. Condicao antes da acao: "Se X, faca Y".
- Ate ~20 palavras em procedimento e ~25 em texto descritivo.
- Negacao explicita e curta: "Nao use X". Evite dupla negacao.

## Niveis de aviso

| Rotulo | Uso |
| --- | --- |
| `**Proibido:**` | Acao que o leitor nunca executa: irreversivel, insegura ou com risco de perda de dados. |
| `**Atencao:**` | Acao que exige permissao ou condicao; ignorar causa retrabalho ou publicacao indevida. |
| `**Nota:**` | Informacao que evita interpretacao errada. Nao contem ordem. |

- Coloque `Proibido` e `Atencao` antes do passo afetado; `Nota` vem depois.
- `Proibido` admite uma unica ressalva, escrita no rotulo: `**Proibido**, sem autorizacao explicita:`. Use-a so onde "autorizacao explicita" esta definida para o leitor. Qualquer outra condicao faz do aviso um `Atencao`.
- Regra de estilo ou de formato nao e `Proibido`; escreva como instrucao ("Nao use X").
- Um aviso por linha. Nao misture aviso e procedimento na mesma frase.

## Vocabulario controlado

Use um verbo por acao. Nao troque por sinonimo para variar o texto.

Se o repositorio nao define verbos proprios, use estes:

| Verbo | Significado |
| --- | --- |
| **encerre** | Termine a execucao e entregue o relatorio de saida, com ou sem pendencia. |
| **pare** | Interrompa a acao em curso por divergencia ou risco, relate o motivo e nao prossiga sem nova instrucao. |
| **escale** | Devolva a decisao ao usuario com contexto e alternativas. |
| **relate** | Inclua no relatorio da conversa. Nao implica publicar. |
| **publique** | Execute acao visivel fora da conversa: push, comentario, edicao de PR, resolucao de thread. |

- Nao use "pare" para pausa seguida de retomada.
- Evite `informe`, `reporte`, `comunique` e `finalize` como sinonimos desses verbos.
- Termo de dominio que o texto repete fica fixo.
- Se o repositorio tem glossario, use os termos dele. Sem glossario, mantenha o primeiro termo usado.

## Informacao comum

- Escreva cada regra em um so lugar e referencie pelo nome: "o estado **Aprovado** de `<skill dona>`".
- Dentro do arquivo, tambem nao repita: defina uma vez e aponte para a secao.
- Se o texto descumprir uma regra de proposito, registre a excecao no guia de redacao do repositorio. Sem guia, relate a excecao.

## Revisar

Releia o texto contra cada secao acima, a referencia do tipo e as convencoes do repositorio.

- Ao escrever, corrija cada desvio antes de entregar.
- Ao revisar texto pronto, relate cada desvio com arquivo e linha. Nao edite sem pedido.
