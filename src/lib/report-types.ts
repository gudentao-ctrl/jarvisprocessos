export type PeriodPreset =
  | "today"
  | "last7"
  | "last15"
  | "last30"
  | "this_month"
  | "last_month"
  | "quarter"
  | "custom";

export type ChartKey =
  // Planos de ação
  | "actions_by_status"
  | "actions_by_priority"
  | "actions_by_responsible"
  | "actions_by_process"
  | "actions_evolution"
  | "actions_completion"
  // Indicadores
  | "indicators_evolution"
  | "indicators_target_vs_actual"
  | "indicators_below_target"
  | "indicators_no_collection"
  // Horas
  | "hours_by_week"
  | "hours_by_month"
  | "hours_by_activity"
  | "hours_by_process"
  // Cronoanálise
  | "crono_value_added"
  // Consultoria
  | "consulting_activity";

export type BlockType =
  | "summary"           // AI executive summary
  | "kpis"              // Consulting KPIs cards
  | "actions_info"      // Auto info: plans created/done/late
  | "indicators_info"   // Auto info: below target, no collection, evolution
  | "agenda_info"       // Meetings
  | "hours_info"        // Total + distribution
  | "crono_info"        // Wastes and gains
  | "improvements_info" // Improvements applied/pending
  | "chart"             // A rendered chart from ChartKey
  | "recommendations"   // AI: bottlenecks, risks, next steps
  | "text"              // Custom text/observations
  | "image"             // Photo before/after
  | "table";            // Custom table

export type ReportBlock = {
  id: string;
  type: BlockType;
  title: string;
  enabled: boolean;
  // Payload varies by type:
  chartKey?: ChartKey;
  content?: string;         // markdown text
  imageDataUrl?: string;    // for image blocks
  imageCaption?: string;
  tableRows?: string[][];   // for table blocks (first row = headers)
};

export type ReportPeriod = {
  preset: PeriodPreset;
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
};

export type ReportNarrative = {
  resumo_executivo: string;
  gargalos: string[];
  riscos: string[];
  oportunidades: string[];
  proximos_passos: string[];
  recomendacoes: string[];
};
