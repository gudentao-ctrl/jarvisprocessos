// src/lib/fives-types.ts
// Tipos TypeScript para o Módulo HUB 5S (Bloco 27)

export type Senso5S = "Seiri" | "Seiton" | "Seiso" | "Seiketsu" | "Shitsuke";

export const NOMES_SENSOS: Record<Senso5S, { nome: string; significado: string; cor: string }> = {
  Seiri: { nome: "Utilização", significado: "Separar o útil do inútil e descartar o excesso", cor: "#EF4444" },
  Seiton: { nome: "Organização", significado: "Um lugar para cada coisa e cada coisa no seu lugar", cor: "#F59E0B" },
  Seiso: { nome: "Limpeza", significado: "Eliminar a sujeira e inspecionar fontes de contaminação", cor: "#10B981" },
  Seiketsu: { nome: "Padronização", significado: "Manter as condições de higiene, saúde e normas visuais", cor: "#3B82F6" },
  Shitsuke: { nome: "Disciplina", significado: "Transformar os padrões em hábitos diários com autonomia", cor: "#8B5CF6" },
};

export type DestinacaoCartaoVermelho = "PENDENTE" | "DOACAO" | "SUCATA" | "RETORNO" | "LEILAO";

export type FrequenciaLimpeza = "Diária" | "Semanal" | "Quinzenal" | "Mensal";

export interface FivesRotinaLimpezaItem {
  id: string;
  item_local: string;
  procedimento: string;
  produto_epi: string;
  frequencia: FrequenciaLimpeza;
  responsavel: string;
}

export interface FivesComiteMembro {
  id: string;
  nome: string;
  cargo: string;
  papel_5s: "Coordenador Geral" | "Facilitador" | "Auditor Líder" | "Membro do Comitê";
  contato?: string;
  foto_url?: string;
}

export interface FivesConfiguracao {
  id: string;
  company_id: string;
  url_hash: string;
  logo_url?: string | null;
  header_banner_url?: string | null;
  slogan_campanha?: string | null;
  primary_color: string;
  secondary_color: string;
  bg_color: string;
  senso_destaque_mes?: string | null;
  comite_membros: FivesComiteMembro[];
  created_at?: string;
  updated_at?: string;
}

export interface FivesSetor {
  id: string;
  company_id: string;
  nome_setor: string;
  descricao?: string | null;
  guardiao_nome?: string | null;
  guardiao_user_id?: string | null;
  auditor_nome?: string | null;
  auditor_user_id?: string | null;
  meta_nota: number;
  created_at?: string;
  updated_at?: string;

  // Calculados
  ultima_nota?: number | null;
  historico_notas?: number[];
  selo?: "Ouro" | "Prata" | "Atencao";
  posicao_ranking?: number;
  tendencia?: "up" | "down" | "stable";
}

export interface FivesInstrucaoTrabalho {
  id: string;
  setor_id: string;
  titulo: string;
  documento_url?: string | null;
  foto_padrao_ouro_url?: string | null;
  rotina_limpeza: FivesRotinaLimpezaItem[];
  created_at?: string;
  updated_at?: string;
}

export interface FivesAuditoriaItem {
  id: string;
  auditoria_id?: string;
  senso: Senso5S;
  pergunta: string;
  nota: number; // 1 a 5
  foto_evidencia_url?: string | null;
  observacao?: string | null;
  plano_acao_o_que?: string | null;
  plano_acao_responsavel?: string | null;
  plano_acao_prazo?: string | null;
  plano_acao_status?: "PENDENTE" | "EM_ANDAMENTO" | "CONCLUIDO";
}

export interface FivesAuditoria {
  id: string;
  setor_id: string;
  company_id?: string;
  auditor_user_id?: string | null;
  auditor_nome?: string | null;
  data_auditoria: string;
  nota_final_percent: number;
  status_conclusao: string;
  observacoes_gerais?: string | null;
  created_at?: string;

  // Relações
  itens?: FivesAuditoriaItem[];
  setor?: FivesSetor;
}

export interface FivesDescarteCartaoVermelho {
  id: string;
  setor_id: string;
  item_descricao: string;
  localizacao?: string | null;
  foto_url?: string | null;
  data_limite?: string | null;
  destinacao_status: DestinacaoCartaoVermelho;
  destinacao_observacao?: string | null;
  created_at?: string;

  // Relação
  setor_nome?: string;
}

export interface FivesMuralFoto {
  id: string;
  setor_id?: string | null;
  company_id: string;
  titulo: string;
  descricao?: string | null;
  foto_antes_url: string;
  foto_depois_url: string;
  data_registro?: string;
  created_at?: string;

  // Relação
  setor_nome?: string;
}

export interface FivesEvento {
  id: string;
  company_id: string;
  setor_id?: string | null;
  titulo: string;
  descricao?: string | null;
  tipo: "DIA_D" | "AUDITORIA_CRUZADA" | "TREINAMENTO" | "COMITE";
  data_evento: string;
  horario?: string | null;
  responsavel?: string | null;
  concluido: boolean;
  created_at?: string;

  // Relação
  setor_nome?: string;
}

export interface FivesRadarDataPoint {
  senso: Senso5S;
  nome: string;
  score: number; // 0 a 100%
  fullMark: 100;
}

export interface FivesPortalData {
  config: FivesConfiguracao;
  company: {
    id: string;
    name: string;
    logo_url?: string | null;
    primary_color?: string;
    secondary_color?: string;
    bg_color?: string;
  };
  setores: FivesSetor[];
  auditoriasRecentes: FivesAuditoria[];
  radarData: FivesRadarDataPoint[];
  kpis: {
    setorCampeao: FivesSetor | null;
    notaMediaGlobal: number;
    sensoDestaqueMes: string;
    totalAuditorias: number;
    totalDescartes: number;
    totalPlanosAcao: number;
  };
  muralFotos: FivesMuralFoto[];
  instrucoesTrabalho: Record<string, FivesInstrucaoTrabalho>;
  cartoesVermelhos: FivesDescarteCartaoVermelho[];
  eventos: FivesEvento[];
}
