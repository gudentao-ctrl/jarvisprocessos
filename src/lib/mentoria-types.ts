export interface MentoriaDiagnostico {
  abertura_processo: number; // 0..5
  autoconhecimento: number;  // 0..5
  autoconfianca: number;     // 0..5
  nivel_estresse: number;    // 0..5
  engajamento: number;       // 0..5
  ansiedade: number;         // 0..5
  aplicacao_aprendizados: number; // 0..5
  media_nota: number;        // Média automática (0..5)
}

export interface MentoriaAcao {
  id: string;
  texto: string;
  concluida: boolean;
  prazo?: string;
}

export interface MentoriaSessao {
  id: string;
  mentoria_id: string;
  data_atendimento: string; // YYYY-MM-DD
  horas: number;
  resumo: string;
  acoes: MentoriaAcao[];
  pontos_atencao: string;
  pontos_informe: string;
  diagnostico: MentoriaDiagnostico;
  created_at: string;
  updated_at?: string;
}

export interface MentoriaBehavioralProfile {
  dominant_factor?: string;
  radar?: Array<{ factor?: string; name: string; value: number }>;
  ai_summary?: {
    natural?: string;
    strengths?: string;
    ideal_env?: string;
    blind_spots?: string;
  };
  pdf_attachment_url?: string;
  pdf_attachment_name?: string;
  candidate_id?: string;
}

export interface Mentorado {
  id: string;
  company_id: string | null;
  candidate_id?: string | null;
  nome: string;
  cargo: string;
  idade: number;
  formacao: string;
  telefone: string;
  email: string;
  status: "ativa" | "inativa";
  behavioral_profile?: MentoriaBehavioralProfile;
  parecer_final?: string;
  relatorio_final_url?: string;
  finalizada_em?: string;
  created_at: string;
  updated_at?: string;

  // KPIs calculados
  sessoes?: MentoriaSessao[];
  totalAtendimentos?: number;
  totalHoras?: number;
  totalAcoes?: number;
  acoesConcluidas?: number;
  mediaAvanco?: number;
  sparklineNotas?: number[];
}
