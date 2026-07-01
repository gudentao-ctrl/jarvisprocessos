# Refatoração JARVIS — Mobile-first, sem quebrar nada

Nada é removido. Banco atual permanece intacto. Refatoração puramente de UX/navegação/arquitetura de informação, com **mobile-first** como regra em todas as telas (touch alvos ≥44px, bottom-nav persistente, sheets em vez de dialogs largos, tabelas viram cards, gestos de swipe onde fizer sentido).

## 1. Hierarquia Empresa → Projeto → Processo

**Navegação raiz** (bottom-nav mobile, sidebar desktop):
- Empresas · Projetos · Calendário · Relatórios · Mais

**Empresa (`/empresas/$id`)** — abas horizontais scrolláveis:
Visão geral · Indicadores · Planos · Projetos · Documentos · Histórico.

**Projeto (`/projetos/$id`)** — Torre de Controle:
- Cabeçalho compacto (empresa, consultor, dias, % conclusão, status) empilhado no mobile.
- **Chips horizontais scrolláveis de fase** (livre, não bloqueante): Planejamento · Mapeamento · Análise · Melhorias · Execução · Gestão · Encerramento. Trocar fase só troca a tela.
- Cartões grandes, 1 coluna no mobile, 2 no tablet, 3 no desktop.

**Processo (`/processos/$id`)** — menu interno em **bottom-sheet** no mobile (botão "Seções") e sidebar interna no desktop:
Visão Geral · SIPOC · BPM · Informações · Decisões · Cronoanálise · Indicadores relacionados · Melhorias IA · Documentos · Histórico. Uma única rota, sub-views internas — não abre páginas novas.

## 2. Indicadores e Planos pertencem à EMPRESA (não ao processo)

Sem mudar schema (colunas `company_id` já existem). Vínculo N:N com processos via novo array `process_ids UUID[]` aditivo. Nas telas de Processo aparecem apenas os relacionados.

## 3. Torre de Controle (Dashboard do Projeto)

Cartões clicáveis, todos com badge numérico e ação "Ir para item":
Entrevistas pendentes · Processos mapeados · Processos sem BPM · Cronoanálises pendentes · Indicadores sem coleta · Indicadores abaixo da meta · Planos atrasados · Reuniões agendadas · Riscos · Alertas críticos.

**Central de Alertas** contextualizada ("OEE sem coleta há 12 dias") — expansível, uma linha por alerta no mobile com swipe para "Ir".

## 4. Calendário (novo)

Rota `/calendario` + aba no projeto. Visão mensal (react-day-picker já instalado) + lista scrollável de eventos abaixo. Botão flutuante "Agendar reunião" (Entrevista/Workshop/Follow-up/Apresentação/Auditoria/Visita/Status). Fonte: `interviews` + coluna aditiva `meeting_type`. Lembretes via toasts / e-mail futuro.

## 5. Coleta pública de indicadores (já parcial)

`/c/$token` sem login, layout mobile-first (uma coluna, campos grandes, botão único "Enviar"). Bloquear qualquer wrapper de auth em `/c/*` e `/api/public/*`. Botão "Copiar link" nos indicadores gera `${origin}/c/<token>`. Envio dispara recalculo de alertas.

## 6. Compartilhamento público de Planos

Espelha indicadores: `action_plans.public_token` (aditivo) + rota `/p/$token` — Status / Comentário / Anexo / Concluir, sem login.

## 7. BPM profissional

Refatora `BpmFlow.tsx` mantendo dados atuais:
- React Flow com zoom, minimap, auto-layout Dagre, snap, undo/redo, duplicar, alinhar, conectores ortogonais (`smoothstep`), handles grandes (16px) para touch.
- Piscinas/Raias via nós `group` (Departamento/Responsável); cor por setor.
- **Mobile**: modo "Lista estruturada" (atual) continua sendo o default no touch; modo "Fluxo" abre em tela cheia com pan/pinch nativos.
- Botão **"Construir com IA"**: reusa pipeline existente com nova entrada — gravar áudio, upload de áudio/vídeo/ata/Word/PDF (mammoth + pdfjs-dist), transcreve → IA extrai atividades/decisões/responsáveis/docs/entradas/saídas/esperas/retrabalho → grava em `process_activities`/`process_edges`.

## 8. Mapa de Informação em grafo

