# Instrucoes de agente

Regras para skills (`SKILL.md`), instrucoes persistentes (`AGENTS.md`, `CLAUDE.md`), agentes e briefings de subagente.

## Termos

| Termo | Sentido |
| --- | --- |
| Instrucoes persistentes | Arquivo que a harness le em toda sessao, como `AGENTS.md` ou `CLAUDE.md`. |
| Harness | Programa que executa o agente, como Claude Code ou Codex. |
| Permissao nomeada | Permissao com nome proprio, que um texto concede e outro consome. Exemplo: **Publicar**. |
| Estado | Resultado com nome que uma skill entrega e outro texto le. Exemplo: **Pronto para merge**. |
| Contexto | Conjunto de instrucoes persistentes e skills que valem juntas, como um perfil de trabalho. |

## Skill

```text
---
name: <nome da pasta>
description: <o que faz>. Use quando <gatilho>.
---

# <Titulo>

<1-2 frases: resultado esperado.>

**Proibido:** <limites duros da skill inteira.>

## Ativacao e permissoes   (quando a skill concede permissoes ou tem regra propria de ativacao)
## <Procedimento>          (passos numerados)
## Saida                   (quando a skill termina em estados que outra skill ou as instrucoes persistentes consomem)
```

- O `name` do frontmatter e igual ao nome da pasta. Use so minusculas, digitos e hifen, com ate 64 caracteres.
- Nao comece nem termine o `name` com hifen. Nao use dois hifens seguidos.
- `description` decide o acionamento: o que a skill entrega e quando usar. Ate tres frases e 1024 caracteres.
- Para limites de `name` e `description` de uma harness, siga a secao Varias harnesses.
- Skill que so consome uma permissao nomeada (**Publicar**) diz isso num `**Atencao:**` antes do passo, sem secao propria.
- O arquivo separado de detalhe fica em `references/`, ligado a partir do `SKILL.md`.
- Procedimento mecanico que o agente repetiria a mao fica num script em `scripts/`.

## Frontmatter

Vale para `SKILL.md`, agente em Markdown e qualquer arquivo com frontmatter YAML.

- Se um valor tiver `: ` ou ` #`, ou terminar com `:`, ponha-o entre aspas simples.
- Se um valor comecar com `[`, `]`, `{`, `}`, `,`, `#`, `"`, `'`, `!`, `&`, `*`, `|`, `>`, `%`, `@`, `` ` ``, `-` ou `?`, ponha-o entre aspas simples.
- Dentro das aspas simples, escreva a aspa simples dobrada (`''`).
- Antes de entregar, faca o parse do frontmatter com um parser YAML.

## Estados e permissoes

- Cada estado e cada permissao nomeada tem um dono e um sentido. Outro texto cita pelo nome do dono.
- Nao crie estado ou permissao com o mesmo nome e outro sentido.
- Nome de passo nao repete nome de estado ou de permissao.
- Conceda permissao pelo nome dela. Nao conceda por parafrase.

## Citacao entre skills

- Cite outra skill apenas quando uma etapa depender diretamente da sua execucao ou do seu resultado. Indique o que a etapa consome. Usar um estado ou permissao de outra skill e dependencia direta: cite pelo nome da skill dona.
- Deixe a descoberta de cada skill a cargo da sua propria `description`.

## Instrucoes persistentes

Cada linha custa leitura em toda tarefa.

- Traga so o que vale em toda tarefa. Procedimento de um tipo de tarefa vai para skill.
- Mantenha comandos, gates e restricoes exclusivos de um repositorio nas instrucoes desse repositorio.
- Se a harness alvo tem limite de leitura, mantenha o arquivo abaixo dele. Para achar o limite, siga a secao Varias harnesses.

## Agente e briefing

- O corpo do agente diz so o papel e os limites. O procedimento chega pelo briefing da skill que o aciona.
- O briefing leva tudo que o agente precisa: objetivo, escopo, arquivos, o que ja foi descartado e o formato da resposta. O agente nao ve a conversa.

## Varias harnesses

- O texto que vale em qualquer harness diz o que fazer. Como fazer em uma harness especifica fica separado, pela convencao do repositorio.
- Se o repositorio nao tem convencao, ponha o texto de cada harness numa secao `## <Nome da harness>` no fim do arquivo.
- No texto comum, nao cite nome de ferramenta, modelo ou sintaxe de comando de uma harness.
- Quando um passo depender da harness, aponte para a secao dela, com o fallback para harness sem secao.
- Limites proprios de uma harness estao na secao dela, ao fim do `SKILL.md` deste guia. Este guia mostra so a secao da harness que o le.
- Se a harness alvo nao e a que le este guia, ou nao tem secao, confira os limites na documentacao dela.
