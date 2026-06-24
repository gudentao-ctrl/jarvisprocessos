
# Reestruturação JARVIS — BPM assistido, Indicadores públicos, Torre de Controle e Mobile

Plano dividido em 6 entregas independentes, na ordem recomendada de execução. Cada uma encerra valor por si só.

---

## Entrega 1 — Mapeamento Assistido (substitui o BPM manual)

**Objetivo:** trocar o editor de paleta por um construtor guiado por IA, a partir do áudio da reunião.

**Fluxo do consultor:**
1. Botão "Nova reunião de mapeamento" dentro do projeto/processo.
2. Gravar pelo navegador (MediaRecorder, webm/mp4) ou subir áudio/vídeo.
3. Transcrição via `openai/gpt-4o-mini-transcribe` (Lovable AI).
4. Extração estruturada via `google/gemini-2.5-pro` com schema Zod:
   - atividades (nome, responsável, sistema, entrada, saída, tipo: tarefa/decisão/aprovação/espera/retrabalho)
   - arestas (sequência + ramos das decisões)
   - gargalos, indicadores citados, problemas, oportunidades, participantes
   - resumo + ata
5. Tela de **validação em lista** (vertical, mobile-first): consultor confirma/edita/remove cada atividade e decisão antes de gerar o BPM.
6. Ao confirmar, grava em `processes`, `process_activities`, `process_edges`, `pain_points`, `improvement_opportunities`, `indicators` (todos com `generated_by_ai=true`, `source_interview_id`, `validated_at=null`) — reusa a pipeline da Entrega 1 anterior.
7. Geração automática derivada: SIPOC, Fluxo de Informação, Fluxo de Decisão e lista estruturada (já existem as tabelas, basta popular a partir da extração).

**Editor visual (somente ajustes finos):**
- React Flow ocupando tela cheia (`h-[100dvh]` quando em modo expandir, hoje vive em container pequeno).
- Auto-layout com `dagre` (top-down) ao abrir; botão "Reorganizar".
- Conexão automática entre blocos recém-criados (sequência); conexão manual continua via handles.
- Controles: zoom (pinch no mobile), fit, tela cheia, arrastar nó, adicionar etapa/decisão/fluxo manual via FAB.
- Painel de edição vira `<Sheet>` (drawer inferior) no mobile e lateral no desktop.
- Handles maiores (16px) e `connectionRadius=40` para toque.

**Fora de escopo desta entrega:** mudar modelo de dados do BPM. Só adicionamos `activity_type` (enum) e `lane` (responsável) se ainda não existirem.

---

## Entrega 2 — Reuniões de Mapeamento (modo dedicado)

Extensão do módulo de entrevistas com `interview_type = 'mapeamento' | 'diagnostico'`.

- Página `entrevistas/$id`: aba "Reunião de mapeamento" mostra participantes identificados (diarização simples via prompt sobre transcrição), resumo, atividades, gargalos, oportunidades, decisões, pendências — todos editáveis e linkados ao processo gerado.
- Botão "Gerar processo a partir desta reunião" dispara o fluxo da Entrega 1.
- Ata em Markdown editável (`interviews.minutes_md` já existe).
- Upload de vídeo: extrai trilha de áudio no servidor com `ffmpeg-wasm` no cliente antes de subir (evita Node `child_process` no Worker).

---

## Entrega 3 — Indicadores com coleta pública

**Schema (migration nova):**
```
indicators: + code TEXT UNIQUE, + public_token TEXT UNIQUE,
            + frequency ENUM(diario,semanal,quinzenal,mensal,trimestral),
            + target_value NUMERIC, + critical_min NUMERIC, + critical_max NUMERIC,
            + unit TEXT, + responsible_name TEXT, + responsible_email TEXT,
            + instructions TEXT

indicator_collections (nova):
  id, indicator_id FK, value NUMERIC, reference_period TEXT, observation TEXT,
  submitted_by_name TEXT, submitted_at TIMESTAMPTZ, ip_hash TEXT,
  evaluation ENUM(ok, abaixo_meta, critico)  -- preenchido por trigger
```

Código gerado: `{EMPRESA}-{PROCESSO}-IND-{seq:0004}`. Token: `gen_random_uuid()` em base62.

**RLS:**
- `indicator_collections`: `INSERT TO anon` permitido quando `EXISTS (SELECT 1 FROM indicators WHERE id = indicator_id AND public_token = current_setting('request.headers')::json->>'x-public-token')` — na prática validamos no server route (mais simples e seguro).
- `indicators`: sem acesso `anon`; leitura pública vai pelo server route, projetando apenas os campos seguros.

