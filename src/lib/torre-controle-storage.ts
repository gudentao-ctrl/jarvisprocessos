
export const PILARES_MATURIDADE = [
  {
    id: 1,
    nome: "Clareza de Objetivos",
    descricao: "Direcionamento estratégico, metas e prioridades comunicadas.",
    perguntas: [
      {
        id: 1,
        texto:
          "Os donos/diretoria possuem direcionamento estratégico claro, evitando mudanças abruptas e comunicando as prioridades?",
      },
      {
        id: 2,
        texto:
          "As metas da empresa são bem definidas e as equipes sabem o que precisam entregar para alcançá-las?",
      },
    ],
  },
  {
    id: 2,
    nome: "Relacionamento e Comunicação",
    descricao: "Fluxo de informação intersetorial e clima colaborativo.",
    perguntas: [
      {
        id: 3,
        texto:
          "A comunicação entre os setores e os repasses de informação ocorrem de forma estruturada e sem omissões?",
      },
      {
        id: 4,
        texto:
          "O ambiente de trabalho é profissional e colaborativo, sem conflitos tóxicos ou informalidade excessiva?",
      },
    ],
  },
  {
    id: 3,
    nome: "Remuneração e Reconhecimento",
    descricao: "Políticas de recompensa, valorização técnica e justiça percebida.",
    perguntas: [
      {
        id: 5,
        texto:
          "O modelo salarial e de comissões/benefícios é adequado, claro e percebido como justo?",
      },
      {
        id: 6,
        texto:
          "Existem critérios transparentes para reconhecer e valorizar o bom desempenho e a evolução técnica dos colaboradores?",
      },
    ],
  },
  {
    id: 4,
    nome: "Estrutura Física e Pessoas",
    descricao: "Dimensionamento de equipes, ferramental e ergonomia/espaço.",
    perguntas: [
      {
        id: 7,
        texto:
          "O quadro de pessoas está dimensionado corretamente e a equipe possui as ferramentas e sistemas necessários?",
      },
      {
        id: 8,
        texto:
          "A infraestrutura física, organização, segurança e condições de trabalho são adequadas?",
      },
    ],
  },
  {
    id: 5,
    nome: "Estilo e Impacto da Liderança",
    descricao: "Delegação sem microgestão, suporte e firmeza executiva.",
    perguntas: [
      {
        id: 9,
        texto:
          "Os donos e gestores atuam de forma profissional, delegando responsabilidades sem centralização excessiva ou microgerenciamento?",
      },
      {
        id: 10,
        texto:
          "A liderança cobra resultados com firmeza, mas oferece apoio, treinamento e feedbacks construtivos?",
      },
    ],
  },
  {
    id: 6,
    nome: "Processos e Qualidade",
    descricao: "Padronização de fluxos, controles internos e rigor na entrega.",
    perguntas: [
      {
        id: 11,
        texto:
          "Os processos e controles internos (operacionais e financeiros) estão padronizados, documentados e são seguidos com rigor?",
      },
      {
        id: 12,
        texto:
          "A execução do serviço ou a qualidade do produto final atinge o padrão exigido, com baixo índice de erros ou retrabalho?",
      },
    ],
  },
];

