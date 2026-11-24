# Corpo do PR: template

Siga o idioma e template do repositorio; na ausencia de convencao local, use portugues com acentuacao. O leitor decide pela imagem e pela primeira frase: evidencia antes do texto, texto em bullets de uma linha. Meta: ~80 palavras fora das imagens e do bloco recolhido. O revisor le o diff; a descricao diz o que muda, por que e onde olhar.

Na ausencia de template local, use os blocos nesta ordem:

```markdown
Closes #NNN                      <!-- ou "Parte de #NNN"; em stack: "Empilhado sobre #MMM (base `branch`)" -->

**Muda:** uma frase com o efeito para quem usa ou para quem mantem, sem nome de arquivo.

| Antes | Depois |
| --- | --- |
| ![Checkout, desktop: antes](./checkout-desktop-antes.png) | ![Checkout, desktop: depois](./checkout-desktop-depois.png) |
| ![Checkout, celular: antes](./checkout-celular-antes.png) | ![Checkout, celular: depois](./checkout-celular-depois.png) |

> [!WARNING]
> Risco real em uma linha: o que muda para quem ja usa e o que observar.
> Reverter: passo de reversao, so quando nao for um revert simples.

### Por quê
- 1 a 2 bullets: problema observavel.

### Como
- Ate 4 bullets de uma linha, efeito primeiro e identificador no fim (`Componente`).
- Decisao nao obvia: "X em vez de Y: motivo".
- Fora: o que ficou de fora de proposito, quando houver.

<details>
<summary>Verificações</summary>

- `comando exato`: resultado (ex.: `pnpm --filter <workspace> test`: 12 files, 140 tests).
- Verificacao manual: cenario e ambiente.

</details>
```

## Evidencia

- Mudanca visual: tabela Antes | Depois, uma linha por tela e largura, conforme `pr-prints`. Quando so o depois existe (tela nova), use uma coluna. O alt text e a legenda: tela, largura, antes/depois.
- Sem mudanca visual: troque a tabela por uma linha "Sem mudanca visual: motivo". Em refactor estrutural, um diagrama `mermaid` de onde o codigo estava e para onde foi, quando poupar texto.
- Imagens novas usam o **caminho local** do PNG; `gh --attach` reescreve para a URL do anexo. Ao atualizar, nao reanexe arquivos ja publicados; a preservacao do corpo segue a Publicacao de `pr-format`.

## Pendencia de revisao

Em rascunho pedido pelo usuario com `review-loop` **Escalado**, abra o corpo com `> [!IMPORTANT]` e uma linha por item pendente de decisao. Remova o bloco quando a decisao estiver aplicada. Achado de seguranca segue a regra de `review-loop`.

## Risco

O alerta `> [!WARNING]` aparece so quando ha risco real: mudanca de comportamento para quem ja usa, migracao, flag, dependencia de deploy ou de outro PR. Sem risco real, o bloco nao existe; nunca escreva "Nenhum conhecido".

Se reverter exigir mais que um revert (migracao, flag, dependencia de deploy), inclua a linha `Reverter:` no mesmo alerta.

## Verificacoes

Dentro de `<details>`, so o que rodou nesta branch e no head atual. Ruido conhecido (drift alheio, flake reexecutado) em uma linha, sem narrativa.

Nao use: narrativa de processo ou defesa antecipada; texto riscado registrando mudanca de rumo; footer de ferramenta ("Generated with..."); repetir o que ja esta no titulo, no commit ou no resumo do CodeRabbit; listas aninhadas em Por que e Como; tabela de gates ou contagem de suite que nao rodou.
