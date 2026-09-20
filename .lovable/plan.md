# Blocos 8 e 9 — Conexão de Impacto e Relatório Executivo Mensal

## Objetivo
Substituir, na área **Relatórios**, o item **Operacional** por **Conexão de Impacto** e o item **Por Empresa** por **Relatório Executivo Mensal**, aproveitando os dados e a identidade visual já existentes.

## Bloco 8 — Conexão de Impacto e Profundidade

### Vínculos e sugestões
- Aproveitar os vínculos já existentes entre plano de ação, causa raiz, dor, oportunidade, processo, entrevista e indicador.
- Associar ações também aos setores cadastrados, mantendo compatibilidade com os setores preenchidos anteriormente como texto.
- No cadastro rápido de ação, priorizar o fluxo: **Setor → Ação → Problema raiz**, deixando indicador e demais detalhes como complementos opcionais.
- Ampliar a análise de transcrições para sugerir ações com frente/setor, problema diagnosticado e indicador relacionado.
- Manter as sugestões como pendentes na fila de oportunidades; somente após aprovação do consultor elas se tornam planos de ação.

### Painel Efeito Dominó
- Criar uma tela interativa e responsiva em que o usuário seleciona um indicador e percorre a cadeia:

```text
Indicador → ações relacionadas → causa raiz / dor → diagnóstico / entrevista
```

- Agrupar as ações por setor, com estados recolhíveis para evitar listas extensas.
- Exibir no topo métricas calculadas dos dados reais: frentes mapeadas, gargalos tratados/eliminados, ações concluídas e complexidade técnica resolvida.
- Disponibilizar a mesma leitura no portal do cliente, sem controles de edição e respeitando o vínculo e a permissão de Portal.

## Bloco 9 — Relatório Executivo Mensal em PDF

- Criar seleção de empresa ativa e mês/ano, sem depender do seletor global.
- Compilar automaticamente no período:
  - planos concluídos e em andamento, agrupados por setor;
  - novos diagnósticos, causas raiz, dores e oportunidades identificadas;
  - indicadores com valor inicial, valor final, variação, meta e situação;
  - total de horas da consultoria e distribuição por atividade/consultor sem expor dados financeiros.
- Gerar um sumário executivo com IA, limitado aos dados reais do período, destacando valor produzido e gargalos tratados.
- Reaproveitar o preview paginado e a exportação PDF existentes, incluindo logos, cores e título configurados no portal da empresa.
- Mostrar estados claros para ausência de dados e para falhas/créditos de IA, preservando a seleção realizada.

## Navegação, acesso e segurança
- Atualizar os dois cartões da área Relatórios e criar as rotas correspondentes.
- Mapear ambas as rotas à permissão de Gestão; SuperAdmin mantém acesso total.
- Validar empresa e permissão também no servidor, não apenas na tela.
- Manter o portal do cliente somente leitura e restrito à empresa vinculada.

## Implementação técnica
- Criar migration para o vínculo estruturado de setor nas oportunidades e planos, com backfill seguro e RLS/grants compatíveis com o isolamento atual.
- Criar funções autenticadas específicas para montar a rede de impacto e o relatório mensal, retornando apenas os campos necessários.
- Atualizar o pipeline de entrevista para produzir sugestões estruturadas e migrar as chamadas editadas para o modelo padrão atual, com resposta estruturada e tratamento correto de erros.
- Reutilizar os componentes de relatório, gráficos e exportação existentes; criar componentes pequenos para rede, métricas e grupos por setor.
- Não remover os destinos antigos `/dashboard` e `/empresas`; apenas deixarão de ser atalhos dentro de Relatórios.

## Validação
- Testar criação rápida e edição dos vínculos, aprovação/rejeição de sugestões e agrupamento por setor.
- Verificar a cadeia completa do Efeito Dominó com e sem indicador relacionado.
- Gerar relatório de um mês com dados e outro sem dados; conferir totais, variações e sumário.
- Inspecionar visualmente o PDF e as duas telas em desktop e mobile.
- Confirmar que cliente, consultor sem permissão, gestor e SuperAdmin veem apenas o que lhes é permitido.