export interface MonthlyMaturityRecord {
  id: string;
  company_id: string;
  month_year: string; // "YYYY-MM"
  answers: Record<number, number>; // questionId (1-12) -> score (1-5)
  pilar_averages: Record<number, number>; // pilarId (1-6) -> avg
  global_average: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface RoadmapCockpitData {
  company_id: string;
  last_updated: string;
  kpis: {
    revenue_growth_pct: number;
    revenue_growth_note: string;
    maturity_growth_pct: number;
    maturity_growth_note: string;
    cost_reduction_pct: number;
    cost_reduction_note: string;
    roi_multiplier: number;
  };
  iceberg: {
    surface_symptoms: Array<{
      id: string;
      text: string;
      severity: "critica" | "alta" | "media";
    }>;
    underwater_milestones: Array<{
      id: string;
      front: "Financeiro / Comercial" | "Processos / BPM" | "Pessoas / Cultura";
      title: string;
      impact: string;
      status: "resolvido" | "em_andamento";
    }>;
  };
  radar_360: {
    initial_month_label: string;
    current_month_label: string;
    pilars: Array<{
      pilar: string;
      shortName: string;
      donos: number;
      gestao: number;
      colaboradores: number;
      mes_inicial: number;
      mes_atual: number;
    }>;
    gaps_narrative: string;
  };
  roi_timeline: Array<{
    period: string;
    revenue: number;
    costs: number;
    profit: number;
    intervention_pin?: {
      title: string;
      front: string;
      description: string;
    };
  }>;
}
// -------------------------------------------------------------
// MATURIDADE DA EMPRESA (Bloco 16 - Parte 1)
// -------------------------------------------------------------

export function calculateMaturityAverages(answers: Record<number, number>) {
  const pilar_averages: Record<number, number> = {};
  let totalSum = 0;
  let totalCount = 0;

  PILARES_MATURIDADE.forEach((pilar) => {
    let pilarSum = 0;
    let pilarCount = 0;
    pilar.perguntas.forEach((q) => {
      const val = answers[q.id] || 3;
      pilarSum += val;
      pilarCount += 1;
      totalSum += val;
      totalCount += 1;
    });
    pilar_averages[pilar.id] = Number((pilarSum / (pilarCount || 1)).toFixed(2));
  });

  const global_average = totalCount > 0 ? Number((totalSum / totalCount).toFixed(2)) : 3.0;
  return { pilar_averages, global_average };
}

export function getDefaultMaturityRecord(companyId: string, monthYear: string): MonthlyMaturityRecord {
  const defaultAnswers: Record<number, number> = {
    1: 3, 2: 3, 3: 3, 4: 3, 5: 3, 6: 3,
    7: 3, 8: 3, 9: 3, 10: 3, 11: 3, 12: 3,
  };
  const { pilar_averages, global_average } = calculateMaturityAverages(defaultAnswers);
  return {
    id: `${companyId}_${monthYear}`,
    company_id: companyId,
    month_year: monthYear,
    answers: defaultAnswers,
    pilar_averages,
    global_average,
    notes: "",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

// -------------------------------------------------------------
// ROADMAP COCKPIT DE GESTÃO À VISTA (Bloco 15)
// -------------------------------------------------------------

export function getDefaultRoadmapCockpitData(
  companyId: string,
  companyName: string = "Empresa"
): RoadmapCockpitData {
  return {
    company_id: companyId,
    last_updated: new Date().toISOString(),
    kpis: {
      revenue_growth_pct: 28.4,
      revenue_growth_note: "+R$ 52.000 no faturamento mensal frente ao diagnóstico",
      maturity_growth_pct: 42.5,
      maturity_growth_note: "Evolução de 2.4/5 para 3.6/5 no Sincronismo 360°",
      cost_reduction_pct: 18.2,
      cost_reduction_note: "R$ 21.400/mês economizados em renegociações e processos",
      roi_multiplier: 4.8,
    },
    iceberg: {
      surface_symptoms: [
        {
          id: "s1",
          text: "Sensação constante de apagar incêndios e falta de tempo dos donos",
          severity: "critica",
        },
        {
          id: "s2",
          text: "Falta de previsibilidade do fluxo de caixa e margem real desconhecida",
          severity: "critica",
        },
        {
          id: "s3",
          text: "Equipe sobrecarregada, retrabalho contínuo e atrasos na entrega",
          severity: "alta",
        },
        {
          id: "s4",
          text: "Centralização extrema de decisões na diretoria sem delegação",
          severity: "alta",
        },
        {
          id: "s5",
          text: "Desalinhamento entre metas comerciais e capacidade operacional",
          severity: "media",
        },
      ],
      underwater_milestones: [
        {
          id: "m1",
          front: "Financeiro / Comercial",
          title: "Implantação da DRE Gerencial & Revisão de Precificação",
          impact: "Margem de contribuição ajustada de 38% para 49% e fim de produtos deficitários.",
          status: "resolvido",
        },
        {
          id: "m2",
          front: "Processos / BPM",
          title: "Mapeamento TO BE e Padronização dos Fluxos Principais",
          impact: "Redução de 45% nos tempos de ciclo operacional e eliminação de retrabalhos críticos.",
          status: "resolvido",
        },
        {
          id: "m3",
          front: "Pessoas / Cultura",
          title: "Mapeamento Psicométrico (Big Five + DISC) & Reorganização de Papéis",
          impact: "Alocação precisa de talentos por aptidão comportamental e estruturação de líderes.",
          status: "resolvido",
        },
        {
          id: "m4",
          front: "Financeiro / Comercial",
          title: "Renegociação de Fornecedores Chave e Enxugamento de Custos Fixos",
          impact: "Economia recorrente de R$ 21.400 mensais no ponto de equilíbrio.",
          status: "resolvido",
        },
        {
          id: "m5",
          front: "Processos / BPM",
          title: "Elaboração e Homologação de POPs (Procedimentos Operacionais)",
          impact: "Treinamento de 100% da operação e autonomia das equipes em tarefas diárias.",
          status: "em_andamento",
        },
        {
          id: "m6",
          front: "Pessoas / Cultura",
          title: "Rituais de Gestão à Vista e Alinhamento Semanal de Indicadores",
          impact: "Eliminação do ruído de comunicação e prestação de contas objetiva por setor.",
          status: "em_andamento",
        },
      ],
    },
    radar_360: {
      initial_month_label: "Diagnóstico Inicial (Mês 1)",
      current_month_label: "Acompanhamento Atual (Mês 3)",
      pilars: [
        {
          pilar: "Clareza de Objetivos",
          shortName: "Objetivos",
          donos: 4.5,
          gestao: 3.4,
          colaboradores: 2.2,
          mes_inicial: 2.3,
          mes_atual: 3.8,
        },
        {
          pilar: "Relacionamento e Comunicação",
          shortName: "Comunicação",
          donos: 4.0,
          gestao: 3.1,
          colaboradores: 2.5,
          mes_inicial: 2.4,
          mes_atual: 3.5,
        },
        {
          pilar: "Remuneração e Reconhecimento",
          shortName: "Remuneração",
          donos: 4.2,
          gestao: 2.8,
          colaboradores: 2.0,
          mes_inicial: 2.1,
          mes_atual: 3.4,
        },
        {
          pilar: "Estrutura Física e Pessoas",
          shortName: "Pessoas",
          donos: 3.8,
          gestao: 3.0,
          colaboradores: 2.6,
          mes_inicial: 2.5,
          mes_atual: 3.7,
        },
        {
          pilar: "Estilo e Liderança",
          shortName: "Liderança",
          donos: 4.6,
          gestao: 3.2,
          colaboradores: 2.4,
          mes_inicial: 2.2,
          mes_atual: 3.6,
        },
        {
          pilar: "Processos e Qualidade",
          shortName: "Processos",
          donos: 3.5,
          gestao: 2.6,
          colaboradores: 2.1,
          mes_inicial: 2.0,
          mes_atual: 3.9,
        },
      ],
      gaps_narrative:
        "O maior gap de percepção organizacional concentra-se em Clareza de Objetivos (Donos: 4.5 vs Colaboradores: 2.2) e Remuneração (Donos: 4.2 vs Colaboradores: 2.0). A consultoria já elevou a média global de maturidade de 2.2 para 3.7 através do alinhamento de metas e estruturação dos rituais de liderança.",
    },
    roi_timeline: [
      {
        period: "Mês 1 (Diagnóstico)",
        revenue: 175000,
        costs: 162000,
        profit: 13000,
        intervention_pin: {
          title: "Raio-X Inicial & Apuração do Ponto de Equilíbrio",
          front: "Financeiro",
          description: "Descoberta de margem real e corte de despesas supérfluas.",
        },
      },
      {
        period: "Mês 2 (Fase TO BE)",
        revenue: 192000,
        costs: 154000,
        profit: 38000,
        intervention_pin: {
          title: "Revisão da Precificação & Mapeamento de Gargalos",
          front: "Comercial & BPM",
          description: "Fim de contratos deficitários e eliminação de retrabalhos.",
        },
      },
      {
        period: "Mês 3 (Execução)",
        revenue: 218000,
        costs: 148000,
        profit: 70000,
        intervention_pin: {
          title: "Reorganização de Equipe & Implantação de POPs",
          front: "Pessoas & Processos",
          description: "Aumento de 35% na capacidade produtiva com o mesmo time.",
        },
      },
      {
        period: "Mês 4 (Consolidação)",
        revenue: 235000,
        costs: 145000,
        profit: 90000,
        intervention_pin: {
          title: "Gestão à Vista & Alavancagem Comercial",
          front: "Estratégia",
          description: "Previsibilidade de caixa e expansão da carteira lucrativa.",
        },
      },
    ],
  };
}
// -------------------------------------------------------------
// SINCRONIZAÇÃO COM DADOS REAIS (DRE + Maturidade salvos no banco)
// -------------------------------------------------------------

export interface DreSummaryForCockpit {
  month_year: string;
  receitaBruta: number;
  custos: number;
  resultado: number;
  margemContribuicaoPct: number;
}

export function enrichCockpitWithTorreInputs(
  baseData: RoadmapCockpitData,
  dreRealizados: DreSummaryForCockpit[],
  maturityRecords: MonthlyMaturityRecord[],
): RoadmapCockpitData {
  const result: RoadmapCockpitData = {
    ...baseData,
    kpis: { ...baseData.kpis },
    radar_360: {
      ...baseData.radar_360,
      pilars: baseData.radar_360.pilars.map((p) => ({ ...p })),
    },
    roi_timeline: [...baseData.roi_timeline],
  };

  const maturity = [...maturityRecords].sort((a, b) => a.month_year.localeCompare(b.month_year));
  if (maturity.length > 0) {
    const earliest = maturity[0];
    const latest = maturity[maturity.length - 1];
    result.radar_360.initial_month_label = `Diagnóstico (${earliest.month_year})`;
    result.radar_360.current_month_label = `Mês Atual (${latest.month_year})`;
    result.radar_360.pilars = result.radar_360.pilars.map((p, idx) => {
      const pilarId = idx + 1;
      return {
        ...p,
        mes_inicial: earliest.pilar_averages[pilarId] ?? p.mes_inicial,
        mes_atual: latest.pilar_averages[pilarId] ?? p.mes_atual,
      };
    });
    const initAvg = earliest.global_average || 1;
    const currAvg = latest.global_average || 1;
    const growth = Number((((currAvg - initAvg) / initAvg) * 100).toFixed(1));
    result.kpis.maturity_growth_pct = Math.max(0, growth);
    result.kpis.maturity_growth_note = `Evolução de ${initAvg.toFixed(1)}/5 para ${currAvg.toFixed(1)}/5 no Sincronismo 360°`;
  }

  const dre = [...dreRealizados].sort((a, b) => a.month_year.localeCompare(b.month_year));
  if (dre.length >= 2) {
    const earliest = dre[0];
    const latest = dre[dre.length - 1];
    if (earliest.receitaBruta > 0) {
      result.kpis.revenue_growth_pct = Number(
        (((latest.receitaBruta - earliest.receitaBruta) / earliest.receitaBruta) * 100).toFixed(1),
      );
      const diff = latest.receitaBruta - earliest.receitaBruta;
      result.kpis.revenue_growth_note = `${diff >= 0 ? "+" : "-"}R$ ${Math.abs(diff).toLocaleString("pt-BR")} no faturamento mensal frente ao diagnóstico`;
      if (earliest.custos > 0) {
        const costDiffPct = Number((((earliest.custos - latest.custos) / earliest.custos) * 100).toFixed(1));
        result.kpis.cost_reduction_pct = Math.max(0, costDiffPct);
      }
    }
    result.roi_timeline = dre.map((d, idx) => ({
      period: d.month_year,
      revenue: d.receitaBruta,
      costs: d.custos,
      profit: d.resultado,
      intervention_pin: baseData.roi_timeline[idx]?.intervention_pin || {
        title: `Fechamento ${d.month_year}`,
        front: "Financeiro",
        description: `Margem de Contribuição: ${d.margemContribuicaoPct}%`,
      },
    }));
  }
  return result;
}
