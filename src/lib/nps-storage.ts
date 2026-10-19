import { supabase } from "@/integrations/supabase/client";
import {
  Pesquisa,
  PesquisaPergunta,
  PesquisaResposta,
  PesquisaRespostaItem,
  NpsRelatorioConsolidado,
  ConfigVisualPesquisa,
} from "./nps-types";

export const NPS_REALTIME_CHANNEL = "maia_nps_sync_hub_v1";

// ---------------------------------------------------------------------------
// GERAÇÃO E RESOLUÇÃO DE LINKS PÚBLICOS DE PESQUISA (NPS / eNPS)
// ---------------------------------------------------------------------------
export function compressSurveyToHash(survey: Partial<Pesquisa>): string {
  return survey.url_hash || survey.hash_publico || survey.id || "";
}

export function decompressSurveyFromHash(_hash: string): Pesquisa | null {
  return null;
}

export function generatePublicSurveyLink(pesquisa: Pesquisa, origin?: string): string {
  const base = origin || (typeof window !== "undefined" ? window.location.origin : "");
  const hash = pesquisa.url_hash || pesquisa.hash_publico || pesquisa.id;
  return `${base}/pesquisa/${hash}`;
}

// CÁLCULO DO SCORE NPS E DISTRIBUIÇÃO
// ---------------------------------------------------------------------------
export function calcularNpsScores(respostasNotas: number[]) {
  if (!respostasNotas || respostasNotas.length === 0) {
    return {
      scoreNps: 0,
      total: 0,
      promotores: 0,
      neutros: 0,
      detratores: 0,
      promotoresPct: 0,
      neutrosPct: 0,
      detratoresPct: 0,
      zona: "Crítico" as const,
    };
  }

  let promotores = 0;
  let neutros = 0;
  let detratores = 0;

  respostasNotas.forEach((n) => {
    if (n >= 9) promotores++;
    else if (n >= 7) neutros++;
    else detratores++;
  });

  const total = respostasNotas.length;
  const promotoresPct = Math.round((promotores / total) * 100);
  const neutrosPct = Math.round((neutros / total) * 100);
  const detratoresPct = Math.round((detratores / total) * 100);

  // Score NPS = % Promotores - % Detratores (escala de -100 a +100)
  const scoreNps = promotoresPct - detratoresPct;

  let zona: "Excelente" | "Muito Bom" | "Razoável" | "Crítico" = "Crítico";
  if (scoreNps >= 75) zona = "Excelente";
  else if (scoreNps >= 50) zona = "Muito Bom";
  else if (scoreNps >= 0) zona = "Razoável";
  else zona = "Crítico";

  return {
    scoreNps,
    total,
    promotores,
    neutros,
    detratores,
    promotoresPct,
    neutrosPct,
    detratoresPct,
    zona,
  };
}

