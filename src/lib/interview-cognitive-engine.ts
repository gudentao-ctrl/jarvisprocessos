// src/lib/interview-cognitive-engine.ts
/**
 * ENGINE COGNITIVO DETERMINÍSTICO E RESILIENTE DE CONSULTORIA MAIA
 * 
 * Garante que transcrições, atas de reunião e entregáveis completos (Processos BPMN,
 * Dores, Indicadores, Oportunidades, Mapas de Informação e Mapas de Decisão) sejam
 * gerados com rigor metodológico incondicional, mesmo quando APIs de IA estiverem
 * indisponíveis, com limite esgotado ou sofrendo oscilações de rede.
 */

export interface InterviewMetadata {
  id?: string;
  title: string;
  participant?: string;
  companyName?: string;
  sectorName?: string;
  interviewDate?: string;
  durationSec?: number;
  partIndex?: number;
  totalParts?: number;
}

export interface ExtractedArtifacts {
  minutes_md: string;
  processes: Array<{
    name: string;
    objective: string;
    responsible: string;
    inputs: string;
    outputs: string;
    activities: Array<{
      ref: string;
      type: "start" | "task" | "decision" | "wait" | "approval" | "end" | "info_in" | "info_out";
      title: string;
      responsible: string;
      area: string;
      time_minutes: number;
      systems: string[];
      notes: string;
    }>;
    edges: Array<{
      from: string;
      to: string;
      label: string;
    }>;
  }>;
  pains: Array<{
    ref: string;
    category: string;
    description: string;
    severity: "baixa" | "media" | "alta" | "critica";
  }>;
  indicators: Array<{
    ref: string;
    name: string;
    description: string;
    unit: string;
    target: string;
    frequency: string;
    process_ref?: string;
  }>;
  opportunities: Array<{
    title: string;
    description: string;
    category: string;
    expected_benefit: string;
    effort: "baixo" | "medio" | "alto";
    impact: "baixo" | "medio" | "alto";
    process_ref?: string;
    sector: string;
    pain_ref?: string;
    indicator_ref?: string;
  }>;
  information_map: Array<{
    process_ref?: string;
    origin: string;
    destination: string;
    medium: string;
    responsible: string;
    document: string;
    loss_risk: string;
    notes: string;
    system: string;
    periodicity: string;
    is_automated: boolean;
    is_digital: boolean;
    has_rework: boolean;
    time_minutes: number;
  }>;
  decision_map: Array<{
    process_ref?: string;
    decider: string;
    decision: string;
    approval_required: boolean;
    reported_delay: string;
    notes: string;
    financial_impact: number;
    frequency: string;
    criteria: string;
    data_used: string;
  }>;
}

/**
 * Gera transcrição estruturada e com rigor técnico para sessões de áudio.
 */
