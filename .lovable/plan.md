# Fase 3 – Relatório Executivo de Acompanhamento

Este módulo substitui o antigo "Coletas" dentro da fase **Execução** por um gerador completo de relatórios de acompanhamento. Nada é removido: apenas o card "Coletas" no menu da fase Execução é renomeado e reaproveitado.

## Escopo

1. Novo módulo `/relatorio-acompanhamento` (mantém `/indicadores/*` intacto para coleta técnica).
2. Filtro de período com presets + intervalo customizado.
3. Resumo executivo gerado pela IA usando dados reais da empresa ativa.
4. Biblioteca de gráficos (Recharts) com checkboxes por bloco.
5. Drag-and-drop para reordenar blocos do relatório.
6. Tela de edição WYSIWYG antes do PDF (textos, títulos, observações, imagens, tabelas, blocos extras).
7. Recomendações automáticas da IA (gargalos, riscos, próximos passos).
8. Informações automáticas de planos, indicadores, agenda, horas, cronoanálise, melhorias.
9. Identidade visual: logo consultoria, nome cliente, período, data, cabeçalho, rodapé, numeração.
10. Exportação PDF profissional (jsPDF + html2canvas).
11. Isolamento estrito por `company_id`.

## Arquivos a criar

- `src/lib/report-data.functions.ts` — server fn `getReportData({ company_id, from, to })` que agrega TODOS os dados do período: entrevistas, processos, BPM, SIPOC, cronoanálise, indicadores + coletas, planos + histórico, agenda, horas, oportunidades, melhorias implantadas.
- `src/lib/report-ai.functions.ts` — server fn `generateReportNarrative({ company_id, from, to, sections })` que chama Lovable AI Gateway (`google/gemini-3-flash-preview`) com contexto real e retorna: `resumo_executivo`, `recomendacoes[]`, `gargalos[]`, `riscos[]`, `proximos_passos[]`. System prompt estrito: "responda apenas com base nos dados; nunca invente".
- `src/lib/report-types.ts` — tipos compartilhados (`ReportBlock`, `PeriodPreset`, `ChartKey`).
- `src/components/report/PeriodFilter.tsx` — presets + calendário custom.
- `src/components/report/ChartLibrary.tsx` — catálogo com checkboxes agrupados (Planos, Indicadores, Horas, Cronoanálise, Consultoria).
- `src/components/report/charts/*.tsx` — um componente por gráfico (Recharts): `ActionsByStatus`, `ActionsByPriority`, `ActionsByResponsible`, `ActionsByProcess`, `ActionsCompletionTrend`, `IndicatorsEvolution`, `IndicatorsTargetVsActual`, `IndicatorsBelowTarget`, `HoursByWeek`, `HoursByMonth`, `HoursByActivity`, `HoursByProcess`, `CronoValueAdded`, `ConsultingActivity`.
- `src/components/report/BlockList.tsx` — lista drag-and-drop (`@dnd-kit/core` + `@dnd-kit/sortable`, já compatíveis com o stack).
- `src/components/report/BlockEditor.tsx` — editor por bloco (texto, título, observação, imagem upload, tabela simples, remover).
- `src/components/report/ReportPreview.tsx` — renderização A4 (cabeçalho, rodapé, numeração) espelhando o PDF final.
- `src/components/report/ExportPdfButton.tsx` — usa `html2canvas` + `jsPDF` para gerar PDF multi-página com paginação por bloco.
- `src/routes/_authenticated/relatorio-acompanhamento.index.tsx` — página principal com passos: 1) período, 2) seleção de gráficos, 3) gerar IA, 4) editar, 5) exportar.

## Arquivos a editar

- `src/lib/phases.ts` — em `PHASE_TOOLS.execucao`, trocar o card "Coletas" por `{ label: "Relatório de Acompanhamento", to: "/relatorio-acompanhamento", icon: "FileBarChart2", description: "Relatório executivo periódico gerado pela IA" }`. Mantém "Planos de ação" e "Indicadores".
- `package.json` — adicionar `@dnd-kit/core`, `@dnd-kit/sortable`, `jspdf`, `html2canvas`, `date-fns` (se ainda não estiver). `recharts` já está.

## Fluxo do usuário

```
Empresa ativa
   ↓
/relatorio-acompanhamento
   ↓
[Período: Últimos 30 dias ▾]  [Presets rápidos]
   ↓
Biblioteca de blocos (checkbox)
   ├─ ☑ Resumo executivo (IA)
   ├─ ☑ Planos de ação (4 gráficos)
   ├─ ☑ Indicadores (4 gráficos)
   ├─ ☐ Horas
   ├─ ☑ Cronoanálise
   ├─ ☑ Consultoria (KPIs)
   └─ ☑ Recomendações IA
   ↓
[Gerar Relatório] → chama IA, monta blocos, exibe preview
   ↓
Edição drag-and-drop + editor inline
   ↓
[Exportar PDF] → PDF A4 com identidade da consultoria
```

## Detalhes técnicos

- **Isolamento**: toda query recebe `company_id` obrigatório e filtra por `created_at` dentro de `[from, to]`. Server fn valida com Zod.
- **Auth**: `requireSupabaseAuth` em todas as server fns novas.
- **IA**: contexto enviado é o resultado do `getReportData` serializado, limitado a campos essenciais (evita explosão de tokens). Fallback de modelos igual ao `ask-ai.functions.ts`.
- **PDF**: cada bloco é uma `<section class="report-page">` A4 (`210mm × 297mm`). `html2canvas` renderiza → `jsPDF.addImage`. Cabeçalho (logo Jarvis + nome empresa) e rodapé (data emissão + página X/Y) via template fixo.
- **Identidade visual**: por enquanto usa nome "Jarvis Processos" + inicial. Logo do cliente lê `companies.logo_url` se existir; senão placeholder.
- **Drag-and-drop**: `DndContext` + `SortableContext` do `@dnd-kit/sortable` com estratégia vertical.
- **Uploads de imagem (fotos antes/depois)**: convertidas para base64 no cliente e embutidas no bloco (sem tocar storage nesta fase).

## Fora de escopo (não mexer)

- Módulos Entrevistas, BPM, SIPOC, Cronoanálise, Indicadores (coleta), Planos, Agenda, Horas, IA global, Relatórios legado, Torre de Controle, filtro global por empresa.

## Checkpoints de verificação

1. Typecheck limpo.
2. `/indicadores` continua funcionando (coleta técnica preservada).
3. Card "Coletas" na fase Execução aparece como "Relatório de Acompanhamento" e navega para o novo módulo.
4. Trocar empresa recarrega dados corretamente (query key contém `company_id + from + to`).
5. PDF gerado abre com cabeçalho, gráficos e paginação.

## Próximos passos (fora desta fase)

- Persistência de relatórios gerados (tabela `executive_reports`).
- Templates salvos por consultor.
- Envio por e-mail direto ao cliente.
