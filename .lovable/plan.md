## Fase 3 — Análise Crítica, TO BE e Geração de Melhorias

Construir o módulo de análise/redesenho sobre o que já existe (entrevistas, processos AS IS, indicadores, cronoanálise, mapas, dores, planos). Tudo segue o mesmo padrão visual e de navegação das fases anteriores (laranja/cinza, sidebar do `_authenticated/route.tsx`, páginas com scroll contínuo, React Flow para BPM).

### 1. Modelo de dados (uma migração)

Novas tabelas em `public` (com GRANT + RLS `authenticated`, trigger `set_updated_at`):

- `process_versions` — `process_id`, `version_no`, `kind` ENUM(`as_is`,`to_be`), `label`, `notes`, `snapshot` jsonb (atividades + edges + maps no momento do snapshot), `created_by`.
- `tobe_processes` — `source_process_id` (FK AS IS), `company_id`, `name`, `description`, `status` ENUM(`draft`,`approved`,`archived`). Reaproveita `process_activities`/`process_edges` via coluna nova `tobe_process_id` (nullable) — assim o editor BPM existente serve para AS IS e TO BE.
- `tobe_change_log` — por atividade/edge alterada: `tobe_process_id`, `change_type` ENUM(`added`,`removed`,`modified`,`simplified`), `target_ref` (id de atividade), `problem_addressed`, `opportunity_id` FK, `indicator_id` FK, `expected_benefit`.
- `improvement_opportunities` — `company_id`, `process_id`, `tobe_process_id` (nullable), `title`, `description`, `root_cause_id` (nullable), `pain_point_id` (nullable), `indicator_id` (nullable), `expected_benefit`, `effort` ENUM(`baixo`,`medio`,`alto`), `impact` ENUM(`baixo`,`medio`,`alto`), `priority_score` numeric, `priority` ENUM(`baixa`,`media`,`alta`,`critica`), `status` ENUM(`sugerida`,`aprovada`,`rejeitada`,`implementada`), `source` ENUM(`ia`,`manual`), `action_plan_id` FK nullable.
- `prioritization_criteria` — `company_id`, `name`, `weights` jsonb (impacto/urgência/esforço/risco/custo/alinhamento), `is_default`.
- `root_cause_analyses` — `company_id`, `problem` text, `method` ENUM(`5_porques`,`ishikawa`,`categoria`), `data` jsonb (estrutura específica do método), `pain_point_id` nullable, `process_id` nullable.
- `root_cause_actions` — `analysis_id`, `kind` ENUM(`corretiva`,`preventiva`), `description`, `action_plan_id` nullable.
- `roadmap_items` — `company_id`, `opportunity_id` nullable, `horizon` ENUM(`curto`,`medio`,`longo`), `theme`, `area`, `responsible`, `deadline`, `priority`, `effort`, `expected_impact`, `status`.
- `executive_diagnostics` — `company_id`, `title`, `content` jsonb (seções editáveis: dores, causas, processos críticos, gargalos, riscos, oportunidades, projetos), `generated_at`, `edited_at`.
- `implementation_metrics` view materializada não — calculada via server fn agregando `improvement_opportunities` por status.

Extensões em tabelas existentes:
- `process_activities` + `process_edges`: coluna `tobe_process_id uuid null` (FK) — quando preenchida pertence a um TO BE, senão ao AS IS via `process_id` existente.
- `action_plans`: colunas `opportunity_id`, `root_cause_id`, `indicator_id` (FKs nullable) para rastreabilidade.

### 2. Server functions (`src/lib/`)

- `tobe.functions.ts` — `cloneAsIsToTobe(processId)` (copia atividades/edges para novo TO BE), `getTobe(id)`, `updateTobe`, `compareAsIsTobe(processId)` (retorna deltas: added/removed/modified/time savings via cronoanálise associada).
- `versions.functions.ts` — `snapshotProcess(processId, kind, label)` grava `process_versions`, `listVersions(processId)`, `restoreVersion(versionId)`.
- `opportunities.functions.ts` — CRUD + `approveOpportunity` (cria action_plan já preenchido), `rejectOpportunity`, `prioritize(criteriaId)` (recalcula `priority_score`).
- `root-cause.functions.ts` — CRUD 5 Porquês / Ishikawa / categoria + ações.
- `roadmap.functions.ts` — CRUD + agrupamentos.
- `diagnostics.functions.ts` — `generateExecutiveDiagnostic(companyId)` consolida dores/causas/oportunidades + IA estrutura texto editável; `updateDiagnostic`.
- `ai-analysis.functions.ts` — usa `createLovableAiGatewayProvider` + `gemini-3-flash-preview` com `Output.object`:
  - `analyzeProcessCritically(processId)` → retorna lista de findings (desperdícios, gargalos, retrabalhos, NVA, aprovações em excesso, transferências, conflitos, ausência indicador/responsável, dependência de pessoa, riscos) e gera `improvement_opportunities` em status `sugerida`.
  - `suggestTobe(processId)` → sugestão de atividades para TO BE (revisável antes de aplicar).