Substitui lista por grafo (React Flow). Nós com Origem, Documento, Meio, Responsável, Destino, Sistema, Periodicidade, Risco, Tempo, Automatizado, Digital, Retrabalho (colunas aditivas onde faltarem). Filtros por processo/risco/meio. Botão IA "Detectar gargalos" destaca nós problemáticos (docs duplicados, retrabalho, aprovações desnecessárias, informação perdida). No mobile: grafo full-screen com toolbar flutuante + fallback em cards agrupados.

## 9. Mapa de Decisão em árvore

Árvore hierárquica sobre `process_decision_map` com Quem decide, Critério, Dados, Tempo, Frequência, Consequência, Impacto, Valor financeiro, Risco. Botão IA "Analisar decisões" marca centralizadas / sem critério / duplicadas / subjetivas / aprovações desnecessárias.

## 10. Assistente IA do Consultor

Componente `<AskAi>` como **FAB (botão flutuante)** presente em qualquer processo/projeto — abre bottom-sheet no mobile / painel lateral no desktop. Nova server function `askConsultantAi(contextRef)` com contexto do processo/projeto e prompts sugeridos: gargalos, desperdícios, NVA, indicadores faltantes, riscos, melhorias Lean, automações, gerar plano de ação, gerar relatório. Usa fallback multi-modelo já implementado.

## 11. Hub de Relatórios

Rota `/relatorios` com cards por tipo (Executivo, Operacional, por Processo, por Empresa, Indicadores, Planos, Cronoanálise, Mapeamento). Export client-side: PDF (jspdf), Excel (xlsx), Word (docx).

## 12. Preservação obrigatória

Todas as rotas atuais permanecem funcionais. Migrações **apenas aditivas** (nullable/arrays/tabelas auxiliares). Nada é dropado. Rotas antigas continuam acessíveis a partir do menu "Mais".

---

## Detalhes técnicos

**Regras mobile-first aplicadas em toda a refatoração**
- Bottom-nav fixa em `< lg`, sidebar em `≥ lg`.
- Todo botão/target ≥44×44px; inputs `text-base` para evitar zoom no iOS.
- Diálogos > 500px viram `Sheet` bottom no mobile.
- Grid padrão: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`.
- Chips/tabs horizontais com `overflow-x-auto snap-x`.
- Tabelas de listagem viram cards agrupados em `< sm`.
- Grafos (BPM / Info / Decisão) abrem em tela cheia no mobile com toolbar flutuante e pinch-zoom.
- Nenhum hover-only affordance; toda interação tem equivalente tap/long-press.

**Estrutura de rotas nova (aditiva)**
```
/empresas/$id                (novas abas)
/projetos/$id                (Torre de Controle + chips de fase)
/processos/$id               (menu interno, sem sub-rotas novas)
/calendario                  (nova)
/relatorios                  (nova)
/p/$token                    (nova, pública — planos)
```
Rotas atuais mantidas como atalhos.

**Migrações aditivas** (nenhuma destrutiva)
- `action_plans.public_token TEXT UNIQUE`
- `interviews.meeting_type TEXT`
- `indicators.process_ids UUID[]`, `action_plans.process_ids UUID[]`
- `process_information_map`: `system`, `periodicity`, `is_automated`, `is_digital`, `has_rework`, `time_minutes` (onde faltar)
- `process_decision_map`: `financial_impact`, `frequency`, `criteria`, `data_used` (onde faltar)

**Bibliotecas a instalar**
`docx`, `xlsx`, `mammoth`, `pdfjs-dist`. `jspdf`, `reactflow`, `dagre` já presentes.

**Ordem de execução**
1. Migração aditiva única.
2. Torre de Controle + chips de fase livres.
3. Menu interno do Processo (sub-views).
4. Empresa como hub.
5. Calendário + agendamento.
6. BPM pro + upload multiformato para IA.
7. Grafo de Informação + Árvore de Decisão + IA gargalos/análise.
8. FAB Assistente IA.
9. Hub de Relatórios (PDF/Excel/Word).
10. Compartilhamento público de Planos.
11. `bun run build:dev` + smoke test mobile (390px) e desktop de cada rota.

**Guardrails**
- Nenhum `DROP`, nenhum componente removido — apenas realocado.
- Toda mudança isolada por commit lógico para rollback pontual.
- Nenhuma tela nova sem passar no viewport 390×622 (o atual do usuário).