**Rotas:**
- `src/routes/c.$token.tsx` (público, SSR): mostra apenas nome, descrição, meta, período sugerido, campo valor, campo observação, botão enviar. Sem nav, sem histórico, sem outros indicadores.
- `src/routes/api/public/coletas.$token.ts` (POST): valida token, insere coleta, dispara avaliação de status.
- Server fn `getIndicatorPublic(token)` usando cliente publishable + policy `TO anon` restrita a colunas seguras (alternativa: server route GET no `/api/public/`).

**Cópia de link:** botão "Copiar link" + "Compartilhar no WhatsApp" (`wa.me/?text=`) no card do indicador.

---

## Entrega 4 — Avaliação e alertas automáticos de indicadores

- View `v_indicator_status` com `last_collection_at`, `next_due_at` (calc por `frequency`), `current_value`, `status` (`ok | atrasado | abaixo_meta | critico | sem_coleta`).
- Cron `pg_cron` diário: marca atrasados e atualiza materialized view (refresh).
- Cores: verde / amarelo / vermelho aplicadas via tokens semânticos (`--status-ok`, `--status-warn`, `--status-critical`) em `src/styles.css`.

---

## Entrega 5 — Torre de Controle (cockpit do projeto)

Substitui o conteúdo atual de `/projetos/$id` por uma página única chamada **Torre de Controle**, primeira tela ao abrir o projeto. Scroll vertical contínuo, mobile-first.

**Server fn** `getProjectControlTower(projectId)` retorna agregados:

```
Entrevistas:    { realizadas, pendentes }
Processos:      { mapeados, em_validacao, criticos }
Indicadores:    { sem_coleta, atrasados, abaixo_meta, criticos, total }
Planos de ação: { abertos, concluidos, atrasados, vencendo_7d }
Cronoanálises:  { pendentes, concluidas }
```

Cada card é clicável e navega para a lista filtrada do item correspondente (ex.: `/projetos/$id/indicadores?status=atrasado`).

Sidebar do projeto reduzida para: **Torre · Entrevistas · Processos · Indicadores · Planos · Cronoanálise**.

---

## Entrega 6 — Rastreabilidade completa + Mobile

**Rastreabilidade:** server fn `getEntityContext(type, id)` retorna entidades relacionadas. Componente `<RelatedContextPanel>` exibido em:
- Processo → entrevistas, indicadores, planos, cronoanálises, problemas, oportunidades.
- Plano de ação → origem (entrevista/indicador/processo), causa local, causa sistêmica.
- Indicador → processo, entrevistas que o citaram, planos vinculados.

Vínculos já existem nos FKs (`source_interview_id`, `process_id`, `indicator_id`); só falta a UI agregadora.

**Mobile (passa em todo o app):**
- Aplicar `grid-cols-[minmax(0,1fr)_auto]` + `min-w-0` + `shrink-0` nos headers (regra `responsive-layout-patterns`).
- BPM em tela cheia com `h-[100dvh]`, pinch-zoom nativo do React Flow.
- Formulários longos (novo indicador, novo plano) divididos em wizard de 2–3 passos no mobile (`<Tabs>` ou stepper) e formulário único no desktop.
- Botões `min-h-11` (≥44px).
- Eliminar overflow-x: trocar tabelas largas por cards empilhados em `<md`.

---

## Detalhes técnicos compartilhados

- **IA**: Lovable AI Gateway via `createServerFn`; modelos: `gemini-2.5-pro` (extração estruturada), `gemini-2.5-flash` (resumo/ata), `gpt-4o-mini-transcribe` (STT). Saídas com Zod.
- **Idempotência**: `transcript_hash` (já existe) evita reprocessar; regenerar preserva registros com `validated_at IS NOT NULL`.
- **Storage**: bucket `interview-audio` já existe; criar `interview-video` se necessário.
- **Migrations**: uma por entrega, sempre com `GRANT` + RLS + trigger `updated_at`.
- **Hidratação**: corrigir o `<Suspense>` fora do `<div>` em `/auth/auth` que está causando hydration mismatch (ajuste pontual no layout).

## Ordem sugerida e dependências

```
1 Mapeamento Assistido ─┐
2 Reuniões dedicadas   ─┴─► reusam pipeline IA já entregue
3 Indicadores públicos ──► independente
4 Alertas              ──► depende de 3
5 Torre de Controle    ──► depende de 3+4 para contagens reais
6 Rastreabilidade+Mobile ► transversal, fecha o ciclo
```

## Fora de escopo

Notificações push/e-mail automáticas, app mobile nativo, multi-tenant, versionamento de relatórios, colaboração em tempo real no BPM.

---

Confirma este plano e quer começar pela **Entrega 1 (Mapeamento Assistido + BPM tela cheia)**? Se preferir outra ordem (ex.: Indicadores públicos primeiro, que é independente), só dizer.