// ---------------------------------------------------------------------------
// OPERAÇÕES DE PESQUISA (CRUD)
// ---------------------------------------------------------------------------
export async function getPesquisasList(companyId?: string | null): Promise<Pesquisa[]> {
  let query = supabase.from("pesquisas").select("*, perguntas:pesquisa_perguntas(*)").order("created_at", { ascending: false });
  if (companyId) query = query.eq("empresa_id", companyId);
  const { data, error } = await query;
  if (error) throw new Error("Não foi possível carregar as pesquisas.");
  return enrichPesquisas((data || []) as unknown as Pesquisa[]);
}
export async function getPesquisaByHash(token: string): Promise<Pesquisa | null> {
  if (!token) return null;
  // 1. Tenta RPC oficial de pesquisa pública
  try {
    const { data, error } = await supabase.rpc("get_public_survey", { _token: token });
    if (!error && data) return data as unknown as Pesquisa;
  } catch (err) {
    console.warn("RPC get_public_survey falhou, tentando fallback direto:", err);
  }
  // 2. Fallback: busca diretamente por url_hash ou id
  try {
    const { data, error } = await supabase
      .from("pesquisas")
      .select("*, perguntas:pesquisa_perguntas(*)")
      .or(`url_hash.eq.${token},id.eq.${token}`)
      .maybeSingle();
    if (!error && data) return data as unknown as Pesquisa;
  } catch (err) {
    console.warn("Fallback getPesquisaByHash falhou:", err);
  }
  return null;
}
export async function getPesquisaById(id: string): Promise<Pesquisa | null> {
  const { data, error } = await supabase.from("pesquisas").select("*, perguntas:pesquisa_perguntas(*)").eq("id", id).maybeSingle();
  if (error) throw new Error("Não foi possível carregar a pesquisa.");
  return data as unknown as Pesquisa | null;
}
export async function savePesquisa(payload: Partial<Pesquisa>): Promise<Pesquisa> {
  const empresaId = payload.empresa_id || payload.company_id;
  if (!empresaId) throw new Error("Selecione a empresa da pesquisa.");
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const perguntas = (payload.perguntas || []).map((q, index) => ({ ...q, id: uuid.test(q.id || "") ? q.id : crypto.randomUUID(), ordem: index + 1 }));
  const definition = { id: payload.id || crypto.randomUUID(), empresa_id: empresaId, titulo: payload.titulo || "Nova pesquisa", descricao: payload.descricao || "", tipo: payload.tipo || "nps", status: payload.status || "ativa", config_visual: payload.config_visual || {}, perguntas };
  const { data: id, error } = await supabase.rpc("save_survey_definition", { _survey: definition as any });
  if (error) throw new Error("Não foi possível salvar a pesquisa e suas perguntas. Confira suas permissões.");
  const row = await getPesquisaById(id);
  if (!row) throw new Error("Pesquisa salva, mas indisponível para leitura.");
  return row;
}
export async function deletePesquisa(id: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("delete_survey", { _id: id });
  if (error || !data) throw new Error("Não foi possível excluir a pesquisa.");
  return true;
}
export async function getRespostasByPesquisa(id: string): Promise<PesquisaResposta[]> {
  const { data, error } = await supabase.from("pesquisa_respostas").select("*, itens:pesquisa_respostas_itens(*)").eq("pesquisa_id", id).order("created_at", { ascending: false });
  if (error) throw new Error("Não foi possível consultar as respostas.");
  return (data || []) as unknown as PesquisaResposta[];
}
export async function saveRespostaPublica(token: string, itens: Array<{ pergunta_id: string; valor_nota?: number | null; valor_texto?: string | null }>): Promise<boolean> {
  const key = `jarvis_survey_session_${token}`;
  let sessionId = localStorage.getItem(key);
  if (!sessionId) { sessionId = crypto.randomUUID(); localStorage.setItem(key, sessionId); }
  const { error } = await supabase.rpc("submit_public_survey", { _token: token, _session_id: sessionId, _items: itens as any });
  if (error) throw new Error(error.message.includes("já registrada") ? "Resposta já registrada neste navegador." : "Não foi possível enviar. Responda todas as perguntas obrigatórias e tente novamente.");
  return true;
}

