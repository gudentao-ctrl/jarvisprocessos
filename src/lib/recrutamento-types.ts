// src/lib/recrutamento-types.ts
// Tipagens centrais do módulo de Recrutamento & Seleção (ATS Kanban)

export type TipoContratacao = "CLT" | "PJ" | "Estágio" | "Temporário" | "Cooperado";

export type StatusVaga = "ABERTA" | "EM_PAUSA" | "ENCERRADA";

export interface Vaga {
  id: string;
  empresa_id?: string | null;
  empresa_nome?: string;
  titulo: string;
  descricao?: string;
  departamento?: string;
  tipo_contratacao: TipoContratacao;
  jornada: string;
  salario_min: number;
  salario_max: number;
  salario_combinar?: boolean;
  beneficios: string[];
  requisitos_formacao: string;
  experiencias_exigidas: string;
  ferramentas_obrigatorias: string[];
  soft_skills: string[];
  flyer_url?: string;
  status: StatusVaga;
  created_at: string;
  updated_at?: string;
}

export type StatusGlobalCandidato = "EM_PROCESSO" | "BANCO_TALENTOS" | "CONTRATADO";

export interface RecrutamentoCandidato {
  id: string;
  nome: string;
  cpf?: string;
  data_nascimento?: string;
  email?: string;
  telefone?: string;
  formacao?: string;
  experiencias?: string;
  ultimos_salarios?: string;
  pretensao_salarial?: number;
  ferramentas: string[];
  curriculo_url?: string;
  curriculo_nome?: string;
  curriculo_texto?: string;
  status_global: StatusGlobalCandidato;
  created_at: string;
  updated_at?: string;
}

export type EtapaKanban =
  | "ABERTURA"
  | "TRIAGEM"
  | "ENTREVISTA_CONSULTORIA"
  | "ANALISE_PERFIL"
  | "ALINHAMENTO_CONTRATANTE"
  | "ENTREVISTA_CONTRATANTE"
  | "FINALIZACAO_CONTRATADO"
  | "BANCO_TALENTOS";

export interface EtapaHistoricoItem {
  etapa: EtapaKanban;
  data: string;
  responsavel?: string;
  observacao?: string;
}

export interface ParecerConsultoria {
  experiencia: string;
  perfil_comportamental: string;
  nota_aderencia: number; // 0 a 10
  pontos_fortes?: string;
  pontos_atencao?: string;
  data_entrevista?: string;
  consultor_nome?: string;
}

export interface AnalisePerfilData {
  assessment_id?: string;
  token_teste?: string;
  status_teste: "PENDENTE" | "RESPONDIDO" | "DISPENSADO";
  fator_dominante?: string;
  disc_resumo?: string;
  big_five_resumo?: string;
  radar_scores?: Record<string, number>;
  recomendacao: "RECOMENDADO" | "RECOMENDADO_COM_RESSALVAS" | "NAO_RECOMENDADO";
  faixa_remuneracao_sugerida?: string;
  parecer_final_consultoria?: string;
  data_analise?: string;
}

export interface PropostaContratacao {
  remuneracao_mensal: number;
  tipo_contrato: TipoContratacao;
  jornada: string;
  beneficios_acordados: string[];
  data_inicio_prevista: string;
  observacoes_contratante?: string;
  proposta_pdf_url?: string;
  data_criacao_proposta?: string;
}

export interface AvaliacaoCliente {
  resultado: "APROVADO" | "REPROVADO" | "EM_NEGOCIACAO";
  data_entrevista?: string;
  avaliador_cliente?: string;
  feedback_cliente?: string;
  proposta_aceita?: boolean;
}

export interface CandidaturaFunil {
  id: string;
  vaga_id: string;
  candidato_id: string;
  etapa_kanban: EtapaKanban;
  historico_etapas: EtapaHistoricoItem[];
  parecer_consultoria?: ParecerConsultoria;
  analise_perfil?: AnalisePerfilData;
  proposta_contratacao?: PropostaContratacao;
  avaliacao_cliente?: AvaliacaoCliente;
  status: "ATIVO" | "REPROVADO" | "CONTRATADO";
  motivo_reprovacao?: string;
  devolutiva_enviada?: boolean;
  data_devolutiva?: string;
  created_at: string;
  updated_at: string;

  // Campos calculados / joins
  candidato?: RecrutamentoCandidato;
  vaga?: Vaga;
  matchScore?: number; // 0 a 100% de aderência estimada
}

export interface CandidatoMatchVaga {
  vaga: Vaga;
  score: number; // 0-100
  motivos: string[];
}
