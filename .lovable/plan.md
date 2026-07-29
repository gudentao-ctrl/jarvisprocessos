## Objetivo

Elevar o visual e a dinâmica das três telas de Entrevistas (lista, nova, detalhe) **mantendo 100% das funcionalidades atuais** — nada é removido, apenas reorganizado e otimizado na apresentação. Nenhuma alteração em server functions, queries, schema ou geração de PDF.

## Garantia de funcionalidades preservadas

Todas continuam existindo, apenas melhor apresentadas: criar entrevista, upload/gravação de áudio, transcrever, regerar transcrição, editar e salvar transcrição, analisar com IA, reanalisar, editar/adicionar/remover itens de todas as categorias de análise, salvar análise, gerar entregáveis (normal e forçado), ver ata da reunião, exportar PDF, sugerir processo com IA, excluir entrevista, filtro por empresa ativa.

## Telas

**1. Lista (`entrevistas.index.tsx`)**
- `PageHeader` com ícone de microfone, título, subtítulo e pills de estatística: total, transcritas, analisadas, rascunhos.
- Botão "Nova Entrevista" mantido, promovido a ação do cabeçalho (e continua largo/acessível no mobile).
- **Adições de dinâmica**: busca por título/participante e chips de filtro por status — puramente client-side sobre os dados já carregados.
- Cards redesenhados: barra de acento por status, chip de ícone, título forte, metadados em linha e badge de status; elevação suave no hover.
- `CardSkeleton` no carregamento e `EmptyState` ilustrado com CTA (mais variante "nenhum resultado" quando o filtro zera a lista).

**2. Nova entrevista (`entrevistas.nova.tsx`)**
- `PageHeader` compacto com voltar.
- Mesmos campos e mesma ordem, agrupados em duas seções visuais numeradas: "1. Contexto" e "2. Áudio".
- O botão final passa a indicar o que ainda falta (título / áudio) em vez de apenas ficar desabilitado — mesma validação, feedback melhor.
- Gravador dentro de card, com moldura de acento quando o áudio está pronto.

**3. Detalhe (`entrevistas.$id.tsx`)**
- `PageHeader` com título, metadados como pills (empresa, setor, participante, data) e ações agrupadas (excluir, exportar PDF).
- Trilha de progresso no topo: Áudio → Transcrição → Análise → Entregáveis, com o estado atual destacado.
- Áudio e Transcrição em cards com cabeçalho padronizado; contador de palavras na transcrição; botões "Regerar" e "Salvar" mantidos.
- Bloco "Gerar entregáveis com IA" vira card de destaque com gradiente sutil do token primário (mantendo os dois botões e a data da última geração).
- `ListBlock` redesenhado: chip de ícone colorido por categoria, contador de itens, remover revelado no hover, adicionar discreto — mesma edição inline de sempre.
- Ata da reunião em card com tipografia legível; skeletons no carregamento e `EmptyState` para "entrevista não encontrada".

## Detalhes técnicos

- Reaproveita `src/components/mapping/PageHeader.tsx` (`PageHeader`, `StatPill`, mapas de acento) e `EmptyState.tsx` (`EmptyState`, `CardSkeleton`), sem duplicar componentes.
- Novos tokens de acento por status de entrevista e por categoria de análise em `src/styles.css` (oklch), estendendo o padrão `--map-*`. As cores hardcoded atuais (`bg-amber-100`, `border-l-red-500`, etc.) passam a tokens semânticos.
- Mudanças restritas a apresentação: `interviews.functions.ts`, `interview-pipeline.functions.ts` e o código do PDF não são tocados.
- Mobile-first: alvos de toque ≥ 44px, `min-w-0`/`truncate`, `shrink-0` em ícones, grids que colapsam em uma coluna.
