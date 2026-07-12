# Fase 7 — BPMN de Nível Consultoria (Bizagi / Camunda / Signavio)

Foco exclusivo: qualidade visual e operacional do módulo Fluxo/BPMN. Sem novas telas fora do fluxo. Toda a lógica de dados e sincronização com Cronoanálise/Indicadores/Planos/TO BE já existente é preservada — este ciclo apenas eleva a camada de renderização, edição e exportação.

---

## Bloco A — Layout automático e conexões profissionais

### A.1 · Auto layout BPMN (dagre + refino)
`src/lib/bpmn-layout.ts` reescrito:
- Direção fixa **LR** no BPMN e **TB** para vertical mobile.
- `ranksep=110`, `nodesep=70`, `edgesep=30`, `align=UL`.
- Pós-processamento: alinhar gateways ao centro do rank, alinhar `end` ao último rank, colapsar retrabalho (`return`) para caminho inferior com `edge=step`.
- Sem sobreposição: colisão testada por AABB; nós afetados são empurrados verticalmente dentro da própria raia.
- Executado sempre que: gerar por IA · adicionar/remover atividade · alterar conexão · trocar responsável · clicar em **Organizar Fluxo**.

### A.2 · Conectores ortogonais (Manhattan)
`src/lib/bpmn-routing.ts`:
- Todo `SequenceFlow` roteado em segmentos horizontais/verticais (Manhattan router).
- Nunca diagonal. Nunca cruza um nó (waypoints re-roteados ao redor da AABB).
- Rotas paralelas com **offset lane** (2, 4, 6 px) para evitar sobreposição de linhas.
- Curvas apenas em quinas (raio 6 px) — sem curvas Bezier longas.
- Labels de decisão (`Sim`/`Não`) posicionados no ponto médio do primeiro segmento horizontal, com fundo branco (evita cortar linha).

### A.3 · Gateways simétricos
- Ao divergir: filhas distribuídas simetricamente em ±Y a partir do gateway (`spread = nodesep * (n-1)/2`).
- Ao convergir: mesmo tratamento espelhado.
- Rótulos das saídas centralizados no eixo do braço.

---

## Bloco B — Raias inteligentes e Pool

### B.1 · Pool "Empresa" + LaneSet
- Todo diagrama envolvido em `bpmn:Participant name="{empresa}"` com `bpmn:LaneSet` interno.
- Uma `bpmn:Lane` por `responsible` distinto. Ordem: ordem de aparição no fluxo a partir do `start`.
- Responsáveis externos comuns (`Cliente`, `Fornecedor`) detectados por keyword e renderizados como **pools separadas** com `MessageFlow` em vez de `SequenceFlow` na fronteira.

### B.2 · Reatividade de raias
- Alterar `responsible` de uma atividade dispara re-layout: atividade migra de lane, dagre recalcula, roteamento Manhattan refeito.
- Persistência: nenhum campo novo; derivado do fluxo mestre.

---

## Bloco C — Editor Fluxo profissional (mantém os dados)

### C.1 · Cartão de atividade rico
`src/components/flow/FlowEditor.tsx` — cada cartão passa a mostrar em uma linha compacta:
`ícone tipo · nome · responsável · tempo · [🎯 indicadores] · [⏱ cronoanálise] · [📋 planos] · [↕ mover] [🔗 conectar] [✎ editar] [🗑]`

Contadores clicáveis abrem drawer lateral do módulo correspondente (rotas existentes).

### C.2 · Drag & drop entre atividades
- `@dnd-kit/sortable` (já instalado se disponível; senão adicionar).
- Arrastar reordena visualmente e ajusta prioridade de layout; conexões recalculam automaticamente.
- Handle explícito (`↕`) para não conflitar com toque em campos.

### C.3 · Conectar com tipos
Ao clicar em **🔗 Conectar** abre popover com radios:
- Atividade · Gateway · Evento intermediário · Subprocesso · Fim
- Campo destino (busca por nome) + label opcional (usado nas saídas de decisão)
- Ação **Remover conexão** listando as saídas atuais com botão de exclusão individual (não apaga atividade).

### C.4 · Botão "Organizar Fluxo"
No topo do editor: dispara A.1+A.2 e persiste posições apenas quando o usuário confirma. Sem alterar lógica.

---

## Bloco D — Validação em tempo real e Auto Correção

### D.1 · Validador live
`flow-validate.ts` já detecta a maioria; adicionar:
- Ciclo infinito sem `return` (DFS + detecção de back-edge sem tipo `return`).
- Gateway com uma única saída (erro, não warning).
- Conexão de decisão sem label.

Painel `FlowIssuesPanel` roda em cada mutação (debounce 300ms), badge com contador ao lado do botão de exportação.

### D.2 · Botão "Corrigir automaticamente"
`src/lib/flow-autofix.ts` + IA (Lovable AI Gateway):
- Determinístico primeiro: cria `end` faltantes; remove duplicadas; conecta órfãos ao próximo nó por proximidade; adiciona rótulo `Sim`/`Não` em decisões sem label.
- Depois IA: para casos ambíguos (múltiplos órfãos, decisão com 3+ saídas sem labels significativos), pede sugestão estruturada `{fixes:[{op,target,...}]}` que o usuário revisa antes de aplicar (modal com diff).

