import { supabase } from "@/integrations/supabase/client";

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
          "A infraestrutura, organização, segurança e condições de trabalho são adequadas?",
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

export interface DREItem {
  id: string;
  label: string;
  amount: number;
  isCustom?: boolean;
}

export interface MonthlyDRERecord {
  id: string;
  company_id: string;
  month_year: string; // "YYYY-MM"
  mode: "realizado" | "orcado";
  receita_bruta_items: DREItem[];
  deducoes_items: DREItem[];
  custos_variaveis_items: DREItem[];
  custos_fixos_items: DREItem[];
  // Campos calculados
  total_receita_bruta: number;
  total_deducoes: number;
  receita_liquida: number;
  total_custos_variaveis: number;
  margem_contribuicao: number;
  margem_contribuicao_pct: number;
  total_custos_fixos: number;
  lucro_operacional: number;
  lucro_operacional_pct: number;
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

const STORAGE_KEYS = {
  MATURITY: "jarvis_maturity_records_v1",
  DRE: "jarvis_dre_records_v1",
  ROADMAP: "jarvis_roadmap_cockpit_v1",
};

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

export function getMaturityRecordsFromStorage(companyId: string): MonthlyMaturityRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.MATURITY);
    if (!raw) return [];
    const list: MonthlyMaturityRecord[] = JSON.parse(raw);
    return list.filter((r) => r.company_id === companyId);
  } catch (err) {
    console.error("Error reading maturity storage:", err);
    return [];
  }
}

export function saveMaturityRecord(record: MonthlyMaturityRecord): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.MATURITY);
    const list: MonthlyMaturityRecord[] = raw ? JSON.parse(raw) : [];
    const idx = list.findIndex(
      (r) => r.company_id === record.company_id && r.month_year === record.month_year
    );
    if (idx >= 0) {
      list[idx] = { ...record, updated_at: new Date().toISOString() };
    } else {
      list.push({ ...record, updated_at: new Date().toISOString() });
    }
    localStorage.setItem(STORAGE_KEYS.MATURITY, JSON.stringify(list));
  } catch (err) {
    console.error("Error saving maturity record:", err);
  }
}

// -------------------------------------------------------------
// DRE GERENCIAL (Bloco 16 - Parte 2)
// -------------------------------------------------------------

export function calculateDREMetrics(
  receita_bruta: DREItem[],
  deducoes: DREItem[],
  custos_var: DREItem[],
  custos_fix: DREItem[]
) {
  const total_receita_bruta = receita_bruta.reduce((acc, i) => acc + (Number(i.amount) || 0), 0);
  const total_deducoes = deducoes.reduce((acc, i) => acc + (Number(i.amount) || 0), 0);
  const receita_liquida = Math.max(0, total_receita_bruta - total_deducoes);

  const total_custos_variaveis = custos_var.reduce((acc, i) => acc + (Number(i.amount) || 0), 0);
  const margem_contribuicao = receita_liquida - total_custos_variaveis;
  const margem_contribuicao_pct =
    receita_liquida > 0 ? (margem_contribuicao / receita_liquida) * 100 : 0;

  const total_custos_fixos = custos_fix.reduce((acc, i) => acc + (Number(i.amount) || 0), 0);
  const lucro_operacional = margem_contribuicao - total_custos_fixos;
  const lucro_operacional_pct =
    receita_liquida > 0 ? (lucro_operacional / receita_liquida) * 100 : 0;

  return {
    total_receita_bruta,
    total_deducoes,
    receita_liquida,
    total_custos_variaveis,
    margem_contribuicao,
    margem_contribuicao_pct: Number(margem_contribuicao_pct.toFixed(2)),
    total_custos_fixos,
    lucro_operacional,
    lucro_operacional_pct: Number(lucro_operacional_pct.toFixed(2)),
  };
}

