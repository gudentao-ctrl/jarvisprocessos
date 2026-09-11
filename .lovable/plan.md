# Chamados internos, poderes do SuperAdmin, data de pagamento no CRM e menu lateral no celular

## 1. Aba de chamados internos

Nova área "Chamados" para qualquer usuário liberado abrir pedidos de melhoria ou avisar erros.

- Formulário: título, tipo (melhoria ou erro), prioridade (baixa/média/alta), descrição.
- Lista dos chamados do próprio usuário com situação (aberto, em análise, resolvido, recusado) e respostas.
- No painel do SuperAdmin, os chamados aparecem em uma nova aba ao lado de "Solicitações", com todos os chamados de todos os usuários, troca de situação e campo de resposta.
- Contador de pendentes no título da aba, igual ao das solicitações.

## 2. SuperAdmin pode editar e apagar qualquer dado

- Regra no banco: quem é SuperAdmin passa a poder ver, alterar e excluir registros de todas as tabelas do sistema, para limpar testes antigos e corrigir erros.
- Nas telas onde hoje só o dono edita/apaga, os botões passam a aparecer também para o SuperAdmin.

## 3. Data de pagamento contratada no CRM

- Novo campo no cadastro do lead/contrato: "Data de pagamento contratada" (data), junto do dia de pagamento já existente.
- Os avisos de pagamento em atraso passam a considerar essa data: enquanto ela não chegou, não há aviso; a partir dela, com saldo em aberto, aparece o alerta de atraso com a quantidade de dias.
- O aviso mostra cliente, valor em aberto e dias de atraso, e continua podendo ser dispensado por um dia.

## 4. Menu lateral no celular

- Botão de menu no topo abre uma gaveta lateral com todas as ferramentas (Empresas, Controle, Agenda, Horas, Financeiro, CRM, Relatórios, Chamados).
- Só aparecem os itens que o usuário tem liberados pelo SuperAdmin; quem é SuperAdmin vê também a opção "SuperAdmin".
- A barra inferior atual continua com os atalhos principais.

## Detalhes técnicos

- Migração: tabela `public.tickets` (title, description, kind, priority, status, response, created_by, resolved_at) com GRANTs, RLS (autor vê/edita os seus; SuperAdmin vê e gerencia todos) e trigger de `updated_at`.
- Migração: função `private.is_superadmin()` (security definer) e policies `FOR ALL TO authenticated USING (private.is_superadmin())` em todas as tabelas do schema público via bloco DO.
- Migração: coluna `payment_due_date date` em `crm_leads`.
- `src/lib/tickets.functions.ts`: `listTickets`, `saveTicket`, `adminListTickets`, `adminUpdateTicket`.
- Nova rota `src/routes/_authenticated/chamados.index.tsx`; nova aba em `admin.index.tsx`.
- `crm.functions.ts`: incluir `payment_due_date` no schema e trocar a regra de `fin:recobranca` para usar a data contratada e dias de atraso.
- `route.tsx`: `Sheet` com navegação filtrada por permissões vindas de `getMe` (SuperAdmin vê tudo).