### D.3 · Bloqueio de exportação
Exportar PDF continua bloqueado com `errors`; libera com apenas `warnings`.

---

## Bloco E — Renderer profissional

### E.1 · bpmn-js customizado
`BpmnRenderer.tsx`:
- **Zoom inicial**: `fit-viewport` com padding 40 px.
- Botão **Centralizar Processo** (`fit-viewport` + reset pan).
- **Minimapa** lateral direita via `diagram-js-minimap` (pacote oficial companheiro do bpmn-js).
- Toolbar: Organizar · Ajustar · Zoom+ · Zoom- · Centralizar · Exportar (SVG · PNG · PDF).

### E.2 · Legenda BPMN 2.0 conforme
Só símbolos oficiais (já implementado em `BpmnLegend`). Garantir que todo elemento emitido pelo `flow-to-bpmn.ts` cai em um dos tipos oficiais listados. Auditoria: rejeitar qualquer XML com elemento fora do vocabulário BPMN 2.0.

---

## Bloco F — Exportação

### F.1 · PDF adaptativo
`ExportProcessPdfButton.tsx` atualizado:
- Medir bbox do SVG do bpmn-js.
- `bbox.width ≤ 1600` → **A4 paisagem, 1 página**.
- `bbox.width ≤ 3000` → **A3 paisagem, 1 página**.
- Acima → **múltiplas páginas A3 paisagem contínuas** com sobreposição de 5% e marcador `Tile x/y`. Corte apenas em faixas verticais entre ranks (nunca sobre uma atividade ou linha) usando os `x` dos ranks devolvidos pelo dagre.
- Render sempre a 300 DPI via `canvg` sobre canvas escalado.

### F.2 · Cabeçalho / rodapé institucionais
Header em toda página de conteúdo: logo consultoria (esq) · logo cliente (dir) · empresa · processo · código · versão · responsável · data · revisão · status.
Footer: `Página X/Y` · `Gerado pelo JARVIS` · data · versão.

### F.3 · Exportar SVG e PNG
Botões adicionais na toolbar do renderer:
- **SVG** — `viewer.saveSVG()` → download `.svg`.
- **PNG @300dpi** — SVG → canvg → canvas 3x → `toBlob("image/png")` → download.

---

## Bloco G — IA "Otimizar Processo" (TO BE assistido)

`src/lib/flow-optimize.functions.ts`:
- Input: fluxo AS IS completo + indicadores + cronoanálise (quando existentes).
- Output estruturado: lista de achados por categoria — `duplicidade`, `retrabalho`, `aprovação_desnecessária`, `espera`, `gargalo`, `sem_valor_agregado` — cada um com atividades apontadas e sugestão de mudança.
- Botão **Otimizar Processo** no topo do editor; resultado abre painel com opções "Aplicar como TO BE" (cria nova versão em `process_versions`, sem tocar no AS IS).

Sincronização Fluxo ↔ BPMN ↔ Cronoanálise ↔ Indicadores ↔ Planos ↔ TO BE **já existe** — este bloco só consome os dados e propõe mutações via canais já testados.

---

## Estrutura de arquivos

**Novos**
- `src/lib/bpmn-routing.ts` — Manhattan router
- `src/lib/flow-autofix.ts` — auto-correção determinística + IA
- `src/lib/flow-optimize.functions.ts` — server fn "Otimizar Processo"
- `src/components/flow/FlowConnectPopover.tsx`
- `src/components/flow/FlowOptimizePanel.tsx`
- `src/components/flow/BpmnMinimap.tsx`

**Alterados (aditivo)**
- `src/lib/bpmn-layout.ts` — regras profissionais
- `src/lib/flow-to-bpmn.ts` — Pool + Lanes múltiplas + MessageFlow para pools externas
- `src/lib/flow-validate.ts` — ciclos, gateway 1-saída, labels
- `src/components/flow/BpmnRenderer.tsx` — minimapa, zoom, centralizar, exportações SVG/PNG
- `src/components/flow/FlowEditor.tsx` — cartão rico + DnD + Organizar Fluxo
- `src/components/flow/FlowIssuesPanel.tsx` — badge live + Corrigir automaticamente
- `src/components/flow/ExportProcessPdfButton.tsx` — adaptativo + tiles

**Pacotes**
- `diagram-js-minimap` (companheiro oficial do bpmn-js)
- `@dnd-kit/core` + `@dnd-kit/sortable` se ainda não presentes

**Sem migrações.** Nenhum campo novo em Supabase.

---

## Ordem de execução

1. **Bloco A + B** — Layout, roteamento Manhattan, gateways simétricos, Pool+Lanes múltiplas. Entrega visível imediata.
2. **Bloco C + D** — Editor rico com DnD, popover de conexão, validação live e Corrigir automaticamente.
3. **Bloco E + F** — Minimapa, centralizar, SVG/PNG, PDF adaptativo com tiles A3.
4. **Bloco G** — Otimizar Processo (TO BE assistido).

## Fora do escopo
- Editor visual arrastando shapes dentro do próprio bpmn-js (o BPMN continua derivado do fluxo mestre).
- Assinatura eletrônica de PDF.
- Novos módulos (Ata, POP/IT, Relatório Final permanecem no backlog anterior).

Confirma iniciar por **Bloco A + B** (layout profissional + Manhattan + Pool com raias múltiplas)?
