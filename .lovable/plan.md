# Evolução do JARVIS — Horas, Financeiro, Acessos, CRM e Chamados

Entrega em fases. Nada do que existe hoje é removido: as telas, empresas, projetos, entrevistas, processos, indicadores, planos de ação e portal continuam funcionando igual. As novas funções são acrescentadas ao lado.

Ritmo escolhido: **Fases 1 e 2 no mesmo ciclo**, depois validação sua antes de seguir.

---

## Arquitetura proposta (visão geral)

Hoje o sistema tem um único usuário autorizado (seu e-mail, travado tanto na tela de login quanto na verificação de acesso) e as regras do banco liberam tudo para qualquer pessoa da equipe, sem separação por empresa. Isso precisa mudar para suportar consultores, gestores e clientes.

Nova base de acesso: **Usuário + Empresa + Perfil + Permissão por ferramenta**, verificada no banco (não só escondendo botões).

- Perfis: SuperAdmin, Gestor, Consultor, Cliente.
- Vínculo por empresa: cada usuário é ligado às empresas que pode ver.
- Permissões por ferramenta (Gestão, POP, Indicadores, Financeiro, CRM, Horas, Chamados) marcadas por usuário e empresa.
- Seu e-mail vira SuperAdmin (único, sem criar outros automaticamente) e enxerga tudo.
- Toda leitura/gravação passa a filtrar pelas empresas autorizadas do usuário.

Conflito conhecido e como será tratado: as regras atuais do banco liberam todas as tabelas para qualquer usuário logado. Elas serão substituídas por regras por empresa, mantendo o SuperAdmin com acesso total, para que nenhum dado atual deixe de aparecer para você.

---

## FASE 1 — Apontamento de horas, despesas e ferramentas

Evolução da tela **Horas** já existente (registros antigos preservados).

Formulário novo:
- Data, hora de entrada, hora de saída, **total calculado automaticamente** (ex.: 08:30 → 12:15 = 03:45), inclusive quando atravessa a meia-noite. Registros antigos que só têm total continuam válidos.
- Tipo de evento: Consultoria, Reunião, Mapeamento, Treinamento, Deslocamento, Ferramenta, Outros (os tipos atuais permanecem).
- Descrição do atendimento (obrigatória).
- Cliente e projeto obrigatórios — não é possível salvar sem identificar.

Despesa de deslocamento:
- Pergunta "Houve gasto com deslocamento?" (Sim/Não). Se Sim, abre descrição e valor.

Evento tipo Ferramenta:
- Abre descrição da ferramenta, quantidade e valor total.

Todos esses valores ficam ligados a empresa + projeto + consultor e alimentam o financeiro da Fase 3.

Ajuste mobile: formulário rápido, campos grandes, pensado para lançamento no celular.

---

## FASE 2 — Perfis, SuperAdmin e Central de Acessos

- Login liberado para novos usuários **com aprovação**: quem se cadastra fica pendente até você aprovar e definir empresa, perfil e ferramentas.
- Área **SuperAdmin** (visível só para você): usuários, solicitações pendentes, permissões, gestores de projeto.
- **Gestão de Acessos**: por empresa, lista de usuários autorizados, perfil e chaves de ferramenta (Gestão, POP, Indicadores, Financeiro, CRM…) ligadas/desligadas.
- Empresa = ambiente comum: três consultores autorizados na Empresa A veem a mesma base daquela empresa, cada um limitado pelas suas permissões.
- Menus passam a se adaptar ao perfil, mantendo o visual atual.
- Início do registro de auditoria (quem fez, quando, o que mudou) para permissões e aprovações.

---

## FASE 3 — Financeiro do projeto (após validação das fases 1 e 2)