export function getDefaultDRERecord(
  companyId: string,
  monthYear: string,
  mode: "realizado" | "orcado" = "realizado"
): MonthlyDRERecord {
  const receita_bruta_items: DREItem[] = [
    { id: "rb_1", label: "Venda de Mercadorias / Produtos", amount: 145000 },
    { id: "rb_2", label: "Prestação de Serviços / Contratos", amount: 85000 },
  ];
  const deducoes_items: DREItem[] = [
    { id: "dd_1", label: "Impostos s/ Vendas (Simples / ICMS / ISS)", amount: 18400 },
    { id: "dd_2", label: "Devoluções e Descontos Concedidos", amount: 2600 },
  ];
  const custos_variaveis_items: DREItem[] = [
    { id: "cv_1", label: "Custos com Matéria-Prima / Insumos (CMV)", amount: 62000 },
    { id: "cv_2", label: "Comissões da Equipe Comercial", amount: 9200 },
    { id: "cv_3", label: "Taxas de Cartão & Plataformas de Cobrança", amount: 4800 },
    { id: "cv_4", label: "Fretes e Logística de Entrega", amount: 3500 },
  ];
  const custos_fixos_items: DREItem[] = [
    { id: "cf_1", label: "Folha de Pagamento & Encargos (Equipe)", amount: 52000 },
    { id: "cf_2", label: "Pró-Labore dos Sócios / Diretoria", amount: 18000 },
    { id: "cf_3", label: "Aluguel, Condomínio & Infraestrutura", amount: 8500 },
    { id: "cf_4", label: "Sistemas, Licenças & Softwares", amount: 3200 },
    { id: "cf_5", label: "Despesas Administrativas & Contabilidade", amount: 4500 },
    { id: "cf_6", label: "Marketing, Tráfego & Publicidade", amount: 6000 },
  ];

  const metrics = calculateDREMetrics(
    receita_bruta_items,
    deducoes_items,
    custos_variaveis_items,
    custos_fixos_items
  );

  return {
    id: `${companyId}_${monthYear}_${mode}`,
    company_id: companyId,
    month_year: monthYear,
    mode,
    receita_bruta_items,
    deducoes_items,
    custos_variaveis_items,
    custos_fixos_items,
    ...metrics,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export function getDRERecordsFromStorage(companyId: string): MonthlyDRERecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DRE);
    if (!raw) return [];
    const list: MonthlyDRERecord[] = JSON.parse(raw);
    return list.filter((r) => r.company_id === companyId);
  } catch (err) {
    console.error("Error reading DRE storage:", err);
    return [];
  }
}

export function saveDRERecord(record: MonthlyDRERecord): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.DRE);
    const list: MonthlyDRERecord[] = raw ? JSON.parse(raw) : [];
    const idx = list.findIndex(
      (r) =>
        r.company_id === record.company_id &&
        r.month_year === record.month_year &&
        r.mode === record.mode
    );
    if (idx >= 0) {
      list[idx] = { ...record, updated_at: new Date().toISOString() };
    } else {
      list.push({ ...record, updated_at: new Date().toISOString() });
    }
    localStorage.setItem(STORAGE_KEYS.DRE, JSON.stringify(list));
  } catch (err) {
    console.error("Error saving DRE record:", err);
  }
}

/**
 * Clona o DRE do mês anterior para o mês alvo
 */
export function clonePreviousMonthDRE(
  companyId: string,
  targetMonthYear: string,
  mode: "realizado" | "orcado" = "realizado"
): MonthlyDRERecord | null {
  const records = getDRERecordsFromStorage(companyId).filter((r) => r.mode === mode);
  if (records.length === 0) return null;

  // Encontra o mês anterior mais próximo
  const sorted = records
    .filter((r) => r.month_year < targetMonthYear)
    .sort((a, b) => b.month_year.localeCompare(a.month_year));

  const source = sorted[0] || records[0];
  if (!source) return null;

  const cloned: MonthlyDRERecord = {
    ...source,
    id: `${companyId}_${targetMonthYear}_${mode}`,
    month_year: targetMonthYear,
    receita_bruta_items: source.receita_bruta_items.map((i) => ({ ...i, id: crypto.randomUUID() })),
    deducoes_items: source.deducoes_items.map((i) => ({ ...i, id: crypto.randomUUID() })),
    custos_variaveis_items: source.custos_variaveis_items.map((i) => ({ ...i, id: crypto.randomUUID() })),
    custos_fixos_items: source.custos_fixos_items.map((i) => ({ ...i, id: crypto.randomUUID() })),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  saveDRERecord(cloned);
  return cloned;
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

export function getRoadmapCockpitFromStorage(
  companyId: string,
  companyName: string = "Empresa"
): RoadmapCockpitData {
  if (typeof window === "undefined") return getDefaultRoadmapCockpitData(companyId, companyName);
  try {
    const raw = localStorage.getItem(`${STORAGE_KEYS.ROADMAP}_${companyId}`);
    if (!raw) {
      const defaultData = getDefaultRoadmapCockpitData(companyId, companyName);
      localStorage.setItem(`${STORAGE_KEYS.ROADMAP}_${companyId}`, JSON.stringify(defaultData));
      return defaultData;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.error("Error reading roadmap cockpit storage:", err);
    return getDefaultRoadmapCockpitData(companyId, companyName);
  }
}

export function saveRoadmapCockpitToStorage(data: RoadmapCockpitData): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      `${STORAGE_KEYS.ROADMAP}_${data.company_id}`,
      JSON.stringify({ ...data, last_updated: new Date().toISOString() })
    );
  } catch (err) {
    console.error("Error saving roadmap cockpit storage:", err);
  }
}
