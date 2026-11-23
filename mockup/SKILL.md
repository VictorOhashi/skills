---
name: mockup
description: Cria mockups de interface fieis ao app e ao design system do projeto para decidir mudancas de UI antes de implementar. Use em pedidos de mockup, wireframe, antes/depois, para comparar opcoes visuais ou antes de mudanca visual nao trivial.
---

# Mockup de interface

Mostre o app atual e a mudanca proposta, com fontes verificaveis, e feche a referencia visual da implementacao.

**Proibido:** salvar mockup no repositorio e desenhar elemento sem fonte como se existisse no app.

Apresentar um mockup nao muda as permissoes da tarefa: analise continua sem edicoes.

## 1. Fonte

- Quando houver repositorio Git com remote, atualize a referencia da base antes (`git fetch`, comparar com a branch base), sem integrar automaticamente: o app pode ter mudado desde a ultima conversa. Se a consulta falhar, declare a limitacao.
- O "antes" e captura do app real rodando localmente, com a ferramenta de captura disponivel: automacao de browser do repositorio, browser da sessao, simulador, emulador ou dispositivo de teste. Story so nos casos aceitos na secao Validacao de UI da skill `verification`; nesse caso, marque o quadro com a fonte ("fonte: story") e diga isso na entrega.
- Em projeto novo, apresente a proposta sem inventar um "antes". Se nao houver captura do app existente, sinalize a lacuna; uma reconstrucao nao e evidencia do estado atual.
- Figma ou wireframe citado pelo usuario e referencia de intencao, nao de estado atual: leia o no indicado e aponte onde diverge do app.

## 2. Construcao

- Siga as definicoes de design do projeto: componentes, tokens e padroes do design system vigente, textos da localizacao e dados no formato do contrato ou das fixtures. Sem design system, use o criterio de conformidade de `verification`.
- Elemento que nao existe no design system aparece marcado como proposta de componente novo, nunca como estilo solto.
- Nada inventado: texto, metrica, selo, aviso ou elemento sem fonte no app, no contrato ou no pedido leva o selo visivel "hipotetico". Nao desenhe barra, botao ou estado que nao existe no app como se existisse.
- Cubra os estados, tamanhos, fluxos e telas irmas afetados, sem repetir quadros identicos. Considere vazio, carregando, erro, sucesso e texto longo quando aplicaveis; no web, celular (390) e desktop (1440) sao referencias, ajustadas ao projeto; em app nativo, use os tamanhos da plataforma alvo.

## 3. Layout

- Decisoes pedidas ao usuario no topo, numeradas (D1, D2...).
- Um quadro por tela e estado, antes e depois lado a lado, na largura real. Legenda de uma linha: tela, estado, largura.
- Opcoes como cartoes lado a lado (A, B, C), cada uma com uma linha de descricao concreta e uma de trade-off; a recomendada marcada. Nunca opcao so em texto.
- Marcadores numerados no desenho apontam o que muda; sem paragrafo explicativo dentro do mockup.

## 4. Iteracao

- Atualize o mesmo mockup no mesmo lugar (mesma URL ou arquivo); nao abra uma versao nova a cada rodada.
- Remova as opcoes rejeitadas a cada rodada e, depois da aprovacao, as nao escolhidas; registre em uma linha as decisoes fechadas. O mockup aprovado vira a referencia da implementacao e dos prints do PR.

## 5. Entrega

- Apresente pelo recurso visual da secao da harness; sem ele, um HTML unico na pasta de artefatos da execucao, aberto no browser.
- Antes de mostrar, renderize nas larguras usadas e confira contra a captura real: componentes, espacamento, cores, texto cortado e quebra no celular. Corrija antes de entregar.
- Entregue o link do mockup e a opcao recomendada por decisao. Preserve os IDs quando o mockup integrar um plano.

**Atencao:** nao implemente ate o usuario aprovar o plano que cita o mockup.
