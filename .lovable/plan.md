
## Correção prévia (build quebrado)

Instalar `pdf-lib` (`bun add pdf-lib`) — usado em `interviews.functions.ts` da Fase 1, mas nunca foi instalado, derrubando o build atual.

## Visão geral

Fase 2 entrega processos hierárquicos N0/N1/N2, editor BPM visual (React Flow), sugestões automáticas via IA a partir das transcrições, Mapas (Informação, Decisão, Dores), Cronoanálise mobile-first e CRUD de Indicadores e Planos de Ação — tudo rastreável e navegável a partir da entrevista.

## Modelo de dados (novas tabelas)

- `processes` — nível (0/1/2), `parent_id`, `company_id`, nome, descrição, responsável, objetivo, entradas/saídas (texto), sistemas (text[]), criado a partir de `interview_id` (opcional).
- `process_activities` — pertence a `process_id`, ordem, tipo (`start|task|decision|wait|approval|end|info_in|info_out`), título, descrição, responsável, área, sistemas (text[]), tempo decimal (min), observações, posição x/y (canvas).
- `process_edges` — `source_activity_id`, `target_activity_id`, `process_id`, label (ex.: "Sim"/"Não").
- `process_information_map` — atividade, origem, destino, meio, responsável, documento, risco_perda (bool).
- `process_decision_map` — atividade, decisor, decisão, aprovação_necessária, atraso_relatado.
- `pain_points` — `company_id`, origem (`interview|process|cronoanalysis`), origem_id, categoria (enum: processo, informação, governança, pessoas, tecnologia, planejamento, qualidade, produção, compras, logística), descrição, severidade, reclassificável.
- `indicators` — `company_id`, `process_id?`, nome, descrição, unidade, meta, frequência.
- `action_plans` — `company_id`, `process_id?`, `interview_id?`, `cronoanalysis_id?`, `pain_point_id?`, título, descrição, responsável, prazo, status (`aberto|em_andamento|concluido`), prioridade.
- `cronoanalysis_sessions` — `company_id`, `process_id?`, linha, máquina, produto, data, observador.
- `cronoanalysis_observations` — `session_id`, atividade, tempo_decimal (min), classificação (`VA|NVA|NNVA`), observações, ordem.

Todas com RLS `authenticated` (equipe compartilhada) + GRANTs e triggers de `updated_at`. Sem FK para `auth.users` exceto `created_by` opcional.

## Server functions (`src/lib/`)

- `processes.functions.ts`: CRUD processos, listar árvore por empresa, CRUD atividades/edges, salvar layout do canvas.
- `process-ai.functions.ts`: `suggestProcessFromInterview(interviewId)` — usa transcrição + análise existente, chama `google/gemini-3-flash-preview` com schema Zod retornando `{ activities[], edges[], information_map[], decision_map[], pains[] }`. Sugestões vão para uma área de revisão antes de gravar.
- `maps.functions.ts`: gerar Mapa de Informação, Mapa de Decisão e Mapa de Dores consolidados por empresa (agregação SQL + IA opcional para reclassificar dores).
- `cronoanalysis.functions.ts`: CRUD sessões/observações, cálculos (tempo total, %VA/%NVA/%NNVA, capacidade, takt time, top gargalos), sugestão de oportunidades de melhoria via IA.
- `indicators.functions.ts` e `action-plans.functions.ts`: CRUD simples + `createActionPlanFromPain(painId)` e `createActionPlanFromBottleneck(observationId)`.

Todas com `requireSupabaseAuth`.

## UI / Rotas (sidebar + topbar + área central rolável)

Adiciona shell global com sidebar fixa em `_authenticated/route.tsx` (links: Entrevistas, Empresas, Processos, Cronoanálise, Indicadores, Planos de Ação, Mapas).

Novas rotas (todas páginas completas, sem modais):

- `/processos` — árvore N0/N1/N2 por empresa, botão "Novo processo" e "Gerar a partir de entrevista".
- `/processos/$id` — header com metadados + abas: **Fluxo BPM** (React Flow drag-and-drop com paleta de nós), **Atividades** (tabela), **Informação** (tabela origem/destino/meio), **Decisão**, **Indicadores**, **Planos de ação**, **Cronoanálise** (sessões vinculadas).
- `/processos/$id/sugestoes` — review das sugestões IA (aceitar/editar/descartar item a item) antes de gravar.
- `/cronoanalise` — lista de sessões.
- `/cronoanalise/nova` — formulário mobile-first com cronômetro embutido, seleção rápida VA/NVA/NNVA, autocomplete de linha/máquina/produto.
- `/cronoanalise/$id` — observações + dashboard de tempos (%VA/NVA/NNVA, gargalos, takt) + botão "Gerar planos de ação".
- `/indicadores` e `/indicadores/$id`.
- `/planos-acao` e `/planos-acao/$id` (filtros por status/prioridade).
- `/mapas/informacao`, `/mapas/decisao`, `/mapas/dores` — consolidados por empresa, com filtros e reclassificação manual.

Botão "Gerar processo com IA" também aparece na tela da entrevista (`/entrevistas/$id`) e leva para `/processos/$id/sugestoes`.

## Editor BPM (React Flow)

- `bun add reactflow`.
- Nós customizados por tipo (start/task/decision/wait/approval/end/info_in/info_out), cores semânticas.
- Paleta lateral para arrastar novos nós, edição inline de label/tempo/responsável no painel direito.
- Persistência: posições salvas em `process_activities.x/y`, conexões em `process_edges`.
- Layout automático inicial (dagre) para sugestões IA recém-aceitas.

## Rastreabilidade / navegação

Breadcrumbs e botões "Ver origem" em cada entidade. Cada plano de ação, dor, indicador, sessão de cronoanálise mostra os links de contexto (entrevista, processo, atividade). Página `/entrevistas/$id` ganha bloco "Processos gerados".

## Identidade visual

Mantém laranja primário + cinza claro, Inter, cards minimalistas, tokens semânticos já definidos em `src/styles.css`. Nada de cores hardcoded.

## Regras de IA

- Sugestões IA nunca gravam direto; sempre passam por tela de revisão.
- Schema Zod com `strict()` para impedir invenção fora da transcrição.
- Modelo: `google/gemini-3-flash-preview` para extração estruturada (custo/latência baixos).

## Fora desta fase

- Versionamento de processos / histórico de mudanças BPM.
- Exportação BPMN 2.0 XML (só PDF do processo, reusando `pdf-lib`).
- Permissões por papel (continua equipe compartilhada).
- Tradução / diarização das transcrições.

## Ordem de implementação

1. `bun add pdf-lib reactflow dagre @types/dagre` (desbloqueia build).
2. Migração: todas as tabelas + RLS + GRANTs + triggers.
3. Shell com sidebar + rotas vazias.
4. CRUD processos (sem IA) + editor BPM básico.
5. Server fn de sugestão IA + tela de revisão.
6. Mapas (Informação, Decisão, Dores).
7. Cronoanálise (form mobile + dashboard).
8. Indicadores + Planos de Ação + ganchos de geração automática.
9. Botões de navegação cruzada e breadcrumbs.
