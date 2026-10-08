import { calculateAssessmentAge } from "@/lib/assessment-age";
import { bancoQuestoes, Questao } from "@/data/bancoQuestoes";

export interface CandidatePsychometricResult {
  candidato: {
    id: string;
    nome: string;
    idade: number | null;
    nascimento?: string | null;
    cargoAtual?: string;
    empresa?: string | null;
    externo?: boolean;
    escolaridade: string;
    cargoPretendido: string;
    dataTeste: string;
    tempoTotalMinutos: number;
  };
  validade: {
    statusGeral: "TESTE_VALIDO" | "VALIDO_COM_RESSALVAS" | "TESTE_INVALIDO";
    vrinEscore: number;
    desejabilidadeT: number;
    tmiSegundos: number;
    infrequenciaErros: number;
    mensagem: string;
    alertas: string[];
  };
  disc: {
    natural: Array<{ fator: "D" | "I" | "S" | "C"; nome: string; valor: number; theta: number; percentil: number }>;
    adaptado: Array<{ fator: "D" | "I" | "S" | "C"; nome: string; valor: number; theta: number; percentil: number }>;
    deltaEstresse: number;
    classificacaoEstresse: string;
    estiloLideranca: string;
    ambienteIdeal: string;
    pontosCegos: string[];
  };
  bigFive: {
    fatores: {
      neuroticismo: { percentil: number; escoreT: number; nivel: string; theta: number; facetas: Record<string, number> };
      extroversao: { percentil: number; escoreT: number; nivel: string; theta: number; facetas: Record<string, number> };
      abertura: { percentil: number; escoreT: number; nivel: string; theta: number; facetas: Record<string, number> };
      amabilidade: { percentil: number; escoreT: number; nivel: string; theta: number; facetas: Record<string, number> };
      conscienciosidade: { percentil: number; escoreT: number; nivel: string; theta: number; facetas: Record<string, number> };
    };
    fatorDominante: string;
  };
  matrizConvergencia: Array<{
    tracoDisc: string;
    fatorBigFive: string;
    cruzamento: "Confirmado" | "Divergente";
    diagnostico: string;
  }>;
  sinteseAutenticidade: string;
  matchCargo: {
    percentual: number;
    distanciaEuclidiana: number;
    competencias: Array<{
      nome: string;
      status: "Fortaleza" | "Adequado" | "Gap";
      descricao: string;
      score: number;
    }>;
  };
  perguntasStar: Array<{
    competencia: string;
    situacao: string;
    tarefa: string;
    acao: string;
    resultado: string;
  }>;
  parecerConsultor: {
    sinteseQualitativa: string;
    recomendacao: "RECOMENDADO" | "RECOMENDADO COM RESSALVAS" | "NÃO RECOMENDADO PARA A FUNÇÃO ATUAL";
    pdi: Array<{
      area: string;
      acao: string;
      prazoSugerido: string;
      indicadorSucesso: string;
    }>;
  };
}

/**
 * Função de erro de Gauss (erf) para cálculo do percentil normal acumulado:
 * P = 100 * 0.5 * [1 + erf(z / sqrt(2))]
 */
function erf(x: number): number {
  // Aproximação numérica de Abramowitz e Stegun (precisão > 1.5e-7)
  const sign = x >= 0 ? 1 : -1;
  const absX = Math.abs(x);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const t = 1.0 / (1.0 + p * absX);
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);
  return sign * y;
}

/**
 * Converte Z-Score em Índice Descritivo (0 a 100%)
 */
export function zToPercentil(z: number): number {
  const p = 0.5 * (1 + erf(z / Math.SQRT2)) * 100;
  return Math.min(99, Math.max(1, Math.round(p)));
}

/**
 * Converte Z-Score em Escala T (Média 50, Desvio Padrão 10)
 */
export function zToTScore(z: number): number {
  const t = 50 + 10 * z;
  return Math.round(t * 10) / 10;
}

/**
 * Classificação textual baseada no índice descritivo
 */
export function getPercentilNivel(p: number): string {
  if (p >= 90) return "Muito Alto";
  if (p >= 75) return "Alto";
  if (p >= 60) return "Médio-Alto";
  if (p >= 40) return "Médio";
  if (p >= 25) return "Médio-Baixo";
  if (p >= 10) return "Baixo";
  return "Muito Baixo";
}

/**
 * Inversão de Itens Likert de 5 pontos: X_inv = 6 - X_raw
 */
export function getScoreItem(respostaRaw: number | undefined, invertido: boolean): number {
  if (!Number.isInteger(respostaRaw) || Number(respostaRaw) < 1 || Number(respostaRaw) > 5) {
    throw new Error("Protocolo incompleto ou com resposta inválida");
  }
  const raw = Number(respostaRaw);
  return invertido ? 6 - raw : raw;
}

/**
 * Índice padronizado interno, calculado a partir da média das respostas
 * a = discriminação (~1.5), escala centrada em 3.0
 */
export function estimateTheta(scores: number[]): number {
  if (!scores.length) return 0;
  const media = scores.reduce((a, b) => a + b, 0) / scores.length;
  // Na escala Likert 1 a 5, o neutro é 3.0. Variância típica em escala 1 a 5 é ~0.8 a 1.0
  const zAprox = (media - 3.0) / 0.85;
  return Math.max(-3.0, Math.min(3.0, Math.round(zAprox * 100) / 100));
}

/**
 * Processador descritivo dos 240 itens
 */
