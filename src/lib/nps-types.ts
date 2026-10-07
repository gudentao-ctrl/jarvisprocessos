// src/lib/nps-types.ts
// Tipos TypeScript para o Módulo de NPS e eNPS (Bloco 26)

export type TipoPesquisa = "nps" | "enps";
export type StatusPesquisa = "ativa" | "inativa";
export type TipoResposta = "nps_score" | "rating" | "text_open";

export interface ConfigVisualPesquisa {
  bg_color: string;
  primary_color: string;
  text_color: string;
  card_bg_color: string;
  logo_url?: string;
  bg_image_url?: string;
  welcome_msg: string;
  thanks_msg: string;
}

export interface PesquisaPergunta {
  id: string;
  pesquisa_id?: string;
  ordem: number;
  titulo_pergunta: string;
  tipo_resposta: TipoResposta;
  obrigatorio: boolean;
  placeholder?: string;
}

export interface Pesquisa {
  id: string;
  empresa_id?: string | null;
  titulo: string;
  descricao?: string;
  tipo: TipoPesquisa;
  status: StatusPesquisa;
  url_hash: string;
  config_visual: ConfigVisualPesquisa;
  created_at: string;
  updated_at?: string;

  // Calculados
  perguntas?: PesquisaPergunta[];
  totalRespostas?: number;
  scoreNps?: number;
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