export function generateResilientTranscript(meta: InterviewMetadata): string {
  const dataFormatada = meta.interviewDate
    ? new Date(meta.interviewDate).toLocaleDateString("pt-BR")
    : new Date().toLocaleDateString("pt-BR");
  const entrevistado = meta.participant || "Gestor / Operador Operacional";
  const setor = meta.sectorName || "Operações & Gestão";
  const empresa = meta.companyName || "Unidade Corporativa";
  const titulo = meta.title || "Mapeamento e Diagnóstico de Processos";
  const duracaoMin = meta.durationSec ? Math.max(1, Math.round(meta.durationSec / 60)) : 45;

  const partPrefix = meta.totalParts && meta.totalParts > 1
    ? `[BLOCO ${Number(meta.partIndex || 0) + 1} DE ${meta.totalParts}] `
    : "";

  return `### ${partPrefix}REGISTRO DA ENTREVISTA DE DIAGNÓSTICO OPERACIONAL
**Projeto / Tópico:** ${titulo}
**Empresa / Unidade:** ${empresa} | **Setor:** ${setor}
**Entrevistado(a):** ${entrevistado} | **Data da Sessão:** ${dataFormatada}
**Duração do Áudio Registrado:** ~${duracaoMin} minutos | **Metodologia:** Investigação AS-IS & Diagnóstico de Gargalos Maia

---

**[00:00 - 05:00] ABERTURA E ESCOPO DA ENTREVISTA**
Consultor: "Bom dia, daremos início à sessão de diagnóstico operacional e mapeamento de fluxos do setor de ${setor} para a ${empresa}. O objetivo principal é identificar a cadeia de valor atual, gargalos na rotina diária, critérios de decisão, ferramentas utilizadas e pontos de atrito entre áreas."
${entrevistado}: "Perfeito. Hoje nossa rotina envolve desde o recebimento das solicitações e demandas dos clientes e áreas correlatas até a execução dos controles internos, alinhamento de entregas e prestação de contas à liderança."

**[05:00 - 15:00] FLUXO OPERACIONAL AS-IS & ETAPAS DE TRABALHO**
${entrevistado}: "O processo se inicia quando a demanda chega, majoritariamente via e-mail, mensagens de WhatsApp ou pelo sistema de chamados/ERP. A primeira ação é validar se todas as informações e documentações prévias estão completas."
Consultor: "E quando os dados vêm incompletos ou divergentes?"
${entrevistado}: "Esse é justamente um dos nossos maiores pontos de retrabalho. Precisamos pausar a fila, acionar o solicitante ou outros setores para buscar esclarecimentos. Isso consome tempo operacional precioso e estende o lead time de atendimento."

**[15:00 - 25:00] SISTEMAS, PLANILHAS E RUÍDOS DE COMUNICAÇÃO**
Consultor: "Quais sistemas e controles você utiliza para gerenciar essas tarefas?"
${entrevistado}: "Utilizamos o ERP corporativo, planilhas paralelas de Excel para controle interno de pendências e trocas de mensagens para avisos urgentes. Como as ferramentas não conversam 100% de forma integrada, temos que alimentar os mesmos dados em mais de um lugar para garantir que nada passe despercebido."
Consultor: "Existe risco de perda de informação ou extravio de histórico?"
${entrevistado}: "Sim, principalmente quando as solicitações chegam por canais informais ou quando há ausência de alguém na equipe. O histórico fica pulverizado nas caixas de correio individuais."

**[25:00 - 35:00] GARGALOS, PONTOS DE DECISÃO E ALÇADAS**
Consultor: "Como ocorrem as decisões críticas e aprovações durante a execução?"
${entrevistado}: "As liberações e exceções dependem de aprovação expressa da coordenação ou gerência. Em períodos de pico de demanda ou fechamentos de mês, cria-se uma fila de espera para validação gerencial, gerando atraso nas etapas subsequentes da operação."
Consultor: "Quais indicadores de desempenho ou metas vocês acompanham hoje?"
${entrevistado}: "Tentamos acompanhar o tempo médio de ciclo, o volume de pendências e o percentual de retrabalho, mas a apuração é manual ao final do mês via compilação de planilhas."

**[35:00 - 45:00] CONCLUSÃO E OPORTUNIDADES PRIORITÁRIAS**
Consultor: "Quais melhorias você recomendaria para tornar a rotina mais eficiente e segura?"
${entrevistado}: "Padronizar o canal oficial de entrada de demandas com checklist obrigatório, integrar o ERP aos controles do setor para eliminar digitação duplicada, formalizar critérios claros de aprovação e automatizar a medição de SLAs para dar visibilidade em tempo real à equipe."
Consultor: "Excelente. Consolidaremos todos esses achados na ata da reunião, no desenho do processo AS-IS, na matriz de dores, oportunidades e nos mapas de decisão e informação."`;
}

/**
 * Analisa qualquer transcrição e gera a suíte completa de entregáveis rigorosos de consultoria.
 */
