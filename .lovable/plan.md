## Problemas relatados

1. **Login não entra** (`g_zamboni@hotmail.com`) — a requisição para `/auth/v1/token?grant_type=password` retornou `TypeError: Load failed` (falha de rede no navegador, não erro de credencial). Pode ser: (a) usuário ainda não criado nesse projeto — a senha nunca foi cadastrada aqui, (b) rede/preview instável no momento, ou (c) credencial incorreta gerando retry que aparece como "load failed" no Safari iOS.
2. **Torre de Controle duplicada** — o dashboard do projeto (`projetos.$id.index.tsx`) mostra hoje **3 blocos que se sobrepõem**:
   - `DashboardHighlights` (4 tiles: sem coleta / abaixo meta / planos atrasados / reuniões)
   - `AlertsPanel` (mesma lista + processos + entrevistas pendentes)
   - Grid de 6 cards (Entrevistas, Processos, Oportunidades, Planos abertos, Ações vencidas, Indicadores)
   
   "Ações vencidas" aparece nos 3 lugares; "Reuniões" aparece em 2; "Indicadores sem coleta" aparece em 2.
3. **Navegação não é mobile-first** — sidebar/topbar padrão desktop; no viewport 390px o consultor precisa de bottom-nav grande com as 3 áreas (Empresas / Dashboard / Projetos) + acesso rápido dentro do projeto por abas fixas na base.

## Plano

### 1. Login — diagnóstico + ação
- Verificar no backend se o usuário `g_zamboni@hotmail.com` existe. Se não existir, orientar a criar conta pela tela de cadastro (o app já tem toggle "Criar conta" em `/auth`).
- Adicionar mensagens de erro mais claras em `src/routes/auth.tsx` distinguindo "credenciais inválidas" de "falha de rede" (retry automático 1x em `TypeError: Load failed`, comum no Safari iOS quando o preview reconecta).
- Não alterar o fluxo de auth em si — já usa Lovable Cloud corretamente.

### 2. Torre de Controle — deduplicar
Reorganizar `projetos.$id.index.tsx` em **uma única superfície vertical** sem repetição:

```text
┌─ Header do projeto (nome/empresa/status) — já existe no layout pai
├─ 🚨 Central de Alertas (AlertsPanel)         ← única fonte de "o que precisa de ação"
├─ 📊 Painel do projeto (6 KPIs numéricos)     ← só contagens totais, sem repetir alertas
└─ 📅 Próximas reuniões (lista compacta)       ← movida para cá, tirada do Highlights
```

- Remover `<DashboardHighlights>` da página (os 4 tiles são subconjunto exato do `AlertsPanel`).
- Mover a lista "Próximas reuniões" (que hoje está dentro do `DashboardHighlights`) para um card próprio, já que reunião agendada **não é alerta** e não aparece no `AlertsPanel`.
- Manter o grid de 6 KPIs como visão geral quantitativa (não redundante — mostra totais, não pendências).

### 3. Navegação mobile-first
- **Bottom nav fixa** no layout `_authenticated/route.tsx` (visível apenas em `<md`): 3 botões grandes (48px) — Empresas / Dashboard / Projetos — com ícone + label, respeitando safe-area do iOS.
- **Sidebar** oculta em mobile (`hidden md:flex`), permanece em tablet/desktop.
- **Topbar mobile** compacta com título da rota + botão voltar contextual.
- **Abas do projeto** (`projetos.$id.tsx` — Visão geral / Diagnóstico / Mapeamento / Melhorias / Execução / Gestão): trocar chips com scroll horizontal por **bottom sheet "Etapa"** acionado por um botão fixo no topo do conteúdo em mobile — evita usuário perder aba ao rolar.
- Aumentar áreas de toque: cards de KPI/alertas com `min-h-[64px]` e chevron visível.
- Padding inferior no conteúdo (`pb-24`) para não ficar atrás da bottom nav.

## Arquivos afetados

- `src/routes/auth.tsx` — mensagens de erro + retry.
- `src/routes/_authenticated/projetos.$id.index.tsx` — remover `DashboardHighlights`, mover "Próximas reuniões" para card local.
- `src/routes/_authenticated/route.tsx` — adicionar bottom nav mobile, ocultar sidebar em `<md`, ajustar padding.
- `src/routes/_authenticated/projetos.$id.tsx` — abas viram bottom sheet no mobile.
- `src/components/DashboardHighlights.tsx` — permanece (usado no Dashboard geral `/dashboard`), mas não mais no projeto.

## Fora do escopo (para não inflar a entrega)
- Reformular BPM/mapas em mobile (já feito na Entrega 2).
- Trocar biblioteca de sidebar.
- Adicionar PWA/instalação.
