# Correções e melhorias do JARVIS

Vou tratar 7 pontos em ondas independentes, cada um pequeno e verificável.

## 1. Botão "Exportar PDF" da entrevista

**Sintoma**: nada acontece ao clicar.
**Causa provável**: `exportInterviewPdf` roda no servidor com `pdf-lib` — em cold-start no worker pode estourar timeout / não expor erro; o botão só aparece depois de rodar Análise IA.

**Ação**:
- Trocar para geração **client-side** com `jsPDF` + `html2canvas` (padrão que já usamos noutros lugares), renderizando um bloco oculto com título, meta, transcrição, ata e análise já em tela.
- Toast de erro com mensagem real, `finally` liberando estado.
- Manter a função servidor como fallback opcional (não bloquear).

## 2. "Sugerir processos com IA" quebrando

**Causa provável**: `google/gemini-3-flash-preview` respondendo 4xx (modelo trocado) e a resposta caindo em `Resposta da IA inválida.` genérica.

**Ação em `src/lib/processes.functions.ts`**:
- Encadear fallback de modelos: `google/gemini-2.5-flash` → `google/gemini-2.5-pro` → `openai/gpt-5-mini`.
- Preservar mensagem original do gateway (429 / 402 / 4xx) no erro exibido.
- Tolerar JSON com cerca de código (```json ... ```): fazer strip antes do `JSON.parse`.
- Reforçar prompt para JSON estrito.

## 3. Coleta pública `/c/$token` pedindo login

**Sintoma**: link externo cai na tela de login.
**Causa**: hoje o `redirect` do app leva para `/auth` no primeiro carregamento (sessão anônima falha quando o backend está pausado, e o roteamento traz o usuário para o app protegido).

**Ação**:
- Confirmar que o link enviado por WhatsApp/e-mail aponta para `/c/<token>` (não `/coletas/...`). Ajustar o botão "Copiar link" no cadastro de indicadores para usar `${origin}/c/<token>`.
- Garantir que a rota `/c/$token` **não** faz `signInAnonymously()` nem redireciona ao `_authenticated`: adicionar `ssr: false` já existe; remover qualquer redirect global que atinja `/c/*`.
- Ajustar `src/routes/index.tsx` e o wrapper `_authenticated/route.tsx` para ignorar rotas iniciadas por `/c/` e `/api/public/`.

## 4. Torre de Controle: falta de coleta por frequência

**Sintoma**: indicador diário sem coleta hoje não gera alerta.
**Causa**: view `v_indicator_status` já calcula `atrasado`, mas AlertsPanel só mostra `sem_coleta` quando nunca houve nenhuma; um indicador com 1 coleta antiga não aparece por dia.

**Ação (migração)**:
- Ajustar view para retornar `atrasado` também quando **não há coleta** e o indicador é `diario/semanal/mensal` há mais de 1 período desde `created_at`.
- Aceitar variantes de frequência (`diaria`, `diario`, `daily`) via `lower(trim(...))` normalizado.
- Em `alerts.functions.ts`: um indicador com `atrasado` gera alerta **crítico** para diário (>1 dia) e **warning** para semanal/mensal, com subtítulo "última coleta há N dias / esperado hoje".

## 5. Mapas de Decisão e Informação — CRUD completo

Hoje as telas só listam por empresa. Precisamos editá-los.

**Ação**:
- Reformar `mapas.decisao.tsx` e `mapas.informacao.tsx` com botões "Adicionar", edição inline via `Dialog`, exclusão e filtro por processo.
- Usar as funções já existentes (`saveInformationItem`, `saveDecisionItem`, `deleteInformationItem`, `deleteDecisionItem`).
- Adicionar aba **Fluxo** dentro da tela do processo (`/processos/$id`) que exibe a matriz Info + Decisão do processo lado a lado.
- Ligação: cada item passa a exigir `process_id` e opcionalmente `activity_id` (dropdown).

## 6. Módulo "Horas Trabalhadas"

**Novo** — registrar horas de consultoria/execução por projeto e responsável.

**Migração** — nova tabela `work_hours`:
- `id`, `project_id (FK)`, `company_id (FK)`, `responsible`, `activity_type` (`consultoria|execucao|reuniao|outro`), `date`, `hours numeric(5,2)`, `notes`, timestamps.
- GRANT para `authenticated` + `service_role`, RLS `USING (true)` (equipe compartilhada, coerente com resto).

**UI**:
- Rota `/_authenticated/horas.index.tsx`: filtro por projeto + tabela + form rápido (data, responsável, horas, tipo).
- Somatório por projeto e por responsável no topo.
- Card no `projetos.$id.index.tsx` com total de horas do projeto (integrando com Torre de Controle).

## 7. Vínculo empresa ↔ projeto ↔ dados

Já existe `projects.company_id`. Consolidar:
- No hub do projeto exibir a empresa vinculada no cabeçalho.
- Ao criar entrevistas / processos / indicadores dentro do projeto, pré-selecionar (e travar) a `company_id` do projeto para evitar mistura.
- Nas telas gerais (`indicadores`, `mapas.*`, `planos-acao`, `entrevistas`), quando a rota vier com `?projectId=...`, filtrar automaticamente.
- Ajustar `getProjectAlerts` para juntar indicadores/planos/processos pela `company_id` do projeto além do `project_id` (cobre dados legados).

## Ordem de execução
1. Migração da view + tabela `work_hours` (1 chamada).
2. Fixes de código: PDF client-side, fallback IA, roteamento público, alerts.
3. CRUD mapas, tela horas, ajustes de vínculo com empresa.
4. Verificar com `bun run build:dev` e teste manual dos fluxos-chave.

## Detalhes técnicos
- PDF client-side: bundle já tem `jspdf` e `html2canvas` via `pdf-lib` não é suficiente para render DOM; instalar via `bun add jspdf html2canvas`.
- Fallback de IA: array `MODEL_FALLBACKS` percorrido em `try/catch`, primeiro sucesso vence.
- View SQL usará `date_trunc` para tolerar `interval` fracionário.
- `work_hours`: index em `(project_id, date)`.