export async function getRelatorioConsolidado(pesquisaId: string): Promise<NpsRelatorioConsolidado | null> {
  const pesquisa = await getPesquisaById(pesquisaId);
  if (!pesquisa) return null;

  const respostas = await getRespostasByPesquisa(pesquisaId);
  const perguntas = pesquisa.perguntas || [];

  // Localiza a pergunta principal de NPS (0 a 10)
  const perguntaNps = perguntas.find((p) => p.tipo_resposta === "nps_score") || perguntas[0];

  const notasNps: number[] = [];
  const distribuicaoNotas: Record<number, number> = {};
  for (let i = 0; i <= 10; i++) distribuicaoNotas[i] = 0;

  respostas.forEach((resp) => {
    const itemNps = resp.itens.find((it) => it.pergunta_id === perguntaNps?.id);
    if (itemNps && typeof itemNps.valor_nota === "number") {
      notasNps.push(itemNps.valor_nota);
      distribuicaoNotas[itemNps.valor_nota] = (distribuicaoNotas[itemNps.valor_nota] || 0) + 1;
    }
  });

  const scores = calcularNpsScores(notasNps);

  // Análise detalhada de cada pergunta
  const perguntasResultados = perguntas.map((perg) => {
    if (perg.tipo_resposta === "nps_score") {
      return {
        pergunta: perg,
        distribuicao: distribuicaoNotas,
      };
    } else if (perg.tipo_resposta === "rating") {
      const distRating: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      let soma = 0;
      let count = 0;

      respostas.forEach((r) => {
        const it = r.itens.find((i) => i.pergunta_id === perg.id);
        if (it && typeof it.valor_nota === "number" && it.valor_nota >= 1 && it.valor_nota <= 5) {
          distRating[it.valor_nota] = (distRating[it.valor_nota] || 0) + 1;
          soma += it.valor_nota;
          count++;
        }
      });

      return {
        pergunta: perg,
        distribuicao: distRating,
        mediaRating: count > 0 ? Math.round((soma / count) * 10) / 10 : 0,
      };
    } else if (perg.tipo_resposta === "selecao_lista") {
      // Lista de seleção / múltipla escolha
      const distOpcoes: Record<string, number> = {};
      (perg.opcoes_lista || []).forEach((opc) => {
        distOpcoes[opc] = 0;
      });

      respostas.forEach((r) => {
        const it = r.itens.find((i) => i.pergunta_id === perg.id);
        if (it && it.valor_texto && it.valor_texto.trim()) {
          const val = it.valor_texto.trim();
          distOpcoes[val] = (distOpcoes[val] || 0) + 1;
        }
      });

      return {
        pergunta: perg,
        distribuicao: distOpcoes,
      };
    } else {
      // Texto aberto
      const comentariosTexto: Array<{ texto: string; data: string }> = [];
      respostas.forEach((r) => {
        const it = r.itens.find((i) => i.pergunta_id === perg.id);
        if (it && it.valor_texto && it.valor_texto.trim()) {
          comentariosTexto.push({
            texto: it.valor_texto.trim(),
            data: r.created_at,
          });
        }
      });

      return {
        pergunta: perg,
        comentariosTexto,
      };
    }
  });

  // Tabela bruta para Excel
  const respostasBrutas = respostas.map((r) => {
    const mapValores: Record<string, string | number> = {};
    perguntas.forEach((p) => {
      const it = r.itens.find((item) => item.pergunta_id === p.id);
      if (it) {
        mapValores[p.titulo_pergunta] = it.valor_nota ?? it.valor_texto ?? "";
      } else {
        mapValores[p.titulo_pergunta] = "";
      }
    });

    return {
      id: r.id,
      data: new Date(r.created_at).toLocaleString("pt-BR"),
      respostas: mapValores,
    };
  });

  // Mapeamento de feedbacks abertos para PesquisaRelatorioModal
  const feedbacksAbertos: Array<{ perguntaTexto: string; comentario: string; respondente?: string; data: string }> = [];
  perguntasResultados.forEach((pr) => {
    if (pr.comentariosTexto) {
      pr.comentariosTexto.forEach((c) => {
        feedbacksAbertos.push({
          perguntaTexto: pr.pergunta.titulo_pergunta,
          comentario: c.texto,
          data: c.data,
        });
      });
    }
  });

  // Mapeamento de questoesStats
  const questoesStats = perguntasResultados.map((pr) => {
    let tipoFormatado = "texto_aberto";
    if (pr.pergunta.tipo_resposta === "nps_score") tipoFormatado = "nps_0_10";
    else if (pr.pergunta.tipo_resposta === "rating") tipoFormatado = "escala_1_5";
    else if (pr.pergunta.tipo_resposta === "selecao_lista") tipoFormatado = "selecao_lista";

    return {
      perguntaTexto: pr.pergunta.titulo_pergunta,
      tipo: tipoFormatado,
      totalRespostas: respostas.length,
      media: pr.mediaRating ?? null,
      distribuicao: pr.distribuicao || {},
    };
  });

  return {
    pesquisa,
    zona: scores.zona,
    totalRespostas: respostas.length,
    totalRespondentes: respostas.length,
    scoreNps: scores.scoreNps,
    promotores: scores.promotores,
    promotoresCount: scores.promotores,
    neutros: scores.neutros,
    neutrosCount: scores.neutros,
    detratores: scores.detratores,
    detratoresCount: scores.detratores,
    pctPromotores: scores.promotoresPct,
    promotoresPct: scores.promotoresPct,
    pctNeutros: scores.neutrosPct,
    neutrosPct: scores.neutrosPct,
    pctDetratores: scores.detratoresPct,
    detratoresPct: scores.detratoresPct,
    distribuicaoNotas,
    perguntas,
    perguntasResultados,
    questoesStats,
    feedbacksAbertos,
    respostasBrutas,
  };
}

