# Plano Consolidado — JARVIS como Cockpit de Consultoria orientado por IA

Quatro entregas que, juntas, transformam a plataforma de "módulos independentes" em um fluxo único: **entrevista → IA gera tudo → consultor valida no cockpit do projeto**.

---

## Entrega 1 — Pipeline IA pós-entrevista (gera ata + BPM + entregáveis)

Quando uma entrevista é gravada/transcrita, **um único pipeline IA** preenche todos os artefatos. O consultor passa a revisar, não a digitar.

### Gatilho
Ao concluir a transcrição (`transcripts.status='completo'`) → dispara `generateArtifactsFromInterview(interviewId)` automaticamente (botão "Gerar agora" também disponível).

### O que a IA gera (Lovable AI Gateway, `gemini-2.5-pro` para esta chamada pesada, structured output via Zod)
- **Ata da reunião** — markdown estruturado (participantes, decisões, próximos passos, citações-chave) → nova coluna `interviews.minutes_md`.
- **Processos candidatos** + **atividades BPM** com sequência inicial e `process_edges` → `processes`, `process_activities`, `process_edges` (status `rascunho_ia`).
- **SIPOC**, **Mapa de Informação**, **Mapa de Decisão** → tabelas existentes.
- **Dores** (`pain_points`), **Indicadores sugeridos** (`indicators`), **Oportunidades** (`improvement_opportunities`), **Análise crítica** (`interview_analysis`).

Cada registro recebe `generated_by_ai=true`, `source_interview_id`, `confidence`, `validated_at NULL` (colunas a adicionar nas tabelas listadas).

### Reprocessamento
Botão "Regenerar com IA" preserva itens já validados (`validated_at IS NOT NULL`); só atualiza rascunhos. Idempotente via hash da transcrição.

---

## Entrega 2 — Cockpit do Projeto (página central)

Reformula `projetos/$id/index.tsx` como página única do consultor, scroll contínuo (sem abas que escondem).

**Ordem dos blocos:**
1. **Central de Alertas** (Entrega 4) — primeira coisa visível.
2. **Header**: empresa, consultor, % evolução, datas.
3. **Próximos Passos** (gerado por IA): entrevistas pendentes, processos não validados, oportunidades sem plano, indicadores sem coleta, ações atrasadas.
4. **Cards de contexto** (grid 2 col / stack mobile): entrevistas, processos, dores, oportunidades, indicadores, planos de ação — cada um com contagem, top 3 itens, link "ver todos".
5. **Linha do tempo** automática (entrevista X feita → BPM Y gerado → oportunidade Z criada).

Server fn nova: `getProjectCockpit(projectId)` em um único round-trip.

Rotas antigas (`/oportunidades`, `/causa-raiz`, `/roadmap`, `/diagnostico`, `/mapas/*`, `/tobe`) viram seções do cockpit ou redirects para `projetos/$id` com âncora.

Sidebar global reduz a 3 itens: **Empresas**, **Dashboard**, **Projetos**.

---

## Entrega 3 — Contexto completo no processo + UX de validação

### Processo (`processos/$id`)
Tabs internas (não rotas):
- **Visão** — atividades + fluxograma + SIPOC lado a lado
- **Origem** — entrevistas que geraram (trechos da transcrição destacados)
- **Dores**, **Indicadores**, **Oportunidades**, **Planos** vinculados
- **Histórico** — `process_versions` + `tobe_change_log`

Server fn `getProcessContext(processId)` retorna tudo agregado.

### Componente `<AIDraftCard>` reutilizável
Padrão visual em todos os módulos:
- Item `generated_by_ai=true` + `validated_at NULL` → badge "Sugerido por IA", borda tracejada
- Validado → borda sólida + check
- Ações: ✅ Validar | ✏️ Editar | 🗑️ Descartar

Aplicado em: oportunidades, mapas, causa-raiz (5 Porquês e Ishikawa pré-preenchidos por IA a partir da dor), indicadores.

---

## Entrega 4 — Central de Alertas + Indicadores com Coleta Pública + Relatório Executivo

### 4a. Indicadores com link público