export function processAssessmentResults(
  answers: Record<number, number>,
  totalExecutionSeconds: number,
  candidateMeta: {
    id: string;
    nome: string;
    idade?: number | null;
    escolaridade?: string;
    cargoPretendido?: string;
  }
): CandidatePsychometricResult {
  const totalItems = bancoQuestoes.length;
  const expectedIds = new Set(bancoQuestoes.map((question) => question.id));
  const receivedIds = Object.keys(answers).map(Number);
  if (receivedIds.length !== totalItems || receivedIds.some((id) => !expectedIds.has(id))) {
    throw new Error("Protocolo incompleto: todas as respostas são obrigatórias");
  }
  const tmi = totalExecutionSeconds > 0 ? totalExecutionSeconds / totalItems : 3.0;

  // -------------------------------------------------------------
  // 1. ESCALAS DE VALIDADE E CONTROLE
  // -------------------------------------------------------------
  // Desejabilidade Social (Itens 211 a 220)
  const itensDesejabilidade = bancoQuestoes.filter((q) => q.fator === "DESEJABILIDADE");
  const desejabilidadeScores = itensDesejabilidade.map((q) => getScoreItem(answers[q.id], q.invertido));
  const somaDesejabilidade = desejabilidadeScores.reduce((a, b) => a + b, 0); // min 10, max 50
  const mediaDesejabilidade = somaDesejabilidade / itensDesejabilidade.length;
  const zDesejabilidade = (mediaDesejabilidade - 2.5) / 0.8;
  const tDesejabilidade = Math.round(50 + 10 * zDesejabilidade);

  // Infrequência / Atenção (Itens 221 a 230)
  // Regras de gabarito para os itens de controle de atenção:
  const gabaritoInfrequencia: Record<number, number> = {
    221: 2, // Marque opção 2
    222: 1, // Voar sem avião -> 1
    223: 4, // Marque opção 4
    224: 1, // Respirar embaixo d'água -> 1
    225: 1, // Marque opção 1
    226: 1, // Mais de 200 anos -> 1
    227: 5, // Marque opção 5
    228: 1, // Nunca usou eletricidade -> 1
    229: 3, // Marque opção 3
    230: 1, // Atravessar paredes -> 1
  };

  let errosInfrequencia = 0;
  Object.entries(gabaritoInfrequencia).forEach(([qIdStr, expectedVal]) => {
    const qId = Number(qIdStr);
    const userVal = answers[qId];
    if (userVal !== undefined && userVal !== expectedVal) {
      errosInfrequencia++;
    }
  });

  // VRIN - Pares de Inconsistência (5 pares)
  // Itens 231 a 235 pareados com 126, 11, 41, 91, 141
  const paresVrin = [
    { a: 231, b: 126 },
    { a: 232, b: 11 },
    { a: 233, b: 41 },
    { a: 234, b: 91 },
    { a: 235, b: 141 },
  ];

  let vrinScore = 0;
  paresVrin.forEach((p) => {
    const valA = answers[p.a];
    const valB = answers[p.b];
    if (!Number.isInteger(valA) || !Number.isInteger(valB)) throw new Error("Protocolo incompleto");
    vrinScore += Math.abs(valA - valB);
  });

  // Parecer de Validade Geral
  const alertasValidade: string[] = [];
  let statusGeralValidade: "TESTE_VALIDO" | "VALIDO_COM_RESSALVAS" | "TESTE_INVALIDO" = "TESTE_VALIDO";

  if (tmi < 1.8) {
    statusGeralValidade = "TESTE_INVALIDO";
    alertasValidade.push(`TMI crítico de ${tmi.toFixed(1)}s/item. Preenchimento incompatível com leitura humana.`);
  } else if (tmi < 2.5) {
    statusGeralValidade = "VALIDO_COM_RESSALVAS";
    alertasValidade.push(`TMI de ${tmi.toFixed(1)}s/item abaixo da média recomendada.`);
  }

  if (vrinScore >= 7) {
    statusGeralValidade = "TESTE_INVALIDO";
    alertasValidade.push(`VRIN elevado (${vrinScore} pontos). Respostas aleatórias ou inconsistentes.`);
  } else if (vrinScore >= 4) {
    if (statusGeralValidade !== "TESTE_INVALIDO") statusGeralValidade = "VALIDO_COM_RESSALVAS";
    alertasValidade.push(`Inconsistência moderada de respostas (VRIN=${vrinScore}).`);
  }

  if (tDesejabilidade > 70) {
    if (statusGeralValidade !== "TESTE_INVALIDO") statusGeralValidade = "VALIDO_COM_RESSALVAS";
    alertasValidade.push(`Alerta de Maquiagem de Perfil: Desejabilidade Social elevada (T=${tDesejabilidade}).`);
  }

  if (errosInfrequencia >= 3) {
    statusGeralValidade = "TESTE_INVALIDO";
    alertasValidade.push(`${errosInfrequencia} erros nas questões de checagem direta de atenção.`);
  }

  const msgValidade =
    statusGeralValidade === "TESTE_VALIDO"
      ? "Protocolo sem alertas relevantes nos controles observáveis de atenção, ritmo e coerência."
      : statusGeralValidade === "VALIDO_COM_RESSALVAS"
      ? "Protocolo com alertas que devem ser considerados pelo consultor durante a entrevista."
      : "Protocolo com alertas críticos de atenção, ritmo ou coerência; recomenda-se revisar as condições de aplicação e considerar nova coleta.";

  // -------------------------------------------------------------
  // 2. BIG FIVE (150 ITENS - 5 FATORES x 6 FACETAS)
  // -------------------------------------------------------------
  const fatoresBigFive = [
    { key: "neuroticismo", fator: "NEUROTICISMO" },
    { key: "extroversao", fator: "EXTROVERSAO" },
    { key: "abertura", fator: "ABERTURA" },
    { key: "amabilidade", fator: "AMABILIDADE" },
    { key: "conscienciosidade", fator: "CONSCIENCIOSIDADE" },
  ] as const;

  const resultadoBigFiveFatores: any = {};

  fatoresBigFive.forEach(({ key, fator }) => {
    const itensFator = bancoQuestoes.filter((q) => q.fator === fator);
    const facetasMap: Record<string, number[]> = {};

    itensFator.forEach((q) => {
      const facetaNome = q.faceta || "Geral";
      if (!facetasMap[facetaNome]) facetasMap[facetaNome] = [];
      const score = getScoreItem(answers[q.id], q.invertido);
      facetasMap[facetaNome].push(score);
    });

    const facetasResult: Record<string, number> = {};
    const todosScoresFator: number[] = [];

    Object.entries(facetasMap).forEach(([fNome, fScores]) => {
      const thetaFaceta = estimateTheta(fScores);
      facetasResult[fNome] = zToPercentil(thetaFaceta);
      todosScoresFator.push(...fScores);
    });

    const thetaFator = estimateTheta(todosScoresFator);
    const escoreT = zToTScore(thetaFator);
    const percentil = zToPercentil(thetaFator);

    resultadoBigFiveFatores[key] = {
      percentil,
      escoreT,
      nivel: getPercentilNivel(percentil),
      theta: thetaFator,
      facetas: facetasResult,
    };
  });

  // Fator dominante Big Five
  const entriesBF = Object.entries(resultadoBigFiveFatores) as Array<[string, { percentil: number }]>;
  entriesBF.sort((a, b) => b[1].percentil - a[1].percentil);
  const fatorDominanteBF = entriesBF[0][0].toUpperCase();

  // -------------------------------------------------------------
  // 3. ANÁLISE DISC (60 ITENS) & DELTA DE ADAPTAÇÃO
  // -------------------------------------------------------------
  // Perfil Adaptado (Respostas dos itens 151 a 210 no contexto de trabalho)
  const itensD = bancoQuestoes.filter((q) => q.fator === "DOMINANCIA");
  const itensI = bancoQuestoes.filter((q) => q.fator === "INFLUENCIA");
  const itensS = bancoQuestoes.filter((q) => q.fator === "ESTABILIDADE");
  const itensC = bancoQuestoes.filter((q) => q.fator === "CONFORMIDADE");

  const thetaD_Adapt = estimateTheta(itensD.map((q) => getScoreItem(answers[q.id], q.invertido)));
  const thetaI_Adapt = estimateTheta(itensI.map((q) => getScoreItem(answers[q.id], q.invertido)));
  const thetaS_Adapt = estimateTheta(itensS.map((q) => getScoreItem(answers[q.id], q.invertido)));
  const thetaC_Adapt = estimateTheta(itensC.map((q) => getScoreItem(answers[q.id], q.invertido)));

  const tD_Adapt = zToTScore(thetaD_Adapt);
  const tI_Adapt = zToTScore(thetaI_Adapt);
  const tS_Adapt = zToTScore(thetaS_Adapt);
  const tC_Adapt = zToTScore(thetaC_Adapt);

  // Perfil Natural (Estimado a partir do cruzamento intrínseco Big Five correlato)
  // D_Nat correlaciona com Conscienciosidade alta + Neuroticismo baixo
  // I_Nat correlaciona com Extroversão alta
  // S_Nat correlaciona com Amabilidade alta + Estabilidade alta
  // C_Nat correlaciona com Conscienciosidade + Deliberação / Ordem
  const tD_Nat = Math.round(
    50 + 10 * (0.6 * resultadoBigFiveFatores.conscienciosidade.theta - 0.4 * resultadoBigFiveFatores.neuroticismo.theta)
  );
  const tI_Nat = Math.round(50 + 10 * resultadoBigFiveFatores.extroversao.theta);
  const tS_Nat = Math.round(
    50 + 10 * (0.5 * resultadoBigFiveFatores.amabilidade.theta - 0.5 * resultadoBigFiveFatores.neuroticismo.theta)
  );
  const tC_Nat = Math.round(
    50 + 10 * (0.7 * resultadoBigFiveFatores.conscienciosidade.theta + 0.3 * (3.0 - resultadoBigFiveFatores.abertura.theta))
  );

  // Delta DISC (Distância Euclidiana entre Perfil Adaptado e Natural)
  const deltaDisc = Math.round(
    Math.sqrt(
      Math.pow(tD_Adapt - tD_Nat, 2) +
      Math.pow(tI_Adapt - tI_Nat, 2) +
      Math.pow(tS_Adapt - tS_Nat, 2) +
      Math.pow(tC_Adapt - tC_Nat, 2)
    ) * 10
  ) / 10;

  let classificacaoEstresse = "Baixa Exigência de Adaptação (Zona de Conforto)";
  if (deltaDisc > 30) {
    classificacaoEstresse = "Alto Risco de Burnout / Estresse Comportamental Severo";
  } else if (deltaDisc >= 16) {
    classificacaoEstresse = "Modificação Comportamental Saudável";
  }

  // Estilo de Liderança Dominante
  let estiloLideranca = "Liderança Orientada para Resultados e Execução Operacional";
  if (tI_Adapt >= tD_Adapt && tI_Adapt >= tS_Adapt && tI_Adapt >= tC_Adapt) {
    estiloLideranca = "Liderança Comunicativa, Inspiradora e Motivadora de Equipes";
  } else if (tS_Adapt >= tD_Adapt && tS_Adapt >= tI_Adapt && tS_Adapt >= tC_Adapt) {
    estiloLideranca = "Liderança Acolhedora, Servidora e Pacificadora de Conflitos";
  } else if (tC_Adapt >= tD_Adapt && tC_Adapt >= tI_Adapt && tC_Adapt >= tS_Adapt) {
    estiloLideranca = "Liderança Metódica, Analítica e Orientada para Governança e Qualidade";
  }

  // -------------------------------------------------------------
  // 4. CRUZAMENTO E MATRIZ DE CONVERGÊNCIA (BIG FIVE x DISC)
  // -------------------------------------------------------------
  const cruzamentoD: "Confirmado" | "Divergente" =
    tD_Adapt >= 60 && resultadoBigFiveFatores.amabilidade.percentil <= 60 ? "Confirmado" : "Divergente";
  const cruzamentoI: "Confirmado" | "Divergente" =
    tI_Adapt >= 60 && resultadoBigFiveFatores.extroversao.percentil >= 60 ? "Confirmado" : "Divergente";
  const cruzamentoS: "Confirmado" | "Divergente" =
    tS_Adapt >= 60 && resultadoBigFiveFatores.amabilidade.percentil >= 50 ? "Confirmado" : "Divergente";
  const cruzamentoC: "Confirmado" | "Divergente" =
    tC_Adapt >= 60 && resultadoBigFiveFatores.conscienciosidade.percentil >= 60 ? "Confirmado" : "Divergente";

  const matrizConvergencia = [
    {
      tracoDisc: "Alta Dominância (D)",
      fatorBigFive: "Baixa Amabilidade + Alta Extroversão",
      cruzamento: cruzamentoD,
      diagnostico:
        cruzamentoD === "Confirmado"
          ? "Execução rápida e assertiva comprovada pela orientação natural para resultados."
          : "Adaptação consciente de postura para assumir firmeza sem perfil natural combativo.",
    },
    {
      tracoDisc: "Alta Influência (I)",
      fatorBigFive: "Alta Extroversão + Alta Abertura",
      cruzamento: cruzamentoI,
      diagnostico:
        cruzamentoI === "Confirmado"
          ? "Excelente comunicação espontânea, carisma e receptividade a inovações."
          : "Comunicação funcional focada em objetivos de negócios, com menor sociabilidade espontânea.",
    },
    {
      tracoDisc: "Alta Estabilidade (S)",
      fatorBigFive: "Alta Amabilidade + Baixo Neuroticismo",
      cruzamento: cruzamentoS,
      diagnostico:
        cruzamentoS === "Confirmado"
          ? "Perfil empático e pacificador que preserva a harmonia e previsibilidade do ambiente."
          : "Busca de segurança motivada por cautela situacional, mantendo vigilância interna.",
    },
    {
      tracoDisc: "Alta Conformidade (C)",
      fatorBigFive: "Alta Conscienciosidade + Baixa Abertura",
      cruzamento: cruzamentoC,
      diagnostico:
        cruzamentoC === "Confirmado"
          ? "Rigor técnico absoluto, conformidade processual e respeito a normas de qualidade."
          : "Disciplina aplicada por dever situacional, mantendo visão criativa e flexível.",
    },
  ];

  // -------------------------------------------------------------
  // 5. ADEQUAÇÃO AO CARGO (MATCH EUCLIDIANO DE COMPETÊNCIAS)
  // -------------------------------------------------------------
  // Perfil Ideal para Cargos Gerenciais / Operações:
  // D_ideal = 75, I_ideal = 60, S_ideal = 50, C_ideal = 70
  const idealScores = { D: 75, I: 60, S: 50, C: 70 };
  const pesos = { D: 1.2, I: 0.9, S: 0.8, C: 1.1 };

  const somaDistancia =
    pesos.D * Math.pow(tD_Adapt - idealScores.D, 2) +
    pesos.I * Math.pow(tI_Adapt - idealScores.I, 2) +
    pesos.S * Math.pow(tS_Adapt - idealScores.S, 2) +
    pesos.C * Math.pow(tC_Adapt - idealScores.C, 2);

  const dp = Math.sqrt(somaDistancia / (pesos.D + pesos.I + pesos.S + pesos.C));
  const matchPct = Math.round(Math.max(0, 100 * (1 - dp / 30)));

  const competenciasMapeadas = [
    {
      nome: "Capacidade Analítica & Tomada de Decisão",
      score: tC_Adapt,
      status: (tC_Adapt >= 65 ? "Fortaleza" : tC_Adapt >= 50 ? "Adequado" : "Gap") as "Fortaleza" | "Adequado" | "Gap",
      descricao: "Rigor no uso de dados, identificação de falhas e assertividade em decisões complexas.",
    },
    {
      nome: "Inteligência Emocional e Resiliência",
      score: 100 - resultadoBigFiveFatores.neuroticismo.percentil,
      status: (resultadoBigFiveFatores.neuroticismo.percentil <= 35 ? "Fortaleza" : resultadoBigFiveFatores.neuroticismo.percentil <= 60 ? "Adequado" : "Gap") as "Fortaleza" | "Adequado" | "Gap",
      descricao: "Autocontrole sob estresse, tolerância à frustração e manutenção do foco lógico em crises.",
    },
    {
      nome: "Trabalho sob Pressão e Gestão de Prazos",
      score: tD_Adapt,
      status: (tD_Adapt >= 70 ? "Fortaleza" : tD_Adapt >= 55 ? "Adequado" : "Gap") as "Fortaleza" | "Adequado" | "Gap",
      descricao: "Velocidade de resposta operacional, cobrança assertiva e cumprimento de cronogramas.",
    },
    {
      nome: "Comunicação e Influência Interpessoal",
      score: tI_Adapt,
      status: (tI_Adapt >= 65 ? "Fortaleza" : tI_Adapt >= 48 ? "Adequado" : "Gap") as "Fortaleza" | "Adequado" | "Gap",
      descricao: "Capacidade de negociação, alinhamento de expectativas e engajamento da equipe.",
    },
    {
      nome: "Organização, Planejamento e Normas",
      score: resultadoBigFiveFatores.conscienciosidade.percentil,
      status: (resultadoBigFiveFatores.conscienciosidade.percentil >= 75 ? "Fortaleza" : resultadoBigFiveFatores.conscienciosidade.percentil >= 50 ? "Adequado" : "Gap") as "Fortaleza" | "Adequado" | "Gap",
      descricao: "Estruturação sistemática de fluxos, respeito a processos de qualidade e documentação.",
    },
  ];

  // -------------------------------------------------------------
  // 6. PERGUNTAS STAR INVESTIGATIVAS (DINÂMICAS)
  // -------------------------------------------------------------
  const perguntasStar = [
    {
      competencia: "Resiliência e Gestão de Conflitos",
      situacao: "Relate uma ocasião em que um processo crítico sofreu um imprevisto severo por falha de comunicação da equipe.",
      tarefa: "Qual era a sua responsabilidade direta perante a diretoria e os clientes naquele momento?",
      acao: "Como você agiu para conter o problema imediato sem prejudicar o clima e a confiança do time?",
      resultado: "Quais indicadores operacionais foram restabelecidos e qual aprendizado você implementou no fluxo?",
    },
    {
      competencia: "Adaptação Comportamental sob Pressão",
      situacao: "Descreva um projeto de alta exigência em que seu estilo habitual de trabalho precisou ser completamente modificado.",
      tarefa: "Qual meta exigia essa mudança e quais comportamentos específicos você teve que adotar?",
      acao: "De que maneira você lidou com o desgaste ou a tensão gerada por essa exigência de adaptação?",
      resultado: "Qual foi o impacto dessa flexibilidade na entrega final e na sua saúde emocional?",
    },
    {
      competencia: "Foco em Metas vs Empatia Operacional",
      situacao: "Conte sobre uma decisão difícil em que foi necessário cobrar metas agressivas de colaboradores sobrecarregados.",
      tarefa: "Qual era o prazo-limite inegociável a ser entregue pela área?",
      acao: "Como você equilibrou a firmeza de cobrança com o apoio e acolhimento humano individual?",
      resultado: "O time bateu a meta? Houve algum desdobramento no clima organizacional pós-entrega?",
    },
    {
      competencia: "Inovação com Rigor Metodológico",
      situacao: "Dê um exemplo de uma melhoria estrutural que você propôs para modernizar um procedimento antigo da empresa.",
      tarefa: "Quais resistências internas precisavam ser superadas para implementar a nova solução?",
      acao: "Quais dados e fatos você levantou para comprovar a viabilidade técnica e financeira da mudança?",
      resultado: "Quais ganhos quantitativos de tempo e redução de custos foram mensurados após a implantação?",
    },
  ];

  // -------------------------------------------------------------
  // 7. PARECER TÉCNICO E RECOMENDAÇÕES DO CONSULTOR
  // -------------------------------------------------------------
  let recomendacaoFinal: "RECOMENDADO" | "RECOMENDADO COM RESSALVAS" | "NÃO RECOMENDADO PARA A FUNÇÃO ATUAL" = "RECOMENDADO";
  if (statusGeralValidade === "TESTE_INVALIDO" || matchPct < 55) {
    recomendacaoFinal = "NÃO RECOMENDADO PARA A FUNÇÃO ATUAL";
  } else if (statusGeralValidade === "VALIDO_COM_RESSALVAS" || deltaDisc > 30 || matchPct < 75) {
    recomendacaoFinal = "RECOMENDADO COM RESSALVAS";
  }

  const factorLabels: Record<string, string> = {
    neuroticismo: "regulação emocional",
    extroversao: "comunicação e presença social",
    abertura: "flexibilidade e abertura a experiências",
    amabilidade: "cooperação e escuta",
    conscienciosidade: "organização e constância",
  };
  const ascendingFactors = [...entriesBF].sort((a, b) => a[1].percentil - b[1].percentil);
  const developmentKeys = ascendingFactors
    .filter(([key]) => key !== "neuroticismo")
    .slice(0, 2)
    .map(([key]) => key);
  if (resultadoBigFiveFatores.neuroticismo.percentil >= 60) developmentKeys.unshift("neuroticismo");
  const uniqueDevelopmentKeys = [...new Set(developmentKeys)].slice(0, 2);
  const pdiSugerido = uniqueDevelopmentKeys.map((key, index) => ({
    area: `Desenvolvimento de ${factorLabels[key]}`,
    acao: `Definir uma prática semanal observável de ${factorLabels[key]}, registrar situações críticas e revisar evidências com a liderança direta.`,
    prazoSugerido: index === 0 ? "Primeiros 60 dias" : "90 dias",
    indicadorSucesso: `Evidências mensais de evolução em ${factorLabels[key]} por feedback estruturado e entregas registradas.`,
  }));
  pdiSugerido.push({
    area: "Acompanhamento do estilo adaptado",
    acao: `Revisar mensalmente situações em que o esforço de adaptação atingiu ${deltaDisc} pontos e identificar condições que aumentam ou reduzem essa diferença.`,
    prazoSugerido: "Contínuo",
    indicadorSucesso: "Registro de situações, estratégias utilizadas e percepção de esforço ao longo de três ciclos.",
  });

  const highestFactors = [...entriesBF].slice(0, 2).map(([key, value]) => `${factorLabels[key]} (índice ${value.percentil})`);
  const lowestFactor = ascendingFactors[0];
  const protocolPrefix = statusGeralValidade === "TESTE_INVALIDO"
    ? "O protocolo apresentou alertas críticos e requer revisão antes de qualquer interpretação."
    : statusGeralValidade === "VALIDO_COM_RESSALVAS"
      ? "O protocolo apresentou ressalvas que devem ser verificadas em entrevista."
      : "Os controles de atenção, ritmo e coerência não apresentaram alertas relevantes.";

  return {
    candidato: {
      id: candidateMeta.id,
      nome: candidateMeta.nome,
      idade: candidateMeta.idade ?? null,
      escolaridade: candidateMeta.escolaridade || "Não informado",
      cargoPretendido: candidateMeta.cargoPretendido || "Não informado",
      dataTeste: new Date().toISOString().split("T")[0],
      tempoTotalMinutos: Math.round(totalExecutionSeconds / 60),
    },
    validade: {
      statusGeral: statusGeralValidade,
      vrinEscore: vrinScore,
      desejabilidadeT: tDesejabilidade,
      tmiSegundos: Math.round(tmi * 10) / 10,
      infrequenciaErros: errosInfrequencia,
      mensagem: msgValidade,
      alertas: alertasValidade,
    },
    disc: {
      natural: [
        { fator: "D", nome: "Dominância", valor: zToPercentil((tD_Nat - 50) / 10), theta: (tD_Nat - 50) / 10, percentil: zToPercentil((tD_Nat - 50) / 10) },
        { fator: "I", nome: "Influência", valor: zToPercentil((tI_Nat - 50) / 10), theta: (tI_Nat - 50) / 10, percentil: zToPercentil((tI_Nat - 50) / 10) },
        { fator: "S", nome: "Estabilidade", valor: zToPercentil((tS_Nat - 50) / 10), theta: (tS_Nat - 50) / 10, percentil: zToPercentil((tS_Nat - 50) / 10) },
        { fator: "C", nome: "Conformidade", valor: zToPercentil((tC_Nat - 50) / 10), theta: (tC_Nat - 50) / 10, percentil: zToPercentil((tC_Nat - 50) / 10) },
      ],
      adaptado: [
        { fator: "D", nome: "Dominância", valor: zToPercentil(thetaD_Adapt), theta: thetaD_Adapt, percentil: zToPercentil(thetaD_Adapt) },
        { fator: "I", nome: "Influência", valor: zToPercentil(thetaI_Adapt), theta: thetaI_Adapt, percentil: zToPercentil(thetaI_Adapt) },
        { fator: "S", nome: "Estabilidade", valor: zToPercentil(thetaS_Adapt), theta: thetaS_Adapt, percentil: zToPercentil(thetaS_Adapt) },
        { fator: "C", nome: "Conformidade", valor: zToPercentil(thetaC_Adapt), theta: thetaC_Adapt, percentil: zToPercentil(thetaC_Adapt) },
      ],
      deltaEstresse: deltaDisc,
      classificacaoEstresse,
      estiloLideranca,
      ambienteIdeal: tC_Adapt >= Math.max(tD_Adapt, tI_Adapt, tS_Adapt)
        ? "Ambientes com critérios claros, qualidade mensurável e previsibilidade de processos."
        : tI_Adapt >= Math.max(tD_Adapt, tS_Adapt)
          ? "Ambientes colaborativos, com interação frequente, comunicação aberta e espaço para influência."
          : tS_Adapt >= Math.max(tD_Adapt, tI_Adapt)
            ? "Ambientes estáveis, cooperativos e com mudanças conduzidas de forma gradual."
            : "Ambientes orientados a resultados, com autonomia, decisões rápidas e desafios objetivos.",
      pontosCegos: [
        `O menor índice relativo foi ${factorLabels[lowestFactor[0]]} (${lowestFactor[1].percentil}); investigar impactos concretos em entrevista.`,
        deltaDisc >= 16 ? `A diferença entre estilo natural e adaptado foi de ${deltaDisc} pontos; mapear as situações que exigem maior esforço.` : "A diferença entre estilo natural e adaptado permaneceu baixa no protocolo.",
        tDesejabilidade > 70 ? "Houve elevação no controle de desejabilidade; confirmar exemplos comportamentais e resultados observáveis." : "Não houve elevação relevante no controle de desejabilidade.",
      ],
    },
    bigFive: {
      fatores: resultadoBigFiveFatores,
      fatorDominante: fatorDominanteBF,
    },
    matrizConvergencia,
    sinteseAutenticidade: `${protocolPrefix} A convergência entre os dois recortes foi confirmada em ${matrizConvergencia.filter((item) => item.cruzamento === "Confirmado").length} de 4 dimensões.`,
    matchCargo: {
      percentual: matchPct,
      distanciaEuclidiana: Math.round(dp * 10) / 10,
      competencias: competenciasMapeadas,
    },
    perguntasStar,
    parecerConsultor: {
      sinteseQualitativa: `${protocolPrefix} Os maiores índices relativos foram ${highestFactors.join(" e ")}. O menor índice relativo foi ${factorLabels[lowestFactor[0]]} (${lowestFactor[1].percentil}). O estilo adaptado predominante foi descrito como ${estiloLideranca.toLowerCase()}, com diferença global de ${deltaDisc} pontos em relação ao perfil natural. Esses achados devem ser confrontados com exemplos comportamentais e evidências da trajetória profissional.`,
      recomendacao: recomendacaoFinal,
      pdi: pdiSugerido,
    },
  };
}

