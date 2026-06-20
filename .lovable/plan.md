## Visão Geral

Módulo JARVIS para capturar entrevistas operacionais, transcrever automaticamente e estruturar o conteúdo via IA em categorias úteis para consultoria de processos. Mobile-first, identidade laranja/cinza, login compartilhado da equipe, CRUD de empresas/setores e exportação em PDF.

## Identidade Visual

- **Primária**: laranja (`#F97316` / oklch equivalente) — botões, destaques, badges principais
- **Secundária**: cinza claro (`#F3F4F6` superfícies, `#6B7280` texto secundário)
- **Fundo**: branco / cinza 50 para contraste alto em campo
- **Tipografia**: Inter (corporativa, legível em mobile)
- **Estilo**: minimalista, cards limpos, bordas suaves, sem gradientes chamativos
- Tokens semânticos definidos em `src/styles.css` (`--primary`, `--secondary`, `--muted`, etc.) — nada hardcoded nos componentes

## Stack & Backend

- TanStack Start + Tailwind v4 + shadcn (já no template)
- **Lovable Cloud** para auth e banco
- **Lovable AI Gateway** para transcrição (`openai/gpt-4o-mini-transcribe`) e análise (`google/gemini-3-flash-preview`)
- Storage bucket privado para áudios

## Modelo de Dados (Lovable Cloud)

- `companies` (id, name, created_at)
- `sectors` (id, company_id, name)
- `interviews` (id, title, company_id, sector_id, participant, interview_date, audio_path, status, created_by, created_at)
- `transcripts` (id, interview_id, content, updated_at)
- `transcript_edits` (id, transcript_id, previous_content, edited_at, edited_by) — histórico de edição
- `interview_analysis` (id, interview_id, summary, insights, critical_points, pains, problems, decisions, flows, systems — todos JSONB de listas editáveis)
- `user_roles` (id, user_id, role) — padrão obrigatório, com função `has_role`

RLS: usuários autenticados podem ler/escrever (equipe compartilhada). Storage bucket privado com policy para authenticated.

## Telas

1. **/auth** — login email/senha (compartilhado pela equipe)
2. **/_authenticated/** (área protegida)
   - **/** — lista de entrevistas recentes + botão grande "Nova Entrevista"
   - **/empresas** — CRUD de empresas e setores
   - **/entrevistas/nova** — formulário mobile-first: título, empresa, setor, participante, data, captura de áudio (gravar OU upload)
   - **/entrevistas/$id** — detalhe da entrevista com abas/seções verticais:
     - Áudio (player)
     - Transcrição editável + botão "Salvar edição" (registra histórico)
     - Análise IA: resumo, insights, pontos críticos, e 5 blocos (Dores 🟥, Problemas 🟨, Decisões 🔵, Fluxos 🟢, Sistemas ⚙️) — cada item editável/removível/adicionável
     - Botão "Exportar PDF"

## Fluxo Operacional

1. Usuário cria entrevista → grava no navegador (`MediaRecorder`, webm/mp4) ou faz upload
2. Áudio salvo no Storage; status `transcribing`
3. Server function chama Lovable AI `/v1/audio/transcriptions` com `language: "pt"` em streaming
4. Transcrição salva em `transcripts`; status `transcribed`
5. Usuário pode editar transcrição (cria entrada em `transcript_edits`)
6. Botão "Analisar com IA" → server function chama Gemini com prompt estruturado (output JSON via `Output.object` + Zod) que extrai SOMENTE conteúdo presente, sem inventar, com schema fixo (resumo ≤10 linhas, insights[], critical_points[], pains[], problems[], decisions[], flows[], systems[])
7. Resultado salvo em `interview_analysis`; usuário edita listas livremente (campos JSONB persistidos)
8. "Exportar PDF" → server function gera PDF com identidade visual (laranja/cinza), contendo dados da entrevista, resumo, listas e transcrição completa, retornando blob para download

## Server Functions (TanStack)

- `createInterview`, `listInterviews`, `getInterview`
- `uploadAudio` (signed upload URL) ou upload direto via browser client
- `transcribeAudio(interviewId)` — chama gateway STT, salva transcript
- `updateTranscript(interviewId, content)` — salva edição + histórico
- `analyzeTranscript(interviewId)` — chama Gemini com schema Zod, persiste análise
- `updateAnalysis(interviewId, partial)` — edições manuais nas listas
- `companies` e `sectors`: CRUD básico
- `exportInterviewPdf(interviewId)` — gera PDF server-side e retorna como Response

Todas autenticadas com `requireSupabaseAuth`.

## Regras de IA (prompt)

Prompt do sistema enfatiza: "Extraia APENAS informações explicitamente presentes na transcrição. Não invente, não infira além do texto. Se uma categoria estiver vazia, retorne array vazio." Schema Zod garante formato estável.

## Mobile-First UX

- Layout single-column, botões ≥48px, espaçamento generoso
- Botão de gravar grande e central, com indicador visual de tempo
- Estados claros: gravando / transcrevendo / pronto / analisando
- Navegação inferior simples (Entrevistas / Empresas / Sair)
- Sem menus laterais complexos

## Detalhes Técnicos

- Gravação: `MediaRecorder` com `audio/webm` (Chrome/Firefox) ou `audio/mp4` (Safari); detectar via `isTypeSupported`
- Upload do áudio para bucket `interview-audio` (privado)
- Transcrição: server function busca o blob do storage e envia em `multipart/form-data` para `/v1/audio/transcriptions` com `model=openai/gpt-4o-mini-transcribe`, `language=pt`
- Análise: `generateText` com `Output.object({schema})` via provider `createLovableAiGatewayProvider`
- PDF: `pdf-lib` (compatível com Worker) com layout corporativo laranja/cinza
- Histórico de edição: insert simples na tabela `transcript_edits` antes de cada update

## Fora de escopo (v1)

- Múltiplos usuários com permissões granulares (apenas equipe compartilhada)
- Diarização (separação de falantes)
- Tradução
- Dashboards analíticos cross-entrevistas

Pronto para implementar ao aprovar.