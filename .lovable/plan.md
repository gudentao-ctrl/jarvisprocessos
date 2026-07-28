## Objetivo

Elevar o visual do bloco de Mapeamento — hub, Processos & BPM e os três Mapas (Informação, Decisão, Dores) — de "cards genéricos" para uma entrega com hierarquia visual clara e identidade própria, mantendo toda a lógica de dados atual.

## Direção visual

Uma linguagem única aplicada às quatro telas:

- **Cabeçalho de página com faixa**: título grande, subtítulo, e um bloco de estatísticas à direita (contadores) sobre fundo sutil com gradiente do token `--primary`, borda arredondada e sombra suave.
- **Cor por domínio**: cada mapa/módulo ganha um token de acento próprio (Processos, Informação, Decisão, Dores) definido em `src/styles.css`, usado em ícones, badges e barras laterais dos cards. Nada de cor hardcoded — tudo em tokens semânticos.
- **Cards com estrutura**: barra de acento à esquerda, ícone em "chip" arredondado, título forte, metadados em linha secundária, ações reveladas no hover (e sempre visíveis no mobile).
- **Estados vazios ilustrados**: ícone em círculo com gradiente, título, frase de apoio e botão de ação primária — em vez do texto solto atual.
- **Skeletons** no lugar de "Carregando…".
- **Micro-interações discretas**: elevação e leve translação no hover, transições de 150–200ms, entrada em fade dos cards.

## Telas

**1. Hub de Mapeamento (`projetos.$id.mapeamento.tsx`)**
Cards maiores em grade, cada um com ícone colorido, descrição e uma linha de contexto ("N processos mapeados" / "N sessões"). Inclui também atalhos para os três mapas, hoje ausentes do hub.

**2. Processos & BPM (lista)**
- Cabeçalho com contadores por nível (N0/N1/N2) e total de empresas.
- Árvore redesenhada: linhas de conexão verticais entre pai e filho, badge de nível colorido por nível, responsável em avatar-inicial, contagem de subprocessos, chevron animado.
- Empresa como seção com cabeçalho fixo estilizado.

**3. Mapas (Informação / Decisão / Dores)**
- Mesma faixa de cabeçalho com seletor de empresa integrado.
- Informação: card em formato "origem → destino" com seta desenhada, meio/documento como chips, alerta de risco como badge destacado.
- Decisão: mesmo padrão de card estruturado.
- Dores: colunas por categoria em estilo quadro, com contador, cor por categoria e severidade em barra/pontos.

## Detalhes técnicos

- Novos tokens de acento e utilitários de gradiente/sombra em `src/styles.css` (oklch).
- Componentes compartilhados novos em `src/components/mapping/`: `PageHeader` (faixa + stats), `EmptyState`, `StatPill`, `SectionCard` — reutilizados nas quatro telas para garantir consistência.
- Alterações restritas a apresentação: nenhuma mudança em server functions, queries ou schema.
- Responsivo mobile-first: grids `grid-cols-[minmax(0,1fr)_auto]` nos cabeçalhos, `min-w-0`/`truncate` nos textos, `shrink-0` nos ícones, alvos de toque ≥ 44px.
