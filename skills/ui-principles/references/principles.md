# Fundamentos

O porque das regras das outras referencias. Use para decidir um caso que elas nao cobrem e para nomear o principio de um achado.

## Proposito

- Toda tela tem um trabalho. Sem ele, nenhuma regra de layout salva a tela.
- Decida o que nao construir. Cada elemento cobra atencao a cada olhada; na duvida, remova.
- Simplicidade nao e minimalismo: tire o desnecessario para o essencial aparecer. As vezes, mais contexto simplifica.
- O usuario fica no controle e age no proprio interesse: desfazer facil, privacidade no momento certo, prevencao de dano.
- Nada e aleatorio: cada espaco, tempo e alinhamento e uma escolha defensavel.

## Heuristicas de usabilidade

As dez heuristicas de Nielsen, com onde a regra mora:

1. **Visibilidade do estado do sistema:** [interaction.md](interaction.md#resposta), [states.md](states.md#catalogo).
2. **Correspondencia com o mundo real:** [writing.md](writing.md#principios).
3. **Controle e liberdade:** [interaction.md](interaction.md#acoes-destrutivas-e-reversao).
4. **Consistencia e padroes:** [writing.md](writing.md#consistencia) e o design system do projeto.
5. **Prevencao de erro:** [interaction.md](interaction.md#formularios).
6. **Reconhecer em vez de lembrar:** [layout.md](layout.md#hierarquia).
7. **Flexibilidade e eficiencia:** [interaction.md](interaction.md#navegacao-e-estado).
8. **Estetica e minimalismo:** [layout.md](layout.md#hierarquia), [Restricao](#restricao).
9. **Recuperacao de erros:** [writing.md](writing.md#erros).
10. **Ajuda e documentacao:** [writing.md](writing.md#principios).

## Percepcao

Principios de Gestalt que decidem como o olho agrupa a tela:

- **Proximidade.** O que esta perto parece relacionado. Espaco e o primeiro recurso de agrupamento.
- **Similaridade.** O que tem a mesma aparencia parece ter a mesma funcao.
- **Regiao comum.** Fundo ou borda compartilhados agrupam mais forte que proximidade.
- **Alinhamento.** Elementos alinhados leem como um conjunto.
- **Figura e fundo.** O que flutua se separa do que esta embaixo.
- **Destino comum.** O que se move junto parece um objeto so.

## Leis de UX

- **Jakob.** As pessoas chegam esperando que o produto funcione como os outros que ja usam. Familiaridade vence novidade.
- **Fitts.** Alvo grande e perto e mais rapido de atingir.
- **Hick.** Mais opcoes, decisao mais lenta. Reduza, agrupe ou revele em etapas.
- **Doherty.** Resposta abaixo de cerca de 400ms mantem o usuario no fluxo.
- **Tesler.** Complexidade nao some, muda de dono. Prefira que o sistema a absorva.
- **Von Restorff.** O que difere do resto e notado. Gaste esse destaque so no que importa.
- **Pico e fim.** A experiencia e lembrada pelo momento mais intenso e pelo final: cuide de erro, espera longa e conclusao.

## Restricao

- Gaste a ousadia num lugar so. Um elemento memoravel, o resto quieto.
- Estrutura visual e informacao: borda, numeracao, rotulo e divisoria dizem algo sobre o conteudo. Se nao dizem, sao ruido.
- Densidade e movimento combinam com o produto: ferramenta de trabalho e rapida e seca; produto ludico pode ter mais vida.
- Revise na tela renderizada, no tamanho e no dispositivo de uso. Leitura de codigo nao mostra quebra de linha, sobreposicao nem salto.

## Padroes genericos

Defaults que aparecem em qualquer tela, independente do assunto, e denunciam desenho sem decisao. Cada um e legitimo quando o projeto ou o conteudo pede; sem esse motivo, troque pela escolha que o conteudo sugere.

- Conteudo picado em cartoes identicos, com o mesmo raio e a mesma sombra em tudo.
- Rotulo em caixa alta acima de cada titulo, ou uma palavra do titulo destacada em cor ou italico.
- Numeracao "01 / 02 / 03" em conteudo que nao e sequencia.
- Gradiente ou brilho como decoracao ou como unica affordance.
- Fade de entrada em cada secao e hover animado em cada cartao.
- Seta "→" em todo link e botao; metadados unidos por ponto medio por habito.
- Fonte monoespacada em rotulo que nao e codigo nem dado tabular.
- Emoji no lugar de icone, ou dois conjuntos de icones na mesma tela.
