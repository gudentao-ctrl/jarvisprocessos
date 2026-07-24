## Portal Público da Empresa (Dashboard Externo)

Criar uma página pública read-only por empresa, acessível via link com token, sem login, para diretores/gestores acompanharem indicadores e planos de ação em tempo real.

### 1. Backend / Banco

Migration em `public.companies`:
- `public_token text unique` — gerado automaticamente (base64url ~24 chars).
- `public_enabled boolean default false`.
- `public_title text` — título exibido.
- `public_company_logo_url text`, `public_consultancy_logo_url text`.
- Trigger `companies_autofill` para popular `public_token` no insert.

GRANTs mantidos como estão (leitura pública será feita via server functions com service role — nunca com policies `TO anon`).

### 2. Rota pública

`src/routes/dashboard.$token.tsx` (top-level, SSR ligado, sem gate de auth).
- `head()` com título dinâmico e `robots: noindex`.
- Loader chama `getPublicDashboard({ token })` — server fn sem middleware que:
  - valida token, checa `public_enabled`;
  - retorna `company`, `title`, logos, `last_updated`, lista de indicadores + últimas coletas (últimos 12 pontos por indicador), planos de ação (todos campos read-only) e histórico resumido.
- `notFound` / desativado → tela "Link indisponível".

Server fn secundária `getPublicPlanDetails({ token, plan_id })` para o drill-down de um plano (histórico + comentários + evidências).

Tudo lido via `supabaseAdmin` dentro do handler (`await import`), filtrado estritamente por `company_id` do token, projetando apenas colunas seguras (sem e-mails, sem `created_by`).

### 3. UI da página pública

Layout Power BI/Looker-like, mobile-first, responsivo até TV:

**Header executivo**
- Logo empresa + logo consultoria, nome, título, "Atualizado em ...", resumo executivo (contagem de indicadores no alvo / abaixo, planos ativos/atrasados/concluídos).

**Seção 1 — Indicadores**
- Filtros: período (Semana / Mês / Trimestre / Ano / Personalizado), Processo, Categoria, Indicador, Responsável.
- Grid responsivo de cards: nome, meta, valor atual, % atingido, tendência (↑/↓), última atualização, mini-sparkline.
- Clique no card → Dialog full com gráfico ampliado (Recharts LineChart), tabela histórica, meta destacada.

**Seção 2 — Planos de Ação**
- Gráfico donut (Em andamento / Concluído / Atrasado / Não iniciado).
- Lista com filtros (status, prioridade, responsável).
- Cada linha mostra título, problema, causa, responsável, prioridade, status, prazo, % concluído.
- Clique → Dialog com timeline (`action_plan_history` + comentários) e datas.

Reatividade automática: React Query com `refetchInterval: 60s` + `refetchOnWindowFocus`. Não precisa republicar.

### 4. Configuração dentro do JARVIS

Nova seção "Página Pública" no card de empresa em `/empresas` (e no cabeçalho de `/controle`):
- Toggle Ativar/Desativar.
- Campo "Título exibido".
- Uploads opcionais dos dois logos (bucket novo `public-branding`, público para leitura).
- Botões: Copiar link, Abrir, Regenerar token (confirmação — invalida o anterior).

Server fns em `src/lib/public-portal.functions.ts` (autenticadas):
- `updatePublicPortal({ company_id, ... })`
- `regeneratePublicToken({ company_id })`
- `uploadPublicLogo` usando bucket dedicado.

### Escopo intencionalmente fora
- Sem autenticação por senha do link (apenas token opaco). Regenerar = revogar.
- Sem edição/ações no portal.
- Sem evidências novas — só listagem se já existirem em `action_plan_history` (não há tabela de anexos hoje; se você quiser evidências reais, precisamos criar `action_plan_attachments` — confirmo em passo separado).

### Detalhes técnicos
- Rota `dashboard.$token.tsx` fica **fora** de `_authenticated/` (público).
- Ler dados só via server fn + `supabaseAdmin`, escopado por `company_id` do token; não expor colunas sensíveis.
- Cache HTTP: `Cache-Control: private, max-age=30` nas respostas do server fn via `setResponseHeader`.
- Sem `og:image` (evitar vazar dados em preview de link).