async function enrichPesquisas(pesquisas: Pesquisa[]): Promise<Pesquisa[]> {
  return Promise.all(pesquisas.map(async (p) => {
    const respostas = await getRespostasByPesquisa(p.id);
    const question = p.perguntas?.find((q) => q.tipo_resposta === "nps_score");
    const notes = respostas.flatMap((r) => r.itens.filter((i) => i.pergunta_id === question?.id && typeof i.valor_nota === "number").map((i) => Number(i.valor_nota)));
    const scores = calcularNpsScores(notes);
    return { ...p, company_id: p.empresa_id, hash_publico: p.url_hash, totalRespostas: respostas.length, total_respostas: respostas.length, scoreNps: notes.length ? scores.scoreNps : undefined, score_nps: notes.length ? scores.scoreNps : undefined, promotoresPct: scores.promotoresPct, neutrosPct: scores.neutrosPct, detratoresPct: scores.detratoresPct, zonaClassificacao: notes.length ? scores.zona : undefined };
  }));
}

// ---------------------------------------------------------------------------
// ALIASES PARA COMPATIBILIDADE COM A INTERFACE ADMINISTRATIVA
// ---------------------------------------------------------------------------
export const getPesquisas = getPesquisasList;

export async function getPerguntasByPesquisaId(pesquisaId: string): Promise<PesquisaPergunta[]> {
  const p = await getPesquisaById(pesquisaId);
  return p?.perguntas || [];
}

export async function toggleStatusPesquisa(id: string, status: "ativa" | "inativa"): Promise<boolean> {
  const p = await getPesquisaById(id);
  if (!p) return false;
  await savePesquisa({ ...p, status });
  return true;
}

export async function savePesquisaCompleta(
  pesquisaData: Partial<Pesquisa>,
  perguntasData: Array<Partial<PesquisaPergunta>>,
): Promise<Pesquisa> {
  const payload: Partial<Pesquisa> = {
    ...pesquisaData,
    perguntas: perguntasData.map((p, idx) => {
      let tipoResposta: any = p.tipo_resposta;
      const t = (p as any).tipo;
      if (!tipoResposta) {
        if (t === "escala_1_5") tipoResposta = "rating";
        else if (t === "texto_aberto") tipoResposta = "text_open";
        else if (t === "selecao_lista") tipoResposta = "selecao_lista";
        else tipoResposta = "nps_score";
      }

      return {
        id: p.id || `perg-${Date.now()}-${idx + 1}`,
        pesquisa_id: pesquisaData.id,
        ordem: idx + 1,
        titulo_pergunta: p.titulo_pergunta || (p as any).texto_pergunta || "Pergunta",
        tipo_resposta: tipoResposta,
        obrigatorio: p.obrigatorio ?? (p as any).obrigatoria ?? true,
        placeholder: p.placeholder || (p as any).texto_ajuda || "",
        opcoes_lista: p.opcoes_lista || (p as any).opcoes_lista || [],
      };
    }),
  };
  return savePesquisa(payload);
}

export const calcularRelatorioPesquisa = getRelatorioConsolidado;
