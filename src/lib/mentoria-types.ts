// src/lib/mentoria-types.ts
// Tipagens centrais do módulo de Mentorias & Atendimentos no Hub de Pessoas

export interface MentoriaDiagnostico {
  abertura_processo: number; // 1..5
  engajamento_processo: number; // 1..5
  autoconhecimento: number; // 1..5
  equilibrio_emocional: number; // 1..5
  autoconfianca: number; // 1..5
  aplicacao_aprendizados: number; // 1..5
  media_nota: number; // Média automática dos 6 pilares (1..5)
  evolucao_percebida?: number; // 1..5 (Evolução percebida em relação ao início)

  // Campos legados para retrocompatibilidade
  nivel_estresse?: number;
  engajamento?: number;
  ansiedade?: number;
}

export type MentoriaAcaoStatus = "Pendente" | "Concluída" | "Parcial" | "Não realizada";

export interface MentoriaAcao {
  id: string;
  texto: string;
  concluida: boolean;
  prazo?: string;
  status?: MentoriaAcaoStatus; // 'Pendente' | 'Concluída' | 'Parcial' | 'Não realizada'
  resultado_aprendizado?: string; // Como foi a execução da tarefa e aprendizados
}

export interface MentoriaSessao {
  id: string;
  mentoria_id: string;
  data_atendimento: string; // YYYY-MM-DD
  horas: number;
  objetivo_sessao?: string; // NOVO: Objetivo da sessão
  resumo: string; // Resumo do Atendimento (Temas e Tópicos Abordados)
  acoes: MentoriaAcao[];

  // NOVO BLOCO: Registro da Mentora (Grid 2x2)
  avancos_observados?: string; // 1. Principais avanços observados
  pontos_desenvolvimento?: string; // 2. Pontos que ainda demandam desenvolvimento
  evidencias_comportamentais?: string; // 3. Evidências comportamentais observadas
  foco_proxima_sessao?: string; // 4. Foco recomendado para a próxima sessão

  // Campos legados mantidos para compatibilidade
  pontos_atencao?: string;
  pontos_informe?: string;

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