/**
 * Estado mock de demonstração conforme especificado no prompt mestre
 */
export const MOCK_CONSULTANT_REPORT_STATE: CandidatePsychometricResult = {
  candidato: {
    id: "cand-2026-001",
    nome: "Guilherme Siqueira",
    idade: 36,
    escolaridade: "Pós-Graduação / MBA Executivo",
    cargoPretendido: "Gerente Geral de Operações",
    dataTeste: "2026-09-28",
    tempoTotalMinutos: 41,
  },
  validade: {
    statusGeral: "VALIDO_COM_RESSALVAS",
    vrinEscore: 4,
    desejabilidadeT: 63,
    tmiSegundos: 2.8,
    infrequenciaErros: 0,
    mensagem: "Leve elevação na Desejabilidade Social (T=63). Teste com boa consistência interna.",
    alertas: ["Leve elevação na Desejabilidade Social (T=63) - tendência a projetar imagem altamente profissional."],
  },
  disc: {
    natural: [
      { fator: "D", nome: "Dominância", valor: 85, theta: 1.05, percentil: 85 },
      { fator: "I", nome: "Influência", valor: 65, theta: 0.38, percentil: 65 },
      { fator: "S", nome: "Estabilidade", valor: 35, theta: -0.38, percentil: 35 },
      { fator: "C", nome: "Conformidade", valor: 72, theta: 0.58, percentil: 72 },
    ],
    adaptado: [
      { fator: "D", nome: "Dominância", valor: 90, theta: 1.28, percentil: 90 },
      { fator: "I", nome: "Influência", valor: 50, theta: 0.0, percentil: 50 },
      { fator: "S", nome: "Estabilidade", valor: 30, theta: -0.52, percentil: 30 },
      { fator: "C", nome: "Conformidade", valor: 82, theta: 0.92, percentil: 82 },
    ],
    deltaEstresse: 21.4,
    classificacaoEstresse: "Modificação Comportamental Saudável",
    estiloLideranca: "Liderança Focada em Execução, Metas e Rigor Operacional",
    ambienteIdeal: "Projetos de reestruturação de processos, metas objetivas e autonomia de governança.",
    pontosCegos: [
      "Pode acelerar cobranças antes de calibrar a maturidade técnica da equipe.",
      "Risco de elevar exigências perfeccionistas em períodos de alta demanda.",
      "Necessidade de reforçar rituais de feedback positivo para o time.",
    ],
  },
  bigFive: {
    fatores: {
      neuroticismo: {
        percentil: 28,
        escoreT: 44,
        nivel: "Baixo",
        theta: -0.58,
        facetas: { Ansiedade: 30, Vulnerabilidade: 25, Hostilidade: 28, Impulsividade: 32, Depressão: 20, Autoconsciência: 35 },
      },
      extroversao: {
        percentil: 76,
        escoreT: 57,
        nivel: "Alto",
        theta: 0.71,
        facetas: { Acolhimento: 70, Gregarismo: 65, Assertividade: 88, Atividade: 82, "Busca de Excitação": 72, "Emoções Positivas": 78 },
      },
      abertura: {
        percentil: 68,
        escoreT: 55,
        nivel: "Médio-Alto",
        theta: 0.47,
        facetas: { Fantasia: 60, Estética: 65, Sentimentos: 62, Ações: 75, Ideias: 74, Valores: 70 },
      },
      amabilidade: {
        percentil: 42,
        escoreT: 48,
        nivel: "Médio-Baixo",
        theta: -0.2,
        facetas: { Confiança: 50, Franqueza: 78, Altruísmo: 45, Conformidade: 35, Modéstia: 40, Sensibilidade: 45 },
      },
      conscienciosidade: {
        percentil: 92,
        escoreT: 64,
        nivel: "Muito Alto",
        theta: 1.41,
        facetas: { Competência: 92, Ordem: 88, Dever: 95, "Esforço para Realização": 94, Autodisciplina: 90, Deliberação: 86 },
      },
    },
    fatorDominante: "CONSCIENCIOSIDADE",
  },
  matrizConvergencia: [
    {
      tracoDisc: "Alta Dominância (D)",
      fatorBigFive: "Baixa Amabilidade + Alta Extroversão",
      cruzamento: "Confirmado",
      diagnostico: "Execução rápida, foco em resultados, mas pode exigir desenvolvimento contínuo em empatia e escuta.",
    },
    {
      tracoDisc: "Alta Influência (I)",
      fatorBigFive: "Alta Extroversão + Alta Abertura",
      cruzamento: "Confirmado",
      diagnostico: "Excelente capacidade de comunicação institucional e facilidade para liderar transformações.",
    },
    {
      tracoDisc: "Alta Estabilidade (S)",
      fatorBigFive: "Alta Amabilidade + Baixo Neuroticismo",
      cruzamento: "Confirmado",
      diagnostico: "Perfil equilibrado, seguro em situações de crise e focado em manter o time operando com estabilidade.",
    },
    {
      tracoDisc: "Alta Conformidade (C)",
      fatorBigFive: "Alta Conscienciosidade + Baixa Abertura",
      cruzamento: "Confirmado",
      diagnostico: "Rigor técnico elevado, atenção a normas de conformidade e zelo pelo padrão de entrega.",
    },
  ],
  sinteseAutenticidade:
    "A convergência de 100% entre o Perfil Natural (Big Five) e o Perfil Adaptado (DISC) comprova que o candidato atua de forma autêntica e alinhada às exigências da função executiva.",
  matchCargo: {
    percentual: 89,
    distanciaEuclidiana: 3.3,
    competencias: [
      { nome: "Capacidade Analítica & Tomada de Decisão", status: "Fortaleza", score: 85, descricao: "Tomada de decisão rápida, fundamentada em fatos e métricas de desempenho." },
      { nome: "Inteligência Emocional & Resiliência", status: "Adequado", score: 72, descricao: "Estabilidade comprovada sob estresse agudo e maturidade em crises." },
      { nome: "Trabalho sob Pressão & Gestão de Prazos", status: "Fortaleza", score: 90, descricao: "Alto foco em bater metas antes dos prazos com ritmo acelerado." },
      { nome: "Comunicação e Influência Interpessoal", status: "Adequado", score: 65, descricao: "Clareza expositiva e habilidade para negociar com áreas parceiras." },
      { nome: "Organização, Planejamento e Normas", status: "Gap", score: 58, descricao: "Pode acelerar entregas antes de validar fluxos documentais secundários." },
    ],
  },
  perguntasStar: [
    {
      competencia: "Resiliência e Cobrança de Metas",
      situacao: "Relate uma ocasião em que um processo crítico sofreu atraso severo por falha de fornecedores ou terceiros.",
      tarefa: "Qual era a sua meta inegociável perante a diretoria naquele trimestre?",
      acao: "Como você agiu para reorganizar o fluxo e cobrar o time sem gerar desengajamento?",
      resultado: "Qual foi o indicador atingido e o que foi implementado como salvaguarda?",
    },
    {
      competencia: "Adaptação Comportamental sob Pressão",
      situacao: "Descreva um momento em que precisou atuar em um ambiente corporativo com alta ambiguidade e escassez de normas.",
      tarefa: "O que era demandado da sua liderança em termos de pioneirismo?",
      acao: "Quais comportamentos você adotou para criar estabilidade onde não havia processos prontos?",
      resultado: "Qual metodologia foi estabelecida como legado para a organização?",
    },
    {
      competencia: "Gestão de Pessoas e Empatia",
      situacao: "Conte sobre um colaborador experiente que perdeu o rendimento e precisava de alinhamento duro.",
      tarefa: "Qual era o impacto direto dessa queda na equipe geral?",
      acao: "De que maneira você conduziu o feedback e quais combinados foram traçados?",
      resultado: "O colaborador recuperou o padrão de entrega ou foi realizada a transição adequada?",
    },
    {
      competencia: "Inovação e Rigor Técnico",
      situacao: "Dê um exemplo de uma inovação que você implementou que gerou ganhos expressivos de produtividade.",
      tarefa: "Quais resistências internas precisavam ser superadas para a nova ferramenta ser aceita?",
      acao: "Como você utilizou dados e fatos para engajar os executivos na aprovação?",
      resultado: "Quais ganhos mensuráveis de eficiência foram comprovados após o go-live?",
    },
  ],
  parecerConsultor: {
    sinteseQualitativa:
      "Guilherme Siqueira apresenta perfil de alto nível para a Gerência Geral de Operações. Destaca-se por altíssima Conscienciosidade (P=92%), resiliência emocional (Neuroticismo P=28%) e traços marcantes de Dominância (D=90) e Conformidade (C=82). O índice Delta DISC de 21.4 pontos reflete esforço adaptativo saudável, indicando engajamento sem risco de estresse crônico.",
    recomendacao: "RECOMENDADO",
    pdi: [
      {
        area: "Desenvolvimento de Empatia e Escuta Ativa",
        acao: "Estruturar rituais quinzenais de escuta com os supervisores diretos, acolhendo percepções antes de deliberar comandos operacionais.",
        prazoSugerido: "Primeiros 60 dias",
        indicadorSucesso: "Feedback positivo no comitê de liderança e índice de retenção da equipe.",
      },
      {
        area: "Gestão do Ritmo de Cobrança Operacional",
        acao: "Ajustar o nível de exigência à maturidade dos profissionais novatos, utilizando a metodologia Situational Leadership.",
        prazoSugerido: "90 dias",
        indicadorSucesso: "Aceleração na curva de aprendizado de novos contratados.",
      },
      {
        area: "Delegação e Foco Estratégico",
        acao: "Evitar centralização na checagem minuciosa de relatórios operacionais que já possuam validação intermediária.",
        prazoSugerido: "Imediato",
        indicadorSucesso: "Maior disponibilidade de tempo para alinhamentos com diretoria e clientes.",
      },
    ],
  },
};

