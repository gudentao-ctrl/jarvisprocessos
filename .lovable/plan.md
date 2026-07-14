# Refactor Completo do Módulo BPMN — Padrão Consultoria

Escopo grande. Vou entregar em **5 blocos sequenciais**, cada um estável em produção antes do próximo. Confirme para começar pelo Bloco 1.

## Arquitetura-alvo

```text
Fluxo (DB: process_activities + activity_connections + process_decisions)
   │  ← única fonte de verdade, edição sempre aqui
   ▼
FlowGraph (modelo lógico normalizado in-memory)
   │
   ├─► BPMN Engine (novo)   ──► XML BPMN 2.0 ──► bpmn-js Viewer
   │       • ranking por níveis
   │       • detecção de bifurcação/convergência
   │       • lanes por responsável
   │       • orthogonal routing com anti-cruzamento
   │
   └─► Validator            ──► lista clicável com foco no elemento
```

Nenhuma coordenada é persistida. Toda alteração no Fluxo dispara re-layout automático. O BPMN é sempre derivado — nunca editado diretamente.

## Bloco 1 — Núcleo: FlowGraph + Engine BPMN novo

Substitui `flow-to-bpmn.ts` por um engine em camadas:

- **`src/lib/bpmn/graph.ts`** — normaliza activities/connections/decisions em `FlowGraph` com adjacência, in/out-degree, detecção de start/end/gateways.
- **`src/lib/bpmn/ranking.ts`** — longest-path layering (níveis L→R), tratamento de back-edges (loops de retrabalho marcados para roteamento inferior).
- **`src/lib/bpmn/lanes.ts`** — agrupa por `responsible`, ordem de aparição a partir do start, altura automática por conteúdo, "Não definido" no fim.
- **`src/lib/bpmn/layout.ts`** — posiciona: X por rank, Y por lane + centralização de gateway entre filhos, alinhamento de eventos start/end, espaçamento uniforme (`RANK_GAP=140`, `NODE_GAP=60`).
- **`src/lib/bpmn/routing.ts`** — Manhattan router evoluído: escolhe porta (L/R/T/B) por posição relativa, evita AABB de todas as caixas, offset por índice para paralelas, curvas suaves em quinas (arco 8px), back-edges pelo topo/base fora do bounding box.
- **`src/lib/bpmn/emit.ts`** — serializa XML BPMN 2.0 válido (Pool + LaneSet + DI com waypoints).

Substitui uso em `BpmnRenderer.tsx` e `renderBpmnSvg`. Remove o dagre legado.

**Critério de saída:** processo com 30+ atividades, decisões e loop renderiza sem cruzamentos, gateways centrados, lanes corretas.

## Bloco 2 — Renderer profissional + sincronização em tempo real

- Toolbar completa em `BpmnRenderer.tsx`: MiniMap (já), Fit, Zoom±, Centralizar, Fullscreen, Grade on/off, Snap on/off, Mostrar/ocultar raias, Modo apresentação/edição.
- Re-layout **automático** em qualquer mutação do Fluxo (mutation → invalidate query → engine → viewer.importXML). Sem botão "Organizar" obrigatório (mantido como reset).
- Debounce de 150ms + cache do XML por hash do FlowGraph para responsividade.

## Bloco 3 — Validador clicável + auto-fix reforçado

- `flow-validate.ts` estendido: gateways sem convergência, loops sem saída, eventos duplicados, gateways redundantes (1-in/1-out), sequências impossíveis, responsáveis ausentes.
- `FlowIssuesPanel` — cada issue vira botão que: seleciona no editor, centraliza no BPMN (canvas.scrollToElement), destaca 2s.
- `flow-autofix.functions.ts` amplia: remove gateway redundante, funde eventos duplicados, adiciona convergência quando faltante.

## Bloco 4 — Exportação PDF Premium

Reescreve `ExportProcessPdfButton.tsx` completo:

- **Cabeçalho** por página: logo empresa (esq), logo consultoria (dir), nome/código/versão/revisão do processo.
- **Rodapé**: consultor, cliente, data, "Confidencial", `Página X/Y`.
- **Paginação inteligente**: mede bbox do SVG, calcula cortes **apenas nos gaps entre ranks** (nunca sobre nó ou linha). Se não couber em A3 landscape, tiling horizontal com overlap 5% e marcador `Tile x/y`.
- Render em 300 DPI via canvg + pdf-lib. Tipografia Inter, margens 15mm, numeração consistente.

## Bloco 5 — Performance para 100–300+ atividades

- Memoização do FlowGraph por hash estável.
- Incremental import: `viewer.importXML` só quando XML muda; caso contrário só `canvas.zoom`.
- Virtualização da lista de atividades no `FlowEditor` (react-virtual) quando >80 itens.
- Web Worker opcional para ranking/routing em processos >200 nós (fallback síncrono).

## Ordem de execução

1. Bloco 1 (núcleo) — sem ele o resto não muda visual.
2. Bloco 2 (renderer + sync).
3. Bloco 3 (validação/autofix).
4. Bloco 4 (PDF premium).
5. Bloco 5 (performance).

## Detalhes técnicos

- **Sem novas dependências** exceto se necessário para Bloco 5 (`@tanstack/react-virtual`). bpmn-js/diagram-js-minimap/canvg/pdf-lib já instalados.
- Correção do **hydration error** em `/auth` incluída no Bloco 1 (root cause: branch server/client no route).
- Todo XML gerado passa por `viewer.importXML` em teste unitário antes de commit do bloco.

Confirme para iniciar **Bloco 1**.