- Nova aba **Financeiro** no painel do projeto/gestor.
- Pagamentos do cliente: data, valor, forma (PIX, Transferência, Boleto, Dinheiro, Cartão, Outros), referência, observação.
- Conta corrente: faturado, pago, saldo, com situação CRÉDITO / DEVEDOR / QUITADO.
- Lista de horas do cliente: ver, editar, criar e excluir **enquanto não faturado**.
- **Faturar horas selecionadas**: resumo (cliente, período, horas, valor, despesas, ferramentas, total) → confirmação → status FATURADO, com data, responsável e período gravados.
- Trava: depois de faturado nada é editado ou apagado; correções entram como lançamento de ajuste, preservando o original e o autor.
- O valor das horas é informado no momento do faturamento (conforme sua escolha), com as despesas e ferramentas já somadas automaticamente.
- Relatório PDF profissional por cliente/projeto/período, com logos, horas realizadas/faturadas/não faturadas, despesas, ferramentas e situação da conta corrente, salvo no histórico.

## FASE 4 — CRM e alertas

Leads (empresa, contato, cargo, telefone, e-mail, origem, observações, data do primeiro contato, responsável), estágios Não iniciado → Prospectado → 1ª reunião → Apresentação → Fechamento, marca "lead aquecido". Conversão em cliente pede tipo de contrato, datas e valores, que alimentam o financeiro. Alertas de prospecção/retorno/reunião/fechamento, pagamento não registrado, horas prontas para faturamento e recobrança diária com opção de "dispensar hoje" (sem apagar a dívida).

## FASE 5 — Portal do cliente com login

Portal deixa de ser aberto por link público: exige usuário, senha, empresa vinculada e permissão. Um cliente nunca enxerga outra empresa. No registro de indicadores fica gravado quem informou, quando, empresa, indicador e valor.

## FASE 6 — Chamados internos

Abertura de chamados (bug, acesso, senha, e-mail, erro, sugestão, outros) com número, solicitante, empresa, categoria, prioridade, status (Aberto → Em análise → Em atendimento → Aguardando usuário → Resolvido → Encerrado), responsável e histórico. Gestão pelo SuperAdmin.

---

## Detalhes técnicos

**Banco (novas tabelas, sem duplicar as atuais):**
- `work_hours` estendida: `start_time`, `end_time`, `description`, `billing_status` (aberto/faturado), `invoice_id`; `hours` mantida e recalculada a partir dos horários quando informados. Tipos de evento ampliados (mapeamento, treinamento, deslocamento, ferramenta) mantendo os atuais.
- `work_hour_expenses` (deslocamento: descrição, valor) e `work_hour_tools` (descrição, quantidade, valor total), ambas ligadas ao lançamento, empresa e projeto.
- `company_members` (user_id, company_id, role, permissões por ferramenta em jsonb ou tabela `member_permissions`), `access_requests` (pendente/aprovado/rejeitado), `profiles` (nome, e-mail).
- `app_role` ganha `superadmin`; funções `private.is_superadmin()`, `private.has_company_access(company_id)` e `private.has_tool(company_id, tool)` em schema privado, usadas nas políticas RLS de todas as tabelas com `company_id`.
- Fases seguintes: `invoices`, `invoice_items`, `payments`, `financial_entries`, `crm_leads`, `crm_activities`, `alerts`/`alert_dismissals`, `tickets`, `ticket_events`, `audit_log`.

**Backend:** todas as leituras/gravações continuam em `createServerFn` com `requireSupabaseAuth`; scoping por empresa aplicado nas políticas RLS (fonte da verdade) e reforçado nos handlers. Nada de checagem só no frontend.

**Auth:** remoção do e-mail fixo em `src/routes/auth.tsx` e `src/routes/_authenticated/route.tsx`, substituído por perfil no banco; o gatilho de banco que hoje bloqueia cadastros passa a criar solicitação pendente em vez de recusar. Seu usuário recebe `superadmin` por migração.

**Auditoria:** tabela `audit_log` com ator, ação, entidade, valores antes/depois, gravada por gatilho nas operações críticas.

**Compatibilidade:** migrações aditivas, colunas novas com valor padrão, nenhum dado apagado; lançamentos antigos de horas continuam listando e somando normalmente.
