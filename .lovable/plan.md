# Refatoração Processos — Fluxo Mestre + BPMN Automático

Escopo grande. Proponho executar em **4 sub-fases sequenciais**, cada uma entregando algo utilizável, sem quebrar nada existente. Confirma antes de eu iniciar cada uma.

## Princípios
- Zero perda de dados. Migro `process_activities` + `process_edges` atuais para o novo modelo de Fluxo.
- Fluxo = fonte da verdade. BPMN vira **render read-only** derivado do Fluxo.
- Módulos existentes (Cronoanálise, Indicadores, Planos, TO BE, Relatórios, IA, Agenda, Horas, Entrevistas, Controle) permanecem intactos — apenas ganham vínculos opcionais.
- Mobile-first. Edição via Bottom Sheet.

---

## Sub-fase 4.1 — Modelo de dados + migração (base)

**Migração SQL (aditiva, não destrutiva):**
- `process_activities`: adicionar colunas `documents text[]`, `system text`, `estimated_time_min int`, `problems text`, `improvements text`, `attachments jsonb`, `interview_snippet text`, `position_x float`, `position_y float`. Manter colunas existentes.
- Nova tabela `activity_connections` (substitui edges com semântica rica):
  - `id`, `process_id`, `from_activity_id`, `to_activity_id`, `type` (`sequential|decision|parallel|return|subprocess`), `label` (resposta da decisão), `order_index`, timestamps.
  - GRANT + RLS por company_id via processo.
- Nova tabela `process_decisions`:
  - `id`, `activity_id` (a decisão é uma atividade tipo `decision`), `question`, timestamps.
- Nova tabela `activity_links` (vínculos cruzados opcionais):
  - `id`, `activity_id`, `link_type` (`indicator|cronoanalysis|action_plan`), `target_id`.
- Nova tabela `document_templates` (config única para todos os PDFs):
  - `id`, `company_id`, `consultancy_logo_url`, `client_logo_url`, `header_html`, `footer_html`, `primary_color`, `font_family`, `code_prefix`, `numbering_seed int`.
- Backfill: converter `process_edges` atuais → `activity_connections` tipo `sequential`.

## Sub-fase 4.2 — Editor de Fluxo (UI mestre)

**Novo componente `<FlowEditor />`** substitui a aba "Fluxo BPM" atual na tela `/processos/$id`.
- Duas abas: **Fluxo | BPMN**. BPMN passa a ser read-only.
- Cartões verticais empilhados, com indicadores visuais de tipo (ação, decisão, paralelo, subprocesso).
- Tap no cartão → **Bottom Sheet** (Drawer shadcn) com todos os campos: nome, descrição, responsável, tempo, entradas, saídas, docs, sistema, observações, problemas, melhorias, anexos, vínculos (indicadores/crono/planos), trecho de entrevista.
- Ações no sheet: Adicionar antes / depois / paralelo, Criar decisão, Criar subprocesso, Duplicar, Mover, Excluir.
- **Gerenciador de conexões** por atividade (lista de entradas + lista de saídas, com tipo).
- **Decisão**: pergunta + N respostas, cada uma aponta para atividade existente (Select).
- **Paralelismo**: multi-select "após esta, executar em paralelo".
- **Convergência**: atividade recebe múltiplas entradas nativamente.
- Drag & drop com `@dnd-kit/sortable` (já instalado). Reordenação mantém conexões.

**Painel lateral de inconsistências** (`<FlowIssuesPanel />`):
- Regras client-side: sem início, sem fim, atividade sem responsável, decisão sem respostas, loop infinito (DFS), atividade órfã.
- Botão "Corrigir automaticamente" quando aplicável.

## Sub-fase 4.3 — IA + BPMN automático

**IA:**
- Botão "Gerar Processo IA" muda o prompt: extrai atividades **estruturadas** (JSON com atividades, responsáveis, decisões, paralelismos, loops, subprocessos, problemas, oportunidades) e grava direto no novo modelo de Fluxo — nunca mais no formato BPM antigo.
- Botão "Criar Processo" cria Fluxo vazio.
- Análise pós-geração popula o painel de inconsistências.

**BPMN read-only (`<BpmnRenderer />`):**
- Transformer `flow → bpmn` em `src/lib/flow-to-bpmn.ts`:
  - Adiciona StartEvent (atividade sem entrada), EndEvent (atividade sem saída).
  - Decisão → Gateway XOR. Paralelo → AND. Convergência de N → AND join.
  - Retorno → sequence flow reverso. Subprocess → CollapsedSubprocess.
  - Layout automático com `dagre` (top-down ou left-right).
- Renderiza com `bpmn-js` (viewer, não modeler). Regenera on-demand quando o Fluxo muda.
- Validação BPMN 2.0 antes do salvar: lista erros no painel.

## Sub-fase 4.4 — Exportação PDF profissional + Template unificado

**Nova tela `/config/template-documentos`** para editar `document_templates` da empresa.

**Novo `exportBpmDocument()`** em `src/lib/bpm-pdf.functions.ts` (server fn) usando `jsPDF` + `html2canvas-pro` (já instalados):
- Capa (logos, empresa, processo, código, versão, revisão, consultor, data).
- Cabeçalho/rodapé em cada página (do template).
- Dados Gerais, Matriz do Processo (tabela), BPMN em alta resolução com quebra de página inteligente (nunca cortar atividades — segmenta por pool/lane), Legenda BPMN, Indicadores, Planos, Cronoanálise (Lead Time, TC, TA, TNA, gargalos), Histórico de Revisões (`process_versions`), Aprovação.
- Suporte A4 paisagem e A3.

**Reuso do template** (fase seguinte, fora deste escopo imediato mas com hooks prontos): Ata, Relatório Executivo, Cronoanálise, POP, IT, Relatório Final consomem `document_templates`.

---

## Detalhes técnicos

- **Compatibilidade**: processos existentes continuam abrindo. `activity_connections` populada via migração de `process_edges`. Componente antigo `BpmFlow` fica temporariamente disponível na aba BPMN em modo view enquanto o novo renderer não estabiliza.
- **TO BE**: `duplicateProcessAsTobe()` já existe — passa a duplicar `activity_connections` e vínculos, jamais BPM.
- **Vínculos cruzados**: cronoanálise, indicadores e planos ganham campo opcional `activity_id` via `activity_links` (não altera schema deles).
- **Server fns**: novas em `src/lib/flow.functions.ts` (CRUD atividades/conexões/decisões/vínculos), `src/lib/flow-ai.functions.ts` (geração + análise), `src/lib/bpm-pdf.functions.ts` (export), `src/lib/document-templates.functions.ts`.
- **Pacotes a adicionar**: `bpmn-js` (viewer), `dagre`. Restante já instalado.

## Ordem de execução proposta
1. **4.1** primeiro (migração + backfill). Você aprova a migração.
2. **4.2** (editor de Fluxo). Ponto de parada para você testar em mobile.
3. **4.3** (IA + BPMN auto).
4. **4.4** (PDF + template).

## Fora deste ciclo
- Aplicar `document_templates` nos outros documentos (Ata, POP, IT, Relatório Final) — próxima fase.
- Editor visual BPMN (não haverá — BPMN é derivado).

**Confirma para iniciar pela 4.1 (migração de banco)?**