**Banco:** estender `indicators` (`code unique`, `public_token uuid`, `frequency`, `target_value`, `critical_min/max`, `unit`, `responsible_name/email`, `instructions`) + nova `indicator_collections` (`indicator_id`, `period_ref`, `value`, `note`, `evaluation` calculado por trigger). View `v_indicator_status` com `last_collection_at`, `next_due_at`, `status` (`em_dia|proxima|atrasado|sem_coleta`).

**Código auto-gerado:** trigger gera `EMPRESA-PROCESSO-IND-0001` (4 letras de cada + sequência).

**Rota pública:** `src/routes/c.$token.tsx` (top-level, sem auth, sem header/sidebar) — só nome do indicador, instrução, período, valor, observação, enviar. Submit via `src/routes/api/public/coletas.$token.ts`.

**RLS:** `indicator_collections` permite INSERT a `anon` quando `public_token` confere; `indicators` SELECT a `anon` apenas via view com campos seguros.

**UI consultor:** ao cadastrar, exibe link + botões "Copiar | WhatsApp | E-mail" (`wa.me/?text=`, `mailto:`).

### 4b. Central de Alertas

Server fn `getProjectAlerts(projectId)` agrupa:
- Indicadores: sem coleta, atrasados, abaixo da meta, críticos (via `v_indicator_status`)
- Planos: atrasados, vencendo em 7 dias
- Processos sem validação, Entrevistas pendentes

Componente `<AlertCenter>` no topo do cockpit, cada item clicável com `<Link to>` direto ao detalhe. Badge de total no menu do projeto.

### 4c. Dashboard executivo (global)
Atualiza `/dashboard` com contadores de indicadores pendentes/atrasados/abaixo da meta/críticos, somando todos os projetos do consultor.

### 4d. Relatório Executivo em PDF

**Banco:** tabela `executive_reports` (`project_id`, `title`, `emission_date`, `consultant_name`, `summary_md`, `bottlenecks_md`, `next_steps_md`, `snapshot jsonb`, `pdf_path`). `companies` ganha `logo_url`, `brand_primary`, `brand_secondary`.

**Server fns:**
- `generateExecutiveReport(projectId)` — agrega indicadores por status, ações por status, top processos críticos, listagem detalhada de ações (com `responsible`, `due_date`, `status`, processo e indicador relacionados). Pré-popula `summary_md`, `bottlenecks_md`, `next_steps_md` via Gemini.
- `exportExecutiveReportPdf(reportId)` — gera PDF com `pdf-lib` (Worker-safe), aplica logo/cores da empresa, salva em bucket `executive-reports`, retorna URL assinada.

**UI:** `projetos/$id/relatorio` — lista + editor com seções (Resumo, Indicadores, Planos, Gargalos, Próximos Passos), cada seção com textarea markdown + tabela auto-calculada. Botão "Exportar PDF".

---

## Detalhes técnicos comuns
- **IA:** Lovable AI Gateway, `createServerFn` com structured output Zod, `stepCountIs(50)`. Pipeline completo usa `gemini-2.5-pro` (1×/entrevista); ata sozinha usa `gemini-3-flash-preview`.
- **Migrações:** uma por entrega; todas com `GRANT` + RLS. Colunas de IA (`generated_by_ai`, `source_interview_id`, `confidence`, `validated_at`, `validated_by`) adicionadas em todas as tabelas que recebem geração automática.
- **Mobile:** cockpit em stack vertical, cards full-width; AlertCenter colapsa em accordion; alvos de toque ≥44px.
- **Custos:** geração roda 1× por entrevista; regeneração é opt-in. Prompt/resposta arquivados em `interview_analysis.raw_ai` para auditoria.

## Fora de escopo
- Notificações automáticas por e-mail/WhatsApp (apenas link manual).
- Edição colaborativa em tempo real.
- App mobile nativo.
- Versionamento múltiplo de relatórios (cada export é novo PDF, relatório é um por projeto, editável).

---

**Ordem de execução sugerida:**
1. Entrega 1 (pipeline IA — base de tudo)
2. Entrega 4a + 4b (indicadores públicos + central de alertas)
3. Entrega 2 (cockpit consumindo dados gerados + alertas)
4. Entrega 3 (contexto no processo + AIDraftCard nos módulos)
5. Entrega 4d (relatório executivo)

Confirma para começar pela Entrega 1?
