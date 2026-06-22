
# Reestruturação da Plataforma (Fase 4)

Escopo amplo. Vou dividir em **5 entregas sequenciais** para você validar cada uma antes da próxima. Cada entrega é funcional por si só.

## Entrega 1 — Nova Arquitetura de Navegação

**Objetivo:** Reduzir o menu principal a 3 itens e organizar tudo por projeto/etapa.

- Novo modelo de dados: tabela `projects` (vinculada a `company_id`), com status, datas, responsável e percentual de evolução calculado.
- Vincular entidades existentes (entrevistas, processos, indicadores, planos de ação, oportunidades, etc.) a `project_id` (coluna nullable + backfill opcional para a primeira empresa).
- Sidebar reduzida a: **Empresas**, **Dashboard**, **Projetos**.
- Rota `/projetos/$id` com 5 abas em sequência:
  1. **Diagnóstico** — entrevistas, transcrições, análises IA, mapa de dores, mapa de informação, mapa de decisão
  2. **Mapeamento** — processos, BPM, cronoanálises
  3. **Melhorias** — análise crítica, oportunidades, causa raiz, priorização, TO BE
  4. **Execução** — planos de ação, indicadores, coletas
  5. **Gestão** — dashboards, relatórios, horas, encerramento
- **Home do projeto** (`/projetos/$id` raiz): cards com nº de entrevistas, processos mapeados, oportunidades, planos abertos, indicadores críticos/atrasados, ações vencidas, % de evolução.
- Rotas legadas mantidas como redirects para a nova estrutura aninhada.

## Entrega 2 — BPM Reformulado (Lista → Fluxograma)

**Objetivo:** Tirar o desenho manual do caminho crítico.

- Novo fluxo na tela do processo:
  1. **Aba "Lista Estruturada"** (default) — IA extrai atividades das entrevistas vinculadas e mostra como lista ordenada editável (drag handle, inline edit, add/remove/reorder, marcar tipo: atividade/decisão/aprovação/espera/retrabalho/gargalo, definir responsável, entradas, saídas).
  2. Botão **"Gerar Fluxograma"** — só habilita após validação da lista, gera nodes/edges automaticamente com layout `dagre`.
  3. **Aba "Fluxograma"** — React Flow ocupando viewport quase inteiro, com zoom, minimap, controls, modo **tela cheia** (Fullscreen API), auto-layout, drag-and-drop para criar conexões.
- IA expandida (`extractActivitiesFromInterviews`) detecta: atividade, responsável, entradas, saídas, decisões, aprovações, esperas, retrabalhos, gargalos.
- Versão mobile: lista estruturada é a visão primária; fluxograma abre em tela cheia.

## Entrega 3 — Indicadores com Coleta Pública

**Objetivo:** Indicador = mecanismo de coleta externa simples.

- Schema:
  - `indicators`: adicionar `code` (único interno), `public_token` (uuid, único), `frequency` (diaria/semanal/quinzenal/mensal/trimestral), `target_value`, `critical_min`, `critical_max`, `unit`, `responsible_email`.
  - Nova tabela `indicator_collections`: `indicator_id`, `period_ref`, `value`, `note`, `submitted_at`, `submitted_by_name`, `evaluation` (verde/amarelo/vermelho — calculada por trigger).
- Rota pública **sem auth**: `/coleta/$token` — formulário mínimo (nome do indicador exibido, período pré-preenchido, campo valor, observação). Sem histórico, sem dashboard. Server route `/api/public/coletas/$token` para POST.
- Geração automática do link público + botão "Copiar link / WhatsApp / Email".
- Trigger no banco classifica automaticamente verde/amarelo/vermelho ao inserir uma coleta.

## Entrega 4 — Monitoramento, Pendências e Dashboard Executivo

- View `v_indicator_status`: para cada indicador, calcula `last_collection_at`, `next_due_at` (baseado em `frequency`), `status` (em_dia / proximo_vencimento / atrasado / sem_coleta).
- Painel **Pendências** dentro da etapa Execução: três listas (sem coleta, próximos do vencimento, atrasados) com ação rápida "enviar link".
- **Dashboard executivo** (no menu raiz e na home do projeto): destaque para indicadores críticos (vermelho), abaixo da meta (amarelo) e sem preenchimento; KPIs do portfólio.
- Classificação semafórica aplicada nas listas existentes de indicadores.

## Entrega 5 — Rastreabilidade Bidirecional + Polimento Mobile

- Tabela genérica `entity_links` (`source_type`, `source_id`, `target_type`, `target_id`, `relation`) para registrar relações: entrevista↔processo↔atividade↔dor↔indicador↔oportunidade↔plano de ação↔causa raiz.
- Componente `<RelatedItems entityType entityId />` reutilizável: lista clicável agrupada por tipo, abre o item alvo.
- Na tela de atividade do processo: mostra entrevistas de origem, dores, indicadores, planos.
- Na tela de plano de ação: mostra origem (entrevista/processo/indicador/oportunidade/análise crítica/causa raiz).
- **Mobile:** converter modais de detalhe restantes em rotas full-page com scroll contínuo; formulários longos divididos em seções (`<Accordion>` ou steps) com autosave (debounce 1s → server fn).

## Detalhes Técnicos

- **Stack:** mantém TanStack Start, server functions, Supabase. Sem novas dependências obrigatórias além de `@dnd-kit/sortable` (lista BPM) e `dagre` (já instalado se Fase 2 usou).
- **Segurança:** `indicator_collections` permite INSERT por `anon` apenas via server route que valida `public_token`; SELECT só para `authenticated`. `entity_links` herda RLS via `authenticated`.
- **Compatibilidade:** rotas antigas (`/processos`, `/indicadores`, etc.) viram redirects para a primeira aba do projeto ativo do usuário, evitando 404 em links salvos.
- **Fora de escopo desta fase:** notificações push/email automáticas para indicadores atrasados (mantém envio manual via botão "copiar link"), workflow de aprovação multi-usuário, app mobile nativo.

## Ordem de Execução

Vou começar pela **Entrega 1** (nova arquitetura de navegação + tabela `projects` + home do projeto). Depois de você validar a navegação, sigo para a Entrega 2 (BPM). As demais entregas em sequência.

Confirma que posso começar pela Entrega 1?