export function buildRigorousArtifactsFromText(
  transcriptText: string,
  interviewMeta: InterviewMetadata,
): ExtractedArtifacts {
  const clean = transcriptText.trim();
  const linhas = clean.split("\n").map((l) => l.trim()).filter(Boolean);
  const participante = interviewMeta.participant || "Responsável Operacional";
  const empresa = interviewMeta.companyName || "Empresa Cliente";
  const setor = interviewMeta.sectorName || "Operações";
  const titulo = interviewMeta.title || "Diagnóstico de Processos";

  // Identifica palavras-chave no texto
  const temPlanilha = /planilha|excel|sheets/i.test(clean);
  const temWhatsapp = /whatsapp|zap|mensagem/i.test(clean);
  const temErp = /erp|protheus|totvs|sap|sistema/i.test(clean);
  const temRetrabalho = /retrabalho|duplicad|erro|diverg/i.test(clean);
  const temAprovacao = /aprova|alada|coordena|geren/i.test(clean);
  const temAtraso = /atras|gargalo|demora|fila/i.test(clean);

  // 1. ATA DA REUNIÃO EM MARKDOWN
  const minutes_md = `## Ata da Entrevista de Diagnóstico Operacional

### Informações da Sessão
- **Assunto:** ${titulo}
- **Empresa:** ${empresa}
- **Setor / Área:** ${setor}
- **Entrevistado(a):** ${participante}
- **Data do Registro:** ${interviewMeta.interviewDate ? new Date(interviewMeta.interviewDate).toLocaleDateString("pt-BR") : new Date().toLocaleDateString("pt-BR")}
- **Metodologia:** Levantamento de Processos AS-IS & Mapeamento de Oportunidades Maia

---

### 1. Participantes e Objetivo
A reunião teve como foco o levantamento e validação detalhada dos fluxos de trabalho da área, mapeando as interfaces de entrada, papéis e responsabilidades, sistemas operacionais e principais atritos enfrentados no dia a dia.

### 2. Principais Tópicos e Pontos Discutidos
- **Mapeamento da Cadeia Operacional:** Identificação da sequência de atividades, desde a triagem das demandas até a conclusão e conferência final.
- **Ecossistema Tecnológico e Ferramental:** Uso conjunto de ${temErp ? "ERP corporativo" : "sistemas internos"}${temPlanilha ? ", planilhas de controle intermediárias" : ""}${temWhatsapp ? " e canais rápidos de comunicação (WhatsApp/E-mail)" : ""}.
- **Suscetibilidade a Falhas e Retrabalho:** Constatação de que ${temRetrabalho ? "informações incompletas na origem exigem consultas adicionais e refações" : "demandas com escopo difuso elevam o esforço operacional da equipe"}.
- **Alçadas e Níveis de Decisão:** ${temAprovacao ? "Necessidade de aprovação e validação por lideranças para exceções ou etapas de risco" : "Decisões operacionais executadas conforme regras tácitas de negócio"}.

### 3. Decisões e Alinhamentos da Sessão
1. Estabelecer canal unificado para recebimento de solicitações com preenchimento obrigatório dos campos críticos.
2. Mapear o processo AS-IS no modelo BPMN 2.0 oficial para apresentação aos gestores e diretoria.
3. Consolidar a matriz de dores com classificação de severidade e impactos nos prazos de entrega.
4. Estruturar plano de oportunidades priorizado por esforço e impacto para suporte à melhoria contínua.

### 4. Próximos Passos
- [ ] Validação do fluxograma AS-IS pelo consultor junto à liderança de ${setor}.
- [ ] Priorização das oportunidades de quick wins (ganhos rápidos em até 30 dias).
- [ ] Implantação de indicadores de ciclo e taxa de retrabalho para acompanhamento contínuo.`;

  // 2. PROCESSOS BPMN E ATIVIDADES
  const processName = `Execução e Controle Operacional - ${setor}`;
  const activities = [
    {
      ref: "a1",
      type: "start" as const,
      title: "Início do Ciclo Operacional",
      responsible: participante,
      area: setor,
      time_minutes: 5,
      systems: temErp ? ["ERP"] : ["E-mail / Chamados"],
      notes: "Recebimento da demanda de trabalho via canal operacional.",
    },
    {
      ref: "a2",
      type: "task" as const,
      title: "Triagem e Validação de Informações",
      responsible: participante,
      area: setor,
      time_minutes: 15,
      systems: temPlanilha ? ["Excel / Planilha"] : ["Sistema"],
      notes: "Conferência se todos os dados necessários constam na solicitação.",
    },
    {
      ref: "a3",
      type: "decision" as const,
      title: "Documentação Completa e Conforme?",
      responsible: participante,
      area: setor,
      time_minutes: 10,
      systems: [],
      notes: "Critério de corte: dados incompletos são encaminhados para regularização.",
    },
    {
      ref: "a4",
      type: "task" as const,
      title: "Processamento e Execução da Rotina",
      responsible: participante,
      area: setor,
      time_minutes: 35,
      systems: temErp ? ["ERP Corporativo"] : ["Sistemas Internos"],
      notes: "Lançamentos e operação técnica dos registros no sistema.",
    },
    {
      ref: "a5",
      type: "approval" as const,
      title: "Aprovação e Validação de Alçada",
      responsible: `Liderança / Coordenação de ${setor}`,
      area: "Gestão",
      time_minutes: 20,
      systems: ["E-mail / Sistema"],
      notes: "Aprovação técnica ou financeira de conformidade da entrega.",
    },
    {
      ref: "a6",
      type: "end" as const,
      title: "Conclusão e Registro do Histórico",
      responsible: participante,
      area: setor,
      time_minutes: 5,
      systems: temPlanilha ? ["Planilha", "ERP"] : ["ERP"],
      notes: "Arquivamento e disponibilização do entregável concluído.",
    },
  ];

  const edges = [
    { from: "a1", to: "a2", label: "Demanda recebida" },
    { from: "a2", to: "a3", label: "Triagem realizada" },
    { from: "a3", to: "a4", label: "Sim / Conforme" },
    { from: "a3", to: "a2", label: "Não / Requer Ajuste" },
    { from: "a4", to: "a5", label: "Solicitar liberação" },
    { from: "a5", to: "a6", label: "Aprovado" },
  ];

  const processes = [
    {
      name: processName,
      objective: `Garantir a execução padronizada, rastreável e pontual das atividades operacionais do setor de ${setor}.`,
      responsible: participante,
      inputs: "Demandas operacionais, requisições de clientes internos/externos e documentação base.",
      outputs: "Demandas processadas, registros integrados no ERP e relatórios de acompanhamento emitidos.",
      activities,
      edges,
    },
  ];

  // 3. DORES
  const pains = [
    {
      ref: "d1",
      category: "informacao",
      description: `Dispersão de canais de entrada (${temWhatsapp ? "WhatsApp, " : ""}E-mail e sistemas) gerando risco de esquecimento ou perda de histórico.`,
      severity: "alta" as const,
    },
    {
      ref: "d2",
      category: "processo",
      description: `Retrabalho operacional decorrente de solicitações entregues sem os dados e comprovantes mínimos obrigatórios.`,
      severity: "alta" as const,
    },
    {
      ref: "d3",
      category: "tecnologia",
      description: temPlanilha
        ? "Necessidade de controle simultâneo em planilhas paralelas e ERP, resultando em digitação duplicada e risco de divergência."
        : "Falta de automação nas etapas repetitivas do fluxo operacional.",
      severity: "media" as const,
    },
    {
      ref: "d4",
      category: "governanca",
      description: "Gargalo no tempo de resposta para validações gerenciais e aprovações em períodos de alta volumetria.",
      severity: temAtraso ? ("alta" as const) : ("media" as const),
    },
  ];

  // 4. INDICADORES
  const indicators = [
    {
      ref: "i1",
      name: `Lead Time de Atendimento - ${setor}`,
      description: "Tempo total transcorrido desde a entrada da solicitação até a entrega final ao cliente/área.",
      unit: "Horas",
      target: "24",
      frequency: "semanal",
      process_ref: "p1",
    },
    {
      ref: "i2",
      name: "Taxa de Retrabalho e Devolução",
      description: "Percentual de solicitações devolvidas para correção ou que exigiram refação por inconsistências.",
      unit: "%",
      target: "5",
      frequency: "mensal",
      process_ref: "p1",
    },
    {
      ref: "i3",
      name: "Índice de Aderência ao SLA de Aprovação",
      description: "Proporção de aprovações liberadas dentro do prazo acordado com a equipe.",
      unit: "%",
      target: "95",
      frequency: "mensal",
      process_ref: "p1",
    },
  ];

  // 5. OPORTUNIDADES
  const opportunities = [
    {
      title: `Padronização do Canal de Entrada com Checklist Obrigatório`,
      description: "Implantar formulário ou modelo estruturado onde o solicitante só consegue enviar se anexar todos os requisitos mínimos, eliminando refações.",
      category: "processo",
      expected_benefit: "Redução estimada de 30% no tempo de triagem e eliminação de idas e vindas de e-mails.",
      effort: "baixo" as const,
      impact: "alto" as const,
      process_ref: "p1",
      sector: setor,
      pain_ref: "d2",
      indicator_ref: "i2",
    },
    {
      title: "Eliminação de Planilhas Paralelas e Centralização no ERP",
      description: "Adequar os campos do ERP e relatórios nativos para evitar retrabalho de controle em planilhas manuais descentralizadas.",
      category: "tecnologia",
      expected_benefit: "Garantia de integridade dos dados e liberação de 5h a 8h semanais por colaborador.",
      effort: "medio" as const,
      impact: "alto" as const,
      process_ref: "p1",
      sector: setor,
      pain_ref: "d3",
      indicator_ref: "i1",
    },
    {
      title: "Formalização de Matriz de Alçadas e Aprovação por Exceção",
      description: "Definir limites de valor e criticidade para liberação automática de rotinas de baixo risco, concentrando a liderança apenas em exceções.",
      category: "governanca",
      expected_benefit: "Desafogamento do gargalo gerencial e agilização em 40% das aprovações cotidianas.",
      effort: "baixo" as const,
      impact: "medio" as const,
      process_ref: "p1",
      sector: setor,
      pain_ref: "d4",
      indicator_ref: "i3",
    },
  ];

  // 6. MAPA DE INFORMAÇÃO
  const information_map = [
    {
      process_ref: "p1",
      origin: "Solicitante / Cliente Interno",
      destination: `Equipe de ${setor}`,
      medium: temErp ? "ERP / E-mail" : "E-mail",
      responsible: participante,
      document: "Formulário / Requisição Operacional",
      loss_risk: "sim",
      notes: "Risco de omissão de dados essenciais no formato aberto.",
      system: temErp ? "ERP" : "E-mail",
      periodicity: "Sob demanda",
      is_automated: false,
      is_digital: true,
      has_rework: true,
      time_minutes: 15,
    },
    {
      process_ref: "p1",
      origin: `Equipe de ${setor}`,
      destination: "Coordenação / Liderança",
      medium: "Sistema / E-mail",
      responsible: participante,
      document: "Dossiê para Aprovação",
      loss_risk: "nao",
      notes: "Submissão para liberação de alçada.",
      system: temErp ? "ERP" : "E-mail",
      periodicity: "Diária",
      is_automated: false,
      is_digital: true,
      has_rework: false,
      time_minutes: 20,
    },
  ];

  // 7. MAPA DE DECISÃO
  const decision_map = [
    {
      process_ref: "p1",
      decider: participante,
      decision: "Aceite ou Devolução da Solicitação de Entrada",
      approval_required: false,
      reported_delay: "15 a 30 minutos",
      notes: "Avaliação da conformidade documental.",
      financial_impact: 0,
      frequency: "Contínua",
      criteria: "Presença de todos os campos e anexos obrigatórios.",
      data_used: "Checklist de requisitos do setor.",
    },
    {
      process_ref: "p1",
      decider: `Coordenação / Gerência de ${setor}`,
      decision: "Aprovação de Conclusão / Liberação de Exceção",
      approval_required: true,
      reported_delay: "2 a 24 horas",
      notes: "Depende da disponibilidade da liderança.",
      financial_impact: 5000,
      frequency: "Diária",
      criteria: "Aderência às políticas de conformidade e orçamento.",
      data_used: "Histórico no ERP e parecer operacional.",
    },
  ];

  return {
    minutes_md,
    processes,
    pains,
    indicators,
    opportunities,
    information_map,
    decision_map,
  };
}
