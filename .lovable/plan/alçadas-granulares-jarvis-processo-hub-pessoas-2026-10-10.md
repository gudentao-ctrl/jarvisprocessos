# Alçadas granulares — JARVIS PROCESSO / HUB PESSOAS

## Resultado

Substituir a liberação por oito grupos amplos por permissões individuais de ferramentas e ações, por usuário e empresa, com presets Cliente, Consultor, Gestor e SuperAdmin.

## 1. Matriz e migração segura

- Criar a matriz `user_company_permissions` usando as empresas e os usuários já existentes, sem duplicar cadastros.
- Converter os acessos atuais para a nova matriz, preservando o que cada usuário já pode fazer; presets serão aplicados somente por escolha explícita.
- Separar o cargo por empresa do privilégio global de SuperAdmin. Armazenar privilégios na tabela protegida de papéis, nunca em dados editáveis do perfil.
- Sincronizar a transição com os vínculos atuais para não quebrar o aplicativo publicado.
- Registrar quem alterou as permissões, de quem, em qual empresa e o que mudou.

## 2. Tela de permissões

- Disponibilizar `/admin/permissoes`, acessível somente ao SuperAdmin, com entrada pela administração atual.
- Busca de usuário por nome/e-mail, seleção de empresa e carregamento do acesso salvo daquele vínculo.
- Quatro presets rápidos, oito categorias expansíveis e controles individuais para todas as subferramentas listadas no pedido.
- Controle geral de categoria, contagens, busca de ferramentas e estados de carregamento, erro, alterações pendentes e confirmação de salvamento.
- Toggles ativos e botão “Salvar acesso” em laranja `#E05A10`; inativos em cinza.
- Preset SuperAdmin exige confirmação explícita: concede privilégio global, não apenas acesso à empresa selecionada. Impedir a remoção do último administrador para evitar perda de acesso ao sistema.

## 3. Presets e modo leitura

- **Cliente:** portal e acompanhamento; histórico dos indicadores e mapa estratégico somente leitura; abertura e acompanhamento de chamados. Recrutamento e NPS/eNPS opcionais. Demais módulos internos bloqueados por padrão.
- **Consultor:** operação de consultoria e Pessoas, POP, horas, indicadores e chamados; financeiro e CRM bloqueados por padrão.
- **Gestor:** todas as ferramentas de negócio, incluindo financeiro e CRM; sem administração de alçadas.
- **SuperAdmin:** acesso global e poderes administrativos de criação, leitura, edição e exclusão.
- Representar leitura, criação, edição e exclusão separadamente. Ocultar botões não basta: impedir a operação também no acesso aos dados.
- Nos chamados, diferenciar abertura/acompanhamento próprio de atendimento e gestão.

## 4. Proteção em todo o sistema

- Implementar `usePermissions()` e `<CanAccess />`, usando a empresa selecionada e a sessão real.
- Aplicar a matriz ao menu, atalhos, páginas, abas e botões, sem usar a permissão de outra empresa para liberar a empresa atual.
- Revisar funções de consulta e alteração, políticas dos dados e arquivos relacionados. Negar usuários pendentes/rejeitados e tentativas por chamada direta.
- Remover políticas amplas que hoje permitem a qualquer usuário autenticado acessar dados de Pessoas de outras empresas.
- Tratar dados compartilhados entre ferramentas para que leitura de mapa/portal/histórico não conceda edição nem exposição de dados de consultoria.
- Preservar os fluxos públicos intencionais de candidatos e pesquisas, com token validado e projeção limitada, sem abrir acesso aos registros privados.

## 5. CRUD do SuperAdmin

- Inventariar as telas e operações existentes e completar controles de criar, editar e excluir onde faltarem.
- Liberar exceções administrativas às travas de operação, com confirmação e auditoria; ao desfazer faturas, manter consistência entre horas, itens, pagamentos e saldos.
- Não contornar autenticação, isolamento entre empresas, integridade dos dados, consentimento ou regras que impedem manipulação de resultados de avaliações.
- Não fornecer uma operação genérica de exclusão arbitrária de tabelas; cada entidade terá uma operação administrativa validada.

## 6. Extensibilidade

- Catálogo central com identificadores estáveis, categoria, ferramenta, caminhos e ações.
- Novas ferramentas registradas aparecem na tela automaticamente e começam bloqueadas até liberação; adicionar código desconhecido não concede acesso automaticamente.
- Teste de cobertura para detectar páginas/ferramentas sem mapeamento. O cadastro no catálogo e a proteção dos dados devem acompanhar cada nova ferramenta.

## Detalhes técnicos

- Usar Lovable Cloud, as tabelas existentes `companies`, `profiles`, `company_members` e `user_roles`, e funções internas autenticadas do aplicativo.
- A nova matriz referencia `public.companies`; usuários usam UUID ou referência a `public.profiles`, sem criar novos vínculos com tabelas gerenciadas de autenticação.
- Cada tabela nova terá permissões explícitas de acesso e políticas de isolamento na mesma migração. Helpers de autorização serão criados antes das políticas que os utilizam.
- Centralizar a decisão de acesso por ferramenta/ação e empresa; substituir gradualmente as verificações antigas, sem modificar arquivos de integração gerados.
- Atualizar as regras de arquitetura e o roteiro do projeto para refletir o novo modelo granular.

## Validação e entrega

- Testes de presets, migração de permissões antigas, leitura restrita, ausência de permissão e cobertura do catálogo.
- Verificação autenticada: salvar uma combinação, recarregar e confirmar o acesso; negar leitura/alteração de outra empresa e chamadas diretas não autorizadas.
- Verificar os quatro perfis, administração restrita ao SuperAdmin, interface em telas estreitas e operações administrativas representativas.
- Consultar o resultado da validação automática do projeto e revisar a segurança antes de concluir; relatar qualquer cenário não verificado.
- Publicação somente quando solicitada. A sincronização do código é gerenciada pelo Lovable, sem comandos manuais de commit ou push.