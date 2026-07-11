# Fase 6 — Refinamento Profissional do BPMN e Exportação

Foco: **qualidade da entrega**. Nada de novas features. Preservar todo o restante do sistema e todos os dados.

## Princípios
- Fluxo mestre permanece fonte da verdade. BPMN continua sendo derivado (read-only).
- Nenhuma migração destrutiva. Adições apenas onde estritamente necessário.
- Mobile mantém edição via cartões; BPMN profissional é a camada de visualização/exportação.

---

## 6.1 — Renderer BPMN 2.0 conforme (substitui `FlowBpmnPreview`)

Novo `src/components/flow/BpmnRenderer.tsx` usando **`bpmn-js` (Viewer)** + gerador de XML BPMN 2.0 em `src/lib/flow-to-bpmn.ts`:

- Elementos oficiais mapeados a partir do Fluxo:
  - `start`/`end` → `bpmn:StartEvent` / `bpmn:EndEvent`
  - `task`/`wait`/`approval` → `bpmn:Task` / `bpmn:ReceiveTask` / `bpmn:UserTask`
  - `decision` → `bpmn:ExclusiveGateway` (XOR)
  - Convergência de N entradas paralelas → `bpmn:ParallelGateway` (AND join) automático
  - Divergência com múltiplas saídas `parallel` → `bpmn:ParallelGateway`
  - Divergência com saídas condicionais múltiplas (2+ com labels) → mantém XOR; quando marcado "inclusivo" → `bpmn:InclusiveGateway` (OR)
  - `subprocess` → `bpmn:SubProcess` colapsado
  - Conexões: `bpmn:SequenceFlow` + `bpmn:MessageFlow` (quando envolve pool externa)
  - Anotações de `notes` → `bpmn:TextAnnotation` + `bpmn:Association`
  - `documents`/`systems` → `bpmn:DataObjectReference` associado à tarefa
- Pools e raias reais via `bpmn:Participant` + `bpmn:Lane` (ver 6.5).

## 6.2 — Auto layout profissional

`src/lib/bpmn-layout.ts` usando **`dagre`** com preset "LR" (esquerda→direita) para BPMN e "TB" para versão vertical mobile.
- Executado automaticamente ao: gerar por IA, salvar atividade, adicionar/remover conexão, alterar responsável.
- Botão **"Auto organizar"** no toolbar do renderer que reexecuta o layout preservando edições estruturais.
- Regras: `ranksep=90`, `nodesep=50`, alinhamento de gateways centralizado, subprocessos agrupados, retrabalho (`return`) roteado por baixo com `edge type=step`.
- Coordenadas persistidas em `process_activities.position_x/position_y` (colunas já existentes) só quando o usuário move manualmente; caso contrário sempre recalculadas.

## 6.3 — Integridade de conexões

Validador ativo em `src/lib/flow-validate.ts` (roda no cliente ao editar e no servidor antes de exportar):
- Toda `decision` possui ≥ 2 `activity_connections` de tipo `decision` com `label` distinto.
- Toda atividade não-final tem ≥ 1 saída.
- Toda atividade não-inicial tem ≥ 1 entrada.
- Nenhum destino nulo ou apontando para atividade excluída.
- Sem conexões duplicadas (`from`,`to`,`type`).
- Detecção de nós órfãos via DFS a partir do `start`.

Painel `FlowIssuesPanel` recebe botão **"Corrigir automaticamente"**:
- Cria `end` implícito para atividades sem saída.
- Remove conexões duplicadas.
- Sugere destino default (próxima atividade) para saídas de decisão sem `to`.

## 6.4 — Validador BPMN pré-salvar / pré-exportar

`validateBpmn(flow)` retorna `{ errors, warnings }`. Exportação PDF bloqueada quando há `errors`. UI mostra modal listando problemas com link "abrir atividade".

Checagens: início único, ao menos um fim, gateways com ≥2 caminhos, ausência de loops infinitos sem `return`, subprocessos com pelo menos início e fim internos, raias com pelo menos uma atividade, responsáveis definidos (aviso, não erro).

## 6.5 — Swimlanes automáticas por Responsável

- No gerador de BPMN XML: agrupar atividades por `responsible` (fallback `"Não definido"`) e emitir `bpmn:LaneSet` dentro de um `bpmn:Participant` chamado com o nome da empresa/processo.
- Ao alterar responsável de uma atividade, o layout re-agrupa a raia automaticamente na próxima renderização.
- Ordem de raias derivada da ordem de aparição no fluxo (start → end), estável entre renderizações.

