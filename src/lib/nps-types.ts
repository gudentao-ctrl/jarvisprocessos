// src/lib/nps-types.ts
// Tipos TypeScript para o Módulo de NPS e eNPS (Bloco 26)

export type TipoPesquisa = "nps" | "enps";
export type StatusPesquisa = "ativa" | "inativa";
export type TipoResposta = "nps_score" | "rating" | "text_open" | "selecao_lista";

export interface ConfigVisualPesquisa {
  bg_color?: string;
  cor_fundo?: string;
  primary_color?: string;
  cor_primaria?: string;
  text_color?: string;
  cor_texto?: string;
  card_bg_color?: string;
  logo_url?: string;
  bg_image_url?: string;
  welcome_msg?: string;
  mensagem_boas_vindas?: string;
  thanks_msg?: string;
  mensagem_agradecimento?: string;
  permitir_anonimo?: boolean;
}

export interface PesquisaPergunta {
  id: string;
  pesquisa_id?: string;
  ordem: number;
  titulo_pergunta: string;
  tipo_resposta: TipoResposta;
  obrigatorio: boolean;
  placeholder?: string;
  opcoes_lista?: string[]; // Opções para perguntas do tipo 'selecao_lista'
}

export interface Pesquisa {
  id: string;
  empresa_id?: string | null;
  company_id?: string | null; // Alias para compatibilidade
  titulo: string;
  descricao?: string;
  tipo: TipoPesquisa;
  status: StatusPesquisa;
  url_hash: string;
  hash_publico?: string; // Alias para compatibilidade
  config_visual: ConfigVisualPesquisa;
  created_at: string;
  updated_at?: string;

  // Calculados
  perguntas?: PesquisaPergunta[];
  totalRespostas?: number;
  total_respostas?: number; // Alias para compatibilidade
  scoreNps?: number;
  score_nps?: number; // Alias para compatibilidade
  promotoresPct?: number;
  neutrosPct?: number;
  detratoresPct?: number;
  zonaClassificacao?: "Excelente" | "Muito Bom" | "Razoável" | "Crítico";
}

export interface PesquisaRespostaItem {
  id?: string;
  resposta_id?: string;
  pergunta_id: string;
  valor_nota?: number | null;
  valor_texto?: string | null;
}

export interface PesquisaResposta {
  id: string;
  pesquisa_id: string;
  session_id?: string;
  created_at: string;
  itens: PesquisaRespostaItem[];
}

export interface NpsRelatorioConsolidado {
  pesquisa: Pesquisa;
  zona: "Excelente" | "Muito Bom" | "Razoável" | "Crítico";
  totalRespostas: number;
  promotores: number;
  neutros: number;
  detratores: number;
  pctPromotores: number;
  pctNeutros: number;
  pctDetratores: number;
  perguntas: PesquisaPergunta[];
  questoesStats: Array<{
    perguntaTexto: string;
    tipo: string;
    totalRespostas: number;
    media: number | null;
    distribuicao: Record<string, number>;
  }>;
  feedbacksAbertos: Array<{ perguntaTexto: string; comentario: string; respondente?: string; data: string }>;
  totalRespondentes: number;
  scoreNps: number;
  promotoresCount: number;
  neutrosCount: number;
  detratoresCount: number;
  promotoresPct: number;
  neutrosPct: number;
  detratoresPct: number;
  distribuicaoNotas: Record<number, number>; // 0 a 10
  perguntasResultados: Array<{
    pergunta: PesquisaPergunta;
    mediaRating?: number;
    distribuicao?: Record<number, number>;
    comentariosTexto?: Array<{ texto: string; data: string }>;
  }>;
  respostasBrutas: Array<{
    id: string;
    data: string;
    respostas: Record<string, string | number>;
  }>;
}