- `metrics.functions.ts` — `getImplementationMetrics(companyId)` para dashboard.

Tudo com `requireSupabaseAuth`. Snapshots e clones executam dentro de transação lógica (múltiplos inserts sequenciais).

### 3. Rotas (todas em `_authenticated/`)

- `analise-critica.index.tsx` — lista processos com botão "Analisar com IA" → grava findings → tabela de findings editáveis.
- `oportunidades.index.tsx` — Matriz de Oportunidades (tabela com filtros por processo/status/prioridade, ações aprovar/rejeitar/editar, gerar plano de ação).
- `oportunidades.$id.tsx` — detalhe + vínculos (processo, causa raiz, indicador, plano).
- `priorizacao.index.tsx` — configura critérios (pesos) + recalcular + tabela ordenada.
- `causa-raiz.index.tsx` + `causa-raiz.$id.tsx` — editor 5 Porquês (lista encadeada de 5 níveis), Ishikawa (6 categorias clássicas com itens), categorização simples + ações vinculadas.
- `tobe.index.tsx` — lista de TO BE por empresa, botão "Criar TO BE a partir de AS IS".
- `tobe.$id.tsx` — editor BPM (reusa `BpmFlow`) + aba "Mudanças" (log das alterações com problema/indicador/benefício) + aba "Comparar AS IS x TO BE".
- `processos.$id.tsx` — adicionar abas: "Versões" (snapshot/restore), "Análise Crítica", botão "Criar TO BE".
- `roadmap.index.tsx` — kanban por horizonte (curto/médio/longo), agrupável por área/tema.
- `diagnostico.index.tsx` — escolhe empresa, gera/edita Diagnóstico Executivo (seções editáveis em cards), botão exportar PDF (reusa pdf-lib).
- `dashboard.index.tsx` (ou aba em `/`) — KPIs de implementação: identificadas/aprovadas/em andamento/concluídas + gráfico simples.

Sidebar ganha grupo "Análise & Melhoria" com: Análise Crítica, Oportunidades, Priorização, Causa Raiz, TO BE, Roadmap, Diagnóstico.

### 4. Componentes reutilizáveis

- `OpportunityCard` / `OpportunityForm`
- `ComparisonView` (AS IS vs TO BE — duas colunas com deltas destacados)
- `FiveWhysEditor`, `IshikawaEditor`
- `PriorityMatrix` (heatmap impacto x esforço)
- `RoadmapBoard` (3 colunas horizonte)
- `DiagnosticSection` (card editável inline)
- `VersionTimeline`

### 5. IA — regras

- Sempre `Output.object` com schemas pequenos (descrição + categoria enum curta).
- Prompt deixa claro: nunca aplicar automaticamente; gerar como `sugerida`.
- Análise crítica recebe contexto: atividades, edges, indicadores, cronoanálise, dores associadas, mapas — passa como JSON compacto.
- Diagnóstico executivo: agrega dados reais, IA só organiza/redige.

### 6. PDF e rastreabilidade

- Diagnóstico Executivo e Roadmap exportáveis em PDF (pdf-lib já instalado).
- Cada Oportunidade exibe trilha: Entrevista → Dor → Causa → Processo → Indicador → Plano.

### 7. Ordem de implementação

1. Migração (todas as tabelas + extensões + GRANTs + RLS).
2. Server fns CRUD básicos (opportunities, root-cause, roadmap, versions, tobe).
3. IA: analyzeProcessCritically + suggestTobe + diagnóstico.
4. Rotas + componentes UI.
5. Integração na sidebar e em `processos.$id`.
6. Métricas e PDFs.

### Fora de escopo
- Workflow de aprovação multi-usuário (single role já existente).
- Versionamento de TO BE em sub-versões (apenas snapshots gerais via `process_versions`).
- Simulação de cenários financeiros detalhados.

Aprovar para eu seguir com a migração e implementação.