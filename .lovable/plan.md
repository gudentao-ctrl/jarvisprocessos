
## Escopo

Reorganização de UX e correções críticas na plataforma JARVIS. Nada é removido; todas as funcionalidades atuais (Entrevistas, IA, SIPOC, BPM, Cronoanálise, Mapas, Indicadores, Coleta Pública, Planos, Agenda, Horas, Relatórios) são preservadas.

---

### 1. Correção crítica do erro ao criar Indicador / Plano de Ação (raiz identificada)

Os triggers `indicators_autofill` e `action_plans_autofill` chamam `gen_random_bytes()` mas rodam com `SET search_path = public`. A extensão `pgcrypto` está instalada em `extensions`, então a função não é resolvida — é este o "erro de função random inexistente" reportado.

**Migração**: recriar ambos os triggers com `SET search_path = public, extensions` (mudança mínima, sem alterar lógica) e trocar chamadas para `extensions.gen_random_bytes(...)` como segurança extra. Nada nas tabelas muda.

Client-side, além do fix do trigger:
- Toasts com `e?.message` real em todas as mutations de criar/editar/excluir (já feito em várias telas — auditar as restantes).
- Após criar/editar/excluir: `invalidateQueries` da lista + `indicator-status` + `alerts` + `dashboard-highlights`, sem reload manual.

---

### 2. Empresa como raiz da navegação

Nova estrutura sem quebrar rotas existentes:

- Rota inicial `/` (após login) redireciona para `/empresas` (já é a home natural do sistema).
- Ao clicar numa empresa em `/empresas`, seleciona-a e navega para `/controle` (Torre de Controle da empresa).
- Contexto global `ActiveCompanyProvider` (React context + `localStorage` `jarvis:active_company_id`), com hook `useActiveCompany()`.
- Header persistente com **seletor de Empresa** (Combobox) visível em toda a área autenticada. Trocar empresa mantém a fase/rota atual e apenas dispara `invalidateQueries` para recarregar dados da nova empresa.
- Nav principal (bottom nav mobile / sidebar desktop) passa a ser:  
  `Empresas · Controle · Fases · Agenda · Relatórios`  
  onde "Fases" abre um sheet mobile com as fases atuais (Diagnóstico, Mapeamento, Melhorias, Execução, Gestão, Encerramento) — **as fases ficam exatamente como estão hoje**.

---

### 3. Isolamento por `company_id` em todas as consultas

Ajustar todas as `list*` server functions para aceitar `company_id` opcional e filtrar quando presente. Telas passam `useActiveCompany().id` como parâmetro:

- `listProcesses`, `listIndicatorStatus`, `listActionPlans`, `listPainPoints`, `listCronoanalyses`, `listCollections`, `listEvents`, `listWorkHours`, `listInterviews`, `listOpportunities`, `listRoadmap`, `listDecisionMap`, `listInformationMap`.
- Nas criações, `company_id` é auto-preenchido com a empresa ativa.
- Torre de Controle (`/controle`) e Dashboard consomem apenas dados dessa empresa.

Sem alteração de schema — todas as tabelas já têm `company_id`.

---

### 4. Torre de Controle (`/controle`)

Nova rota `/_authenticated/controle.index.tsx` que reaproveita `AlertsPanel` + `DashboardHighlights` já existentes, filtrando por empresa ativa. Cards clicáveis para: indicadores sem coleta, abaixo da meta, críticos, planos atrasados, planos próximos, entrevistas pendentes, cronoanálises pendentes, processos sem BPM, processos sem SIPOC, próximas reuniões e próximas coletas.

---

### 5. Planos de Ação — campos GUT e histórico

Migração aditiva (`IF NOT EXISTS`) em `public.action_plans`:
- Colunas novas: `problem`, `cause`, `category`, `gravity` (1–5), `urgency` (1–5), `trend` (1–5), `gut_score` (generated: g*u*t), `new_due_date`, `expected_result`, `observations`, `evidences` (jsonb), `related_process_ids` (uuid[]), `origin`.

Nova tabela `action_plan_history` (id, plan_id, user_id, field, old_value, new_value, comment, changed_at) + trigger `AFTER UPDATE` que insere uma linha por campo alterado. Nunca apaga histórico.

UI: formulário de plano expandido (Dialog / Sheet mobile-first) exibindo os novos campos, com "Linha do tempo" abaixo listando o histórico.

---

### 6. Coleta pública de indicador — layout limpo

Ajustar `/c/$token` já pública: mostrar apenas logo, nome do indicador, descrição, meta, campo valor, observação, botão Enviar. Após envio, `invalidate` client-side em `indicator-status` + `alerts` para a próxima abertura interna refletir a coleta.

---

### 7. Agenda + Horas unificadas

Adicionar em `calendar_events` (via migração aditiva): `duration_min`, `travel_min`, `work_hours`, `minutes` (ata), `audio_url`, `transcript`, `next_actions` (jsonb).

Tela `/agenda` (renomeia `calendario`) permite criar compromisso com todos esses campos. Nova rota `/relatorios/horas-mes` gera consolidado mensal por empresa (reaproveitando `work_hours.functions` + `calendar_events`).

---

### 8. Restrição de login (segurança)

- Desabilitar signup anônimo em `configure_auth`.
- Bloquear criação de novos usuários (`disable_signup=true`).
- Adicionar guard em `_authenticated/route.tsx`: se `user.email !== 'g_zamboni@hotmail.com'`, faz `signOut()` e redireciona para `/auth` com mensagem "Acesso restrito".
- Trigger `auth.users` BEFORE INSERT que rejeita qualquer email diferente do autorizado (defesa em profundidade). Autorização por email verificado (padrão da knowledge).

---

### 9. Mobile-first

Auditoria das telas ajustadas nesta task para: sem scroll horizontal, botões `min-h-11`, inputs grandes, dialogs viram `Sheet` no mobile, cards em coluna única <sm.

---

### Detalhes técnicos

Arquivos principais a criar/editar:
- **Migração única**: fix triggers `indicators_autofill` + `action_plans_autofill` (search_path), colunas GUT em `action_plans`, tabela `action_plan_history` + trigger, colunas extras em `calendar_events`, trigger de restrição de email em `auth.users`. Todas as mudanças com `IF NOT EXISTS` / `CREATE OR REPLACE`.
- `src/lib/active-company.tsx` (novo) — context + hook.
- `src/components/CompanySwitcher.tsx` (novo) — combobox no header.
- `src/routes/_authenticated/route.tsx` — guard de email, header com switcher, nav atualizada.
- `src/routes/_authenticated/controle.index.tsx` (novo) — Torre consolidada por empresa.
- `src/routes/index.tsx` — redirect para `/empresas`.
- `src/lib/processes.functions.ts` + demais `*.functions.ts` — aceitar filtro `company_id`.
- `src/routes/_authenticated/planos-acao.index.tsx` — form GUT + histórico + timeline.
- `src/lib/action-plan-history.functions.ts` (novo).
- `src/routes/_authenticated/calendario.index.tsx` — campos ata/áudio/horas/deslocamento.
- `src/routes/c.$token.tsx` — layout limpo.
- Configuração auth via `supabase--configure_auth`.

### Fora do escopo

Não mexer em: pipeline de IA de entrevistas, editor BPM em si, exportações PDF/Excel/Word existentes, estrutura das fases do projeto.