/**
 * Constrói ou recupera o relatório do consultor para um candidato específico
 */
export function buildReportForCandidate(cand: any): CandidatePsychometricResult {
  if (cand?.status !== "concluido" || !cand?.profile_data?.psychometrics) {
    throw new Error("Esta avaliação não possui um protocolo concluído para gerar relatório.");
  }
  const saved = cand.profile_data.psychometrics;
  const answers = cand.profile_data.answers;
  const seconds = cand.profile_data.elapsed_seconds ?? Number(saved.candidato?.tempoTotalMinutos) * 60;
  const recalculated = answers && Object.keys(answers).length === bancoQuestoes.length && Number.isFinite(seconds) && seconds > 0
    ? processAssessmentResults(answers, seconds, {
      id: cand.id, nome: cand.full_name, idade: calculateAssessmentAge(cand.birth_date),
      cargoPretendido: cand.desired_role || "Não informado",
    })
    : saved;
  return {
    ...recalculated,
    candidato: {
      ...recalculated.candidato,
      dataTeste: saved.candidato?.dataTeste ?? "Não informada",
      id: cand.id,
      nome: cand.full_name || "Não informado",
      nascimento: cand.birth_date ?? null,
      idade: calculateAssessmentAge(cand.birth_date),
      cargoAtual: cand.current_role || "Não informado",
      cargoPretendido: cand.desired_role || "Não informado",
      empresa: cand.company_name ?? null,
      externo: Boolean(cand.external),
    },
  };
}
