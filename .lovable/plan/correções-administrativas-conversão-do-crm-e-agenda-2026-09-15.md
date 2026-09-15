# Correções administrativas, conversão do CRM e agenda

## Resultado esperado

- O SuperAdmin poderá corrigir e excluir registros diretamente nas telas onde eles aparecem, inclusive faturamentos lançados por engano.
- Um lead em **Fechamento** poderá ser convertido, após confirmação, em uma empresa ativa. A empresa aparecerá nos cards ativos do CRM e também na aba Empresas.
- Fora da área Financeiro, usuários sem essa permissão verão somente informações operacionais permitidas: nome da empresa, datas e horas totais.
- Reuniões do tipo **Alinhamento**, quando criadas por um Gestor ou SuperAdmin, terão destaque visual próprio na agenda.

## Implementação

### 1. Correções pelo SuperAdmin
- Auditar as telas que já possuem edição/exclusão e manter essas ações disponíveis ao SuperAdmin.
- Adicionar nas telas atuais os controles ausentes, começando por faturas e pagamentos.
- Ao excluir uma fatura, desvincular seus lançamentos de horas e devolvê-los ao estado aberto antes da remoção.
- Permitir ao SuperAdmin editar ou excluir horas já faturadas, mantendo a trava atual para todos os demais usuários.
- Registrar as correções relevantes na auditoria, com autor, entidade e valores essenciais da alteração.
- Preservar vínculos obrigatórios e impedir exclusões que deixariam dados inconsistentes; nesses casos, orientar a correção dos dependentes primeiro.

### 2. Conversão do lead em empresa
- Ao salvar um lead no estágio **Fechamento** ainda não convertido, mostrar uma confirmação para criar a empresa.
- Criar a empresa como ativa, vincular seu identificador ao lead e impedir conversão duplicada.
- Exibir no CRM uma visão de empresas ativas originadas de fechamentos, com nome, início, término e total de horas.
- Atualizar imediatamente a aba Empresas e os seletores usados pelas demais áreas.

### 3. Privacidade financeira
- Remover valores de contrato, cobrança, despesas, ferramentas, faturas e pagamentos das respostas e telas sem permissão Financeiro.
- Manter fora do Financeiro somente nome, datas e horas totais quando houver resumo de empresa/projeto.
- Garantir essa restrição no servidor, não apenas escondendo elementos visuais.
- SuperAdmin e usuários com permissão Financeiro continuam com acesso completo.

### 4. Reuniões de alinhamento
- Adicionar **Reunião de alinhamento** como tipo de compromisso.
- Identificar no servidor se o criador é Gestor da empresa vinculada ou SuperAdmin.
- Aplicar cor de destaque apenas quando as duas condições forem verdadeiras: tipo Alinhamento e criador Gestor/SuperAdmin.
- Manter os demais tipos e cores atuais sem alteração.

## Validação

- Converter um lead fechado, confirmar que foi criada somente uma empresa e conferir sua presença no CRM e em Empresas.
- Entrar como usuário sem Financeiro e confirmar que nenhum valor monetário aparece fora dessa área.
- Excluir uma fatura como SuperAdmin e confirmar que as horas voltaram para aberto; verificar que outro perfil continua bloqueado.
- Criar alinhamentos como Gestor e Consultor e confirmar que somente o evento do Gestor recebe destaque.
- Validar as telas em computador e celular e conferir auditoria, erros e compilação.

## Detalhes técnicos

- Alterações estruturais serão aplicadas por migração com RLS e permissões preservadas.
- A conversão e o desfaturamento serão tratados como operações consistentes, evitando registros parciais.
- As verificações de SuperAdmin, Gestor e Financeiro serão feitas no servidor usando a conta autenticada.