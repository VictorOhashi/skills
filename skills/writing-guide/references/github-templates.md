# Templates de issue e PR do GitHub

Regras para os templates que o GitHub oferece ao abrir uma issue ou um PR. O template tem dois leitores: quem preenche segue as instrucoes, e quem le o resultado quer a conclusao primeiro.

**Proibido:** usar dado real de usuario, segredo ou token em exemplo, placeholder ou valor padrao.

## Arquivos

| Arquivo | Uso |
| --- | --- |
| `pull_request_template.md` em `.github/`, na raiz ou em `docs/` | Template unico de PR. |
| `PULL_REQUEST_TEMPLATE/<nome>.md` numa dessas pastas | Varios templates de PR, escolhidos por `?template=<nome>.md` na URL. |
| `.github/ISSUE_TEMPLATE/<nome>.md` | Template de issue em Markdown, com frontmatter `name`, `about` e, opcional, `title`, `labels` e `assignees`. |
| `.github/ISSUE_TEMPLATE/<nome>.yml` | Issue form, com campos tipados e obrigatorios. |
| `.github/ISSUE_TEMPLATE/config.yml` | `blank_issues_enabled` e `contact_links` do seletor de templates. |

**Atencao:** edite templates so no repositorio da tarefa. Mudanca no repositorio `.github` da organizacao vale para todos os repositorios dela.

- Antes de criar, procure templates em `.github/`, na raiz e em `docs/`, sem diferenciar maiusculas.
- Procure tambem no repositorio `.github` da organizacao.
- Se houver template para o caso no repositorio, ajuste-o. Nao crie um paralelo.
- Ao ajustar, leia as ultimas 20 issues ou PRs do tipo que o template cobre.
- Se o repositorio nao tem template de issue e a organizacao tem, escale antes de criar ou copiar. O primeiro arquivo em `.github/ISSUE_TEMPLATE/` desliga todos os da organizacao, inclusive o `config.yml`.
- Se o template de PR do caso so existir na organizacao, copie-o para o repositorio. Ajuste a copia.
- Se o template local desligar ou substituir os da organizacao, relate a troca.
- Se um campo for obrigatorio ou tiver opcoes fixas, use issue form. Veja a Nota de Issue form. PR nao tem form; use Markdown.
- Escreva o template num arquivo so.
- Valor de frontmatter segue a secao Frontmatter de [agent-instructions.md](agent-instructions.md).
- Antes de publicar, faca o parse do issue form e do `config.yml` com um parser YAML.

**Nota:** qualquer arquivo em `.github/ISSUE_TEMPLATE/` do repositorio desliga todos os templates de issue da organizacao naquele repositorio. Um template de PR local substitui o template de PR da organizacao.

**Nota:** o template so aparece para quem abre issue ou PR depois do merge na branch padrao.

## Estrutura

- A primeira secao pede o resultado em uma frase: o que muda, no PR; o problema, na issue.
- Sem template de PR nem convencao de corpo no repositorio nem na organizacao, use os blocos e a ordem de `pr-format`.
- Cada secao responde uma pergunta. O titulo de cada secao tem uma ou duas palavras.
- Secao que nem todo caso usa diz quando omitir.
- Se uma secao de todo caso fica vazia em mais da metade da amostra de 20 da secao Arquivos, corte-a.
- Para apontar arquivo do repositorio, use URL absoluta.

**Nota:** link relativo no corpo de issue ou PR resolve contra a URL da pagina, nao contra o repositorio.

## Instrucoes para quem preenche

- No Markdown, escreva a instrucao num comentario HTML (`<!-- -->`). Ela nao aparece no texto publicado.
- No issue form, use `attributes.description` para a instrucao e `attributes.placeholder` para o exemplo.
- Escreva a instrucao pelas regras de Frases do `SKILL.md`.
- Nao deixe texto de exemplo fora de comentario ou placeholder; ele vai para a publicacao se ninguem apagar.

## Checklist

- Cada item e uma verificacao que o autor executa e comprova: "Rodei os testes de X", nao "Segui as boas praticas".
- Item que so vale em alguns casos diz o caso: "Se muda UI: prints antes e depois".
- Nao repita no checklist regra que o CI ja garante.

## Issue form

- `name`, `description` e `body` sao obrigatorios no topo; `title` e `labels` preenchem a issue criada.
- Cada campo tem `attributes.label` curto. `id` e opcional; de um `id` ao campo que automacao ou URL de criacao preenche, sem repetir `id` no form.
- Marque `validations.required: true` so no que impede a triagem sem ele.
- Opcoes de `dropdown` e `labels` usam o vocabulario do repositorio. Nao crie sinonimo de label existente.

**Nota:** o GitHub so aplica `validations.required` em repositorio publico. Em repositorio privado, o campo marcado nao bloqueia o envio.

## Por tipo

- **Bug:** passos para reproduzir, numerados; esperado e observado; ambiente e versao.
- **Feature:** problema antes da solucao; criterio de aceite verificavel.
