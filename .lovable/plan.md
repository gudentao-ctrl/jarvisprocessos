# POP – Procedimento Operacional Padrão (dentro de Gestão)

Nova funcionalidade integrada ao fluxo do JARVIS: gerar, editar e armazenar POPs vinculados a um processo, dentro do módulo **Gestão**.

## Onde fica

- Novo card **POP – Procedimento Operacional Padrão** na tela de Gestão do projeto, ao lado de Dashboard, Diagnóstico, Roadmap e Horas.
- Nova rota `/pop` (lista de POPs da empresa ativa) e `/pop/$id` (editor do POP).
- Atalho **Gerar POP** também dentro da tela do processo (aba Fluxo/BPMN), já pré-vinculado àquele processo.

## Tela de lista

Cabeçalho no mesmo padrão visual das telas de Mapeamento/Entrevistas (PageHeader + estatísticas: total, rascunhos, aprovados) com busca por nome do processo e botão **Novo POP**.

## Tela de geração

Título "Procedimento Operacional Padrão (POP)" e a descrição: "Gere automaticamente um POP utilizando IA. O documento poderá ser editado antes de ser salvo."

Três formas de entrada:

1. **Descrição em texto** – campo com placeholder "Descreva como o processo funciona…".
2. **Upload de fluxograma** – PNG, JPG, JPEG ou PDF; a IA interpreta a imagem/documento enviado.
3. **A partir do fluxo do JARVIS** – ao selecionar um processo que já tenha fluxo mapeado, aparece o botão **Gerar POP a partir do Fluxo** (atividades, responsáveis, decisões e conexões alimentam a IA).

Botão principal: **Gerar POP com IA**.

## Documento gerado (todos os campos editáveis)

Nome do Processo, Objetivo, Escopo, Responsáveis, Entradas, Procedimento Operacional (passo a passo numerado, com etapas reordenáveis), Saídas, Pontos de Atenção e Indicadores sugeridos (ex.: tempo médio, SLA, retrabalho, demandas em atraso, volume executado).

Campos que a IA não conseguir identificar vêm preenchidos com "Informação não identificada. Validar durante o mapeamento do processo." e ficam destacados em amarelo para validação. A IA nunca inventa atividades ou responsáveis.

## Ações

- **Salvar POP** (versão do documento fica vinculada ao processo/empresa)
- **Atualizar com IA** (reprocessa mantendo edições manuais como contexto)
- **Exportar PDF** (mesmo padrão de branding dos demais relatórios: logo e cores do template de documentos)
- **Exportar Word** (.docx)

## Detalhes técnicos

- Tabela `pops` (id, company_id, project_id, process_id nullable, title, status draft/aprovado, campos do documento em JSONB, source_type text/imagem/fluxo, created_by, timestamps) com GRANTs e RLS por empresa, no mesmo padrão das demais tabelas.
- Upload dos fluxogramas em bucket privado `pop-sources`, com URL assinada para envio à IA.
- Server functions em `src/lib/pop.functions.ts`: `listPops`, `getPop`, `savePop`, `deletePop`, `generatePop` (protegidas por `requireSupabaseAuth`).
- `generatePop` usa o AI Gateway com `google/gemini-3.6-flash`, prompt de especialista em BPM, saída estruturada em JSON; imagem/PDF enviados como bloco multimodal. Mesma cadeia de fallback de modelos já usada em `ask-ai.functions.ts`.
- PDF via jsPDF (reaproveitando o padrão de `ExportDiagnosticPdfButton`); Word via biblioteca `docx` gerada no cliente.
- Nenhuma alteração nos módulos existentes além do novo card em Gestão e do atalho na tela do processo.
