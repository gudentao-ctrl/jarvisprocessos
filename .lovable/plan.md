## Correções e melhorias — foco nos problemas relatados

### 1. Botões de excluir que não funcionam
Auditar e corrigir botões "Excluir" em todas as abas onde estão inertes ou dão erro silencioso:
- Indicadores, Planos de Ação, Empresas, Processos, Entrevistas, Mapas (Dores/Decisão/Informação), Cronoanálise, Oportunidades, Roadmap, Horas.
- Padronizar com `AlertDialog` de confirmação, `useMutation` com `onError` mostrando `toast.error`, e `invalidateQueries` após sucesso.
- Verificar que cada `deleteX` server function existe e está exportada (algumas telas podem estar chamando função inexistente — sintoma típico do "não funciona").

### 2. Calendário como agenda de compromissos (desacoplado de entrevistas)
Hoje `/calendario` só lista entrevistas. Passar a ser uma agenda real:
- Nova tabela `calendar_events` (migração aditiva): `id, company_id, project_id, title, description, event_type (reuniao|workshop|visita|entrega|outro), starts_at, ends_at, location, participants[], created_by, created_at, updated_at`. RLS igual às demais tabelas do usuário autenticado + GRANTs.
- Server functions: `listEvents`, `createEvent`, `updateEvent`, `deleteEvent`.
- Tela `/calendario`: calendário mensal + botão "Novo compromisso" (dialog com título, data/hora, tipo, empresa/projeto opcionais). Lista do dia com editar/excluir. Continua mostrando entrevistas agendadas (somente-leitura, com badge "Entrevista") para não perder visão consolidada.

### 3. Vínculo Empresa → Projeto em toda a plataforma
Os dados existem vinculados, mas as telas globais não filtram por empresa. Ajustes:
- Adicionar seletor de **Empresa** no topo das telas globais (Indicadores, Planos de Ação, Mapas, Roadmap, Oportunidades, Horas, Calendário) — persistido em `localStorage` (`jarvis:active_company_id`).
- Ao criar novo item nessas telas, pré-preencher `company_id` com a empresa ativa.
- Nas telas por projeto (`/projetos/$id/*`), continuar filtrando pelo `project_id` como já fazem, mas garantir que qualquer criação também grave `company_id` do projeto.

### 4. Coleta de indicadores sem exigir login
Dois pontos:
- **Público (link externo)**: a rota `/c/$token` já é pública (`ssr:false`, sem gate). Confirmar que o botão "Copiar link" na tela de Indicadores gera `${origin}/c/${token}` (não `/coletas/…`). Corrigir se estiver apontando para rota autenticada.
- **Interno (dentro do app)**: nova rota autenticada `/indicadores/$id/coletar` — formulário simples de coleta (valor, período, observação) reutilizando a UI de `/c/$token`. Botão "Coletar agora" em cada card de indicador abre essa tela. Isso permite ao consultor lançar dados sem sair do app.

### 5. Erro ao criar Indicador / Plano de Ação
Investigar e corrigir na implementação:
- Validar shape enviado pelo formulário vs `inputValidator` (campos vazios enviados como `""` quebram `.uuid()`; converter para `null` antes de submeter).
- Garantir que `saveIndicator` e `saveActionPlan` aceitam `company_id`/`process_id` opcionais e que triggers de autofill (`indicators_autofill`, `action_plans_autofill`) não exigem colunas ausentes.
- Exibir `toast.error(e.message)` real no `onError` das mutations para o usuário ver a causa (hoje algumas telas engolem o erro).

### Detalhes técnicos
- Migração única cria `calendar_events` + GRANTs + RLS (`auth.uid() = created_by` OR membro da empresa) + trigger `updated_at`.
- Arquivos principais a editar:
  - `src/routes/_authenticated/calendario.index.tsx` (reescrever)
  - `src/lib/calendar-events.functions.ts` (novo)
  - `src/routes/_authenticated/indicadores.index.tsx` (fix erro criar + seletor empresa + botão coletar)
  - `src/routes/_authenticated/indicadores.$id.coletar.tsx` (novo)
  - `src/routes/_authenticated/planos-acao.index.tsx` (fix erro criar + seletor empresa + confirm delete)
  - Demais telas de lista: aplicar padrão de delete com `AlertDialog` + toast.
- Sem quebra de dados existentes; todas as mudanças de schema são aditivas.

### Fora do escopo
Não mexer em: pipeline de IA, BPM Editor, autenticação, exportações PDF/Excel.