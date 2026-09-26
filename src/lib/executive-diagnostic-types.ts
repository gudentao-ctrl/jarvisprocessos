export const EXECUTIVE_PILLARS = [
  { key: "clareza_objetivos", label: "Clareza dos objetivos da empresa" },
  { key: "relacionamento_comunicacao", label: "Relacionamento interpessoal e comunicação" },
  { key: "remuneracao_reconhecimento", label: "Sistemas de remuneração, recompensas e reconhecimento" },
  { key: "estrutura_fisica_pessoas", label: "Análise da estrutura física e de pessoas" },
  { key: "estilo_lideranca", label: "Estilo e impacto da liderança" },
  { key: "processos_qualidade", label: "Processos e qualidade" },
] as const;

export type ExecutivePillarKey = typeof EXECUTIVE_PILLARS[number]["key"];

export type ExecutivePillar = {
  positivos: string[];
  problemas: string[];
  intervencoes: string[];
};

export type ExecutiveDiagnosticContent = {
  resumo?: string;
  pilares?: Record<ExecutivePillarKey, ExecutivePillar>;
  included_sections?: string[];
  principais_dores?: string[];
  causas_sistemicas?: string[];
  processos_criticos?: string[];
  gargalos?: string[];
  riscos?: string[];
  oportunidades?: string[];
  projetos_recomendados?: Array<{ nome: string; descricao: string; prazo: string }>;
};