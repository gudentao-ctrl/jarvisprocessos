# Bloco 14 — Automação dos Fluxos e Matriz de Oportunidades

## Objetivo
Transformar os achados das entrevistas em três fluxos consultáveis por empresa e consolidá-los numa mesa de aprovação que converte oportunidades em ações reais.

## Implementação

### 1. Extração automática em três fluxos
- Refinar a análise das entrevistas para separar explicitamente:
  - **Dores:** gargalos, problemas estruturais, atritos e reclamações.
  - **Decisões:** responsáveis, critérios, aprovações, centralização, frequência e atrasos.
  - **Informações:** origem/destino, meio, sistema, periodicidade, riscos, retrabalho e automação.
- Salvar cada achado automaticamente na tela correspondente, mantendo vínculo com a entrevista e indicação de origem por IA.
- Preservar a regeneração segura: substituir apenas sugestões de IA ainda não validadas, sem apagar ajustes aprovados pelo consultor.

### 2. Filtro global de empresa
- Fazer Dores, Decisões, Informações e Matriz de Oportunidades obedecerem à empresa selecionada no topo.
- Remover seletores locais duplicados dessas telas.
- Aplicar o filtro também nas consultas e alterações, evitando que dados de outra empresa apareçam ou sejam alterados.
- Ao cadastrar manualmente, usar automaticamente a empresa ativa e mostrar apenas processos dela.

### 3. Matriz como mesa de aprovação
- Reunir na Matriz todos os itens dos três fluxos, além das oportunidades manuais já existentes, sem duplicar itens já vinculados.
- Identificar visualmente a origem: Dor, Decisão, Informação, Manual ou IA.
- Agrupar e filtrar os itens por origem, status e prioridade.
- Tornar o badge de status editável, com os estados **Pendente**, **Em análise**, **Aprovada**, **Em andamento**, **Implementada** e **Rejeitada**.
- Ao aprovar, criar uma única ação vinculada à oportunidade e impedir criação duplicada.
- Ao reverter uma aprovação para Pendente ou Em análise, manter a ação existente e apenas remover o vínculo entre ela e a oportunidade, conforme definido.

### 4. Segurança e consistência
- Validar no servidor que a oportunidade, o fluxo de origem, a ação e a empresa ativa pertencem à mesma empresa.
- Manter histórico e dados já cadastrados; nenhuma ação existente será apagada pela reversão.
- Adicionar somente os campos de rastreabilidade e o novo status necessários, preservando as estruturas atuais.

### 5. Validação
- Testar a geração de uma entrevista até os três fluxos.
- Testar troca de empresa nas quatro telas e confirmar isolamento dos dados.
- Testar aprovação, prevenção de duplicidade e reversão mantendo a ação desvinculada.
- Conferir a Matriz em computador e celular.
- Validar a compilação final e sincronizar as alterações concluídas.

## Detalhes técnicos
- A oportunidade guardará o tipo e o identificador do item de origem para rastreabilidade e deduplicação.
- O estado atual `sugerida` será apresentado como **Pendente**; será acrescentado o estado persistente `em_analise`.
- A listagem consolidada será filtrada por `company_id` no servidor e consumirá a empresa ativa compartilhada pela aplicação.