## 6.6 — Exportação PDF profissional

Reescrita de `ExportProcessPdfButton.tsx` (mantém API atual, sem quebrar chamadas):

**Pré-visualização editável (modal)** antes do download:
- Campos: título, objetivo, escopo, observações.
- Seleção de páginas a incluir (checkboxes): Capa, Matriz do Processo, BPMN, Legenda, Indicadores, Planos, Cronoanálise, Histórico.
- Formato: A4 / A3 / Carta. Orientação: retrato / paisagem. Escala: automática / fit-to-page.

**Motor de renderização:**
- BPMN exportado via `viewer.saveSVG()` do `bpmn-js`, convertido para PNG @ 300 DPI (usando `canvg`) ou embutido como vetor quando possível.
- Quebra de página inteligente: nunca corta atividade ou conexão. Para diagramas grandes → dividir em tiles horizontais (paisagem A3), cada tile com sobreposição de 5% e marcador "1/3", "2/3".
- Multi-página automático para todo o documento; cabeçalho/rodapé em todas as páginas exceto capa.

**Estrutura fixa:**
1. Capa institucional (logos, empresa, processo, código, versão, revisão, consultor, data).
2. Sumário automático.
3. Dados Gerais (objetivo, escopo, entradas, saídas, responsável).
4. Matriz do Processo — tabela com colunas: ID, Atividade, Responsável, Entradas, Saídas, Tempo, Sistema, Documentos.
5. BPMN em alta resolução (300 DPI, vetorial quando possível).
6. Legenda BPMN — símbolos usados no diagrama com descrição.
7. Indicadores vinculados (se houver).
8. Planos de ação vinculados (se houver).
9. Cronoanálise consolidada (Lead Time, TC, TA, TNA — se houver).
10. Histórico de revisões (`process_versions`).
11. Aprovação (linhas para assinatura).

**Cabeçalho** (todas as páginas de conteúdo):
- Logo consultoria (esq) · Logo cliente (dir)
- Nome empresa · Nome processo · Código · Versão · Data · Página X/Y · Consultor

**Rodapé** (todas as páginas):
- "Controle de Revisão: v{version} — emitido em {date}"
- "Documento confidencial — uso interno"
- "Página X/Y"

## 6.7 — Legenda BPMN reutilizável

`src/components/flow/BpmnLegend.tsx` — grid com ícones oficiais e descrição. Renderizado no PDF (após BPMN) e disponível como toggle na tela.

---

## Estrutura de arquivos

**Novos:**
- `src/lib/flow-to-bpmn.ts` — gerador XML BPMN 2.0
- `src/lib/bpmn-layout.ts` — dagre wrapper com presets
- `src/lib/flow-validate.ts` — validador estrutural + BPMN
- `src/components/flow/BpmnRenderer.tsx` — viewer bpmn-js
- `src/components/flow/BpmnLegend.tsx`
- `src/components/flow/ExportPdfDialog.tsx` — modal editável de exportação
- `src/lib/pdf/render-bpmn.ts` — svg→png 300dpi
- `src/lib/pdf/process-matrix.ts` — tabela matriz
- `src/lib/pdf/headers-footers.ts` — cabeçalho/rodapé compartilhados

**Alterados (não removidos):**
- `src/components/flow/FlowBpmnPreview.tsx` — passa a delegar para `BpmnRenderer` (mantém a exportação da API para não quebrar imports).
- `src/components/flow/ExportProcessPdfButton.tsx` — abre `ExportPdfDialog`.
- `src/components/flow/FlowIssuesPanel.tsx` — botão "corrigir automaticamente".
- `src/lib/flow.functions.ts` — hook de auto-layout ao mutar conexões.

**Pacotes a instalar:** `bpmn-js`, `canvg` (svg→canvas para 300 dpi). `dagre`, `jspdf`, `html2canvas-pro` já instalados.

## Ordem de execução
1. 6.1 + 6.2 + 6.5 — Renderer BPMN 2.0 + auto-layout + raias (unitário: entrega visual profissional).
2. 6.3 + 6.4 — Validação + correção automática.
3. 6.6 + 6.7 — Exportação PDF profissional com prévia editável, matriz e legenda.

## Fora deste ciclo
- Editor visual do BPMN (BPMN permanece derivado).
- Aplicar template unificado a Ata/POP/IT/Relatório Final (permanece em backlog da fase seguinte).

Confirma iniciar por **6.1 + 6.2 + 6.5** (Renderer BPMN 2.0 + auto-layout + raias)?
