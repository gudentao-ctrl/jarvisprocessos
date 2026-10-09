import * as fflate from "fflate";
import { supabase } from "@/integrations/supabase/client";
import {
  Pesquisa,
  PesquisaPergunta,
  PesquisaResposta,
  PesquisaRespostaItem,
  NpsRelatorioConsolidado,
  ConfigVisualPesquisa,
  ConfigVisualPesquisa,
} from "./nps-types";

const LOCAL_STORAGE_PESQUISAS = "maia_nps_pesquisas_v1";
const LOCAL_STORAGE_RESPOSTAS = "maia_nps_respostas_v1";
export const NPS_REALTIME_CHANNEL = "maia_nps_sync_hub_v1";

// ---------------------------------------------------------------------------
// COMPACTAÇÃO / DESCOMPACTAÇÃO AUTÔNOMA DE PESQUISAS (ZERO DEPENDÊNCIA DE LOGIN)
// ---------------------------------------------------------------------------
export function compressSurveyToHash(survey: Partial<Pesquisa>): string {
  try {
    let logo = survey.config_visual?.logo_url || "";
    // Se a imagem tiver até 90KB em base64, fflate comprime para apenas ~2KB-5KB dentro da URL
    if (logo.length > 95000) {
      // Caso exceda o limite seguro de URL do navegador, guarda no cache local indexado pelo ID da pesquisa
      if (typeof window !== "undefined" && survey.id) {
        try {
          localStorage.setItem(`maia_nps_logo_${survey.id}`, logo);
        } catch {}
      }
      logo = "";
    }

    const compact = {
      id: survey.id,
      eid: survey.empresa_id || survey.company_id || null,
      t: survey.titulo || "Pesquisa de Satisfação",
      d: survey.descricao || "",
      tp: survey.tipo || "nps",
      st: survey.status || "ativa",
      h: survey.url_hash || "",
      cv: {
        bg: survey.config_visual?.bg_color || survey.config_visual?.cor_fundo || "#FFF8F5",
        pr: survey.config_visual?.primary_color || survey.config_visual?.cor_primaria || "#E05A10",
        tx: survey.config_visual?.text_color || survey.config_visual?.cor_texto || "#2B1B17",
        cd: survey.config_visual?.card_bg_color || "#FFFFFF",
        lg: logo,
        w: survey.config_visual?.welcome_msg || survey.config_visual?.mensagem_boas_vindas || "",
        th: survey.config_visual?.thanks_msg || survey.config_visual?.mensagem_agradecimento || "",
      },
      pq: (survey.perguntas || []).map((p) => ({
        i: p.id,
        o: p.ordem,
        t: p.titulo_pergunta,
        tr: p.tipo_resposta,
        ob: p.obrigatorio,
        ph: p.placeholder || "",
        op: p.opcoes_lista || [],
      })),
    };

    const json = JSON.stringify(compact);
    const u8 = fflate.deflateSync(fflate.strToU8(json));
    let binary = "";
    for (let i = 0; i < u8.byteLength; i++) binary += String.fromCharCode(u8[i]);
    const b64 = btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    return `s_${b64}`;
  } catch (err) {
    console.error("Erro ao compactar pesquisa:", err);
    return survey.url_hash || survey.id || "pesquisa";
  }
}

export function decompressSurveyFromHash(hash: string): Pesquisa | null {
  if (!hash || !hash.startsWith("s_")) return null;
  try {
    let b64 = hash.slice(2).replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    const binary = atob(b64);
    const u8 = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) u8[i] = binary.charCodeAt(i);
    const json = fflate.strFromU8(fflate.inflateSync(u8));
    const c = JSON.parse(json);

    const bg = c.cv?.bg || "#FFF8F5";
    const pr = c.cv?.pr || "#E05A10";
    const tx = c.cv?.tx || "#2B1B17";
    const cd = c.cv?.cd || "#FFFFFF";
    const w = c.cv?.w || "Olá! Queremos muito ouvir sua opinião.";
    const th = c.cv?.th || "Muito obrigado pelo seu feedback!";

    return {
      id: c.id,
      empresa_id: c.eid,
      company_id: c.eid,
      titulo: c.t,
      descricao: c.d,
      tipo: c.tp || "nps",
      status: c.st || "ativa",
      url_hash: c.h || hash,
      hash_publico: hash,
      config_visual: {
        bg_color: bg,
        cor_fundo: bg,
        primary_color: pr,
        cor_primaria: pr,
        text_color: tx,
        cor_texto: tx,
        card_bg_color: cd,
        logo_url:
          c.cv?.lg ||
          (typeof window !== "undefined"
            ? localStorage.getItem(`maia_nps_logo_${c.id}`) || ""
            : ""),
        welcome_msg: w,
        mensagem_boas_vindas: w,
        thanks_msg: th,
        mensagem_agradecimento: th,
      },
      perguntas: (c.pq || []).map((p: any) => ({
        id: p.i,
        pesquisa_id: c.id,
        ordem: p.o,
        titulo_pergunta: p.t,
        tipo_resposta: p.tr,
        obrigatorio: p.ob,
        placeholder: p.ph,
        opcoes_lista: p.op,
      })),
      created_at: new Date().toISOString(),
    };
  } catch (err) {
    console.warn("Falha ao descompactar hash autônomo da pesquisa:", err);
    return null;
  }
}

export function generatePublicSurveyLink(pesquisa: Pesquisa, origin?: string): string {
  const base = origin || (typeof window !== "undefined" ? window.location.origin : "");
  const hash = compressSurveyToHash(pesquisa);
  return `${base}/p/${hash}`;
}

const INITIAL_MOCK_PESQUISAS: Pesquisa[] = [
  {
    id: "pesq-01",
    empresa_id: null,
    titulo: "Pesquisa de Satisfação de Clientes 2026 (NPS)",
    descricao: "Avaliação do nível de serviço, metodologia e entregáveis das consultorias Maia.",
    tipo: "nps",
    status: "ativa",
    url_hash: "maia-clientes-2026",
    config_visual: {
      bg_color: "#FFF8F5",
      primary_color: "#E05A10",
      text_color: "#2B1B17",
      card_bg_color: "#FFFFFF",
      logo_url: "",
      welcome_msg: "Olá! Queremos muito ouvir sua opinião sobre a nossa parceria com a Maia Consultoria.",
      thanks_msg: "Muito obrigado pelo seu feedback! Sua percepção é fundamental para aprimorarmos continuamente nossa entrega.",
    },
    perguntas: [
      {
        id: "perg-01-1",
        pesquisa_id: "pesq-01",
        ordem: 1,
        titulo_pergunta: "Em uma escala de 0 a 10, qual a probabilidade de você recomendar a Maia Consultoria para um colega ou empresa parceira?",
        tipo_resposta: "nps_score",
        obrigatorio: true,
      },
      {
        id: "perg-01-2",
        pesquisa_id: "pesq-01",
        ordem: 2,
        titulo_pergunta: "Como você avalia a clareza e pontualidade dos consultores durante as entregas dos projetos?",
        tipo_resposta: "rating",
        obrigatorio: true,
      },
      {
        id: "perg-01-3",
        pesquisa_id: "pesq-01",
        ordem: 3,
        titulo_pergunta: "O que mais chamou sua atenção positivamente ou o que poderíamos fazer para superar ainda mais suas expectativas?",
        tipo_resposta: "text_open",
        obrigatorio: false,
        placeholder: "Compartilhe seus elogios, pontos de melhoria ou sugestões práticas...",
      },
    ],
    created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
  },
  {
    id: "pesq-02",
    empresa_id: null,
    titulo: "Pesquisa de Clima & Engajamento Interno (eNPS Q1)",
    descricao: "Medição anônima da satisfação e orgulho de pertencer da equipe Maia.",
    tipo: "enps",
    status: "ativa",
    url_hash: "maia-clima-enps",
    config_visual: {
      bg_color: "#3E100C",
      primary_color: "#E05A10",
      text_color: "#FFFFFF",
      card_bg_color: "#260907",
      logo_url: "",
      welcome_msg: "Sua voz constrói a nossa cultura! Esta pesquisa é 100% anônima e confidencial.",
      thanks_msg: "Obrigado por ajudar a tornar a Maia Consultoria um lugar cada vez melhor para crescermos juntos!",
    },
    perguntas: [
      {
        id: "perg-02-1",
        pesquisa_id: "pesq-02",
        ordem: 1,
        titulo_pergunta: "Em uma escala de 0 a 10, o quanto você recomendaria a Maia Consultoria como um excelente lugar para se trabalhar?",
        tipo_resposta: "nps_score",
        obrigatorio: true,
      },
      {
        id: "perg-02-2",
        pesquisa_id: "pesq-02",
        ordem: 2,
        titulo_pergunta: "Como você avalia o apoio ao seu desenvolvimento profissional e as oportunidades de aprendizado?",
        tipo_resposta: "rating",
        obrigatorio: true,
      },
      {
        id: "perg-02-3",
        pesquisa_id: "pesq-02",
        ordem: 3,
        titulo_pergunta: "Deixe um comentário anônimo com sua visão sobre o ambiente de trabalho e liderança:",
        tipo_resposta: "text_open",
        obrigatorio: false,
        placeholder: "Seja totalmente sincero(a)...",
      },
    ],
    created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
  },
];

const INITIAL_MOCK_RESPOSTAS: PesquisaResposta[] = [
  // Respostas Pesquisa 1 (NPS Clientes)
  {
    id: "resp-1",
    pesquisa_id: "pesq-01",
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    itens: [
      { pergunta_id: "perg-01-1", valor_nota: 10 },
      { pergunta_id: "perg-01-2", valor_nota: 5 },
      { pergunta_id: "perg-01-3", valor_texto: "Metodologia ágil e relatórios com visual impecável! Os consultores foram cirúrgicos no mapeamento." },
    ],
  },
  {
    id: "resp-2",
    pesquisa_id: "pesq-01",
    created_at: new Date(Date.now() - 4 * 86400000).toISOString(),
    itens: [
      { pergunta_id: "perg-01-1", valor_nota: 9 },
      { pergunta_id: "perg-01-2", valor_nota: 5 },
      { pergunta_id: "perg-01-3", valor_texto: "Equipe extremamente prestativa e focada nos prazos acordados." },
    ],
  },
  {
    id: "resp-3",
    pesquisa_id: "pesq-01",
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    itens: [
      { pergunta_id: "perg-01-1", valor_nota: 10 },
      { pergunta_id: "perg-01-2", valor_nota: 4 },
      { pergunta_id: "perg-01-3", valor_texto: "Excelente condução das entrevistas de mapeamento de processos." },
    ],
  },
  {
    id: "resp-4",
    pesquisa_id: "pesq-01",
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    itens: [
      { pergunta_id: "perg-01-1", valor_nota: 8 },
      { pergunta_id: "perg-01-2", valor_nota: 4 },
      { pergunta_id: "perg-01-3", valor_texto: "Gostamos muito, mas sentimos falta de mais sessões presenciais." },
    ],
  },
  {
    id: "resp-5",
    pesquisa_id: "pesq-01",
    created_at: new Date(Date.now() - 1 * 86400000).toISOString(),
    itens: [
      { pergunta_id: "perg-01-1", valor_nota: 9 },
      { pergunta_id: "perg-01-2", valor_nota: 5 },
      { pergunta_id: "perg-01-3", valor_texto: "Recomendo fortemente para qualquer empresa que precisa de governança rápida." },
    ],
  },
  {
    id: "resp-6",
    pesquisa_id: "pesq-01",
    created_at: new Date(Date.now() - 12 * 3600000).toISOString(),
    itens: [
      { pergunta_id: "perg-01-1", valor_nota: 6 },
      { pergunta_id: "perg-01-2", valor_nota: 3 },
      { pergunta_id: "perg-01-3", valor_texto: "Houve um pequeno atraso na entrega final do fluxograma, mas o conteúdo foi bom." },
    ],
  },
  // Respostas Pesquisa 2 (eNPS)
  {
    id: "resp-e1",
    pesquisa_id: "pesq-02",
    created_at: new Date(Date.now() - 6 * 86400000).toISOString(),
    itens: [
      { pergunta_id: "perg-02-1", valor_nota: 10 },
      { pergunta_id: "perg-02-2", valor_nota: 5 },
      { pergunta_id: "perg-02-3", valor_texto: "Ambiente muito acolhedor e com espaço para propor soluções inovadoras." },
    ],
  },
  {
    id: "resp-e2",
    pesquisa_id: "pesq-02",
    created_at: new Date(Date.now() - 4 * 86400000).toISOString(),
    itens: [
      { pergunta_id: "perg-02-1", valor_nota: 9 },
      { pergunta_id: "perg-02-2", valor_nota: 4 },
      { pergunta_id: "perg-02-3", valor_texto: "Cultura muito forte de colaboração mútua." },
    ],
  },
  {
    id: "resp-e3",
    pesquisa_id: "pesq-02",
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    itens: [
      { pergunta_id: "perg-02-1", valor_nota: 8 },
      { pergunta_id: "perg-02-2", valor_nota: 4 },
      { pergunta_id: "perg-02-3", valor_texto: "Podemos melhorar os planos de carreira individuais." },
    ],
  },
];

// ---------------------------------------------------------------------------
// HELPERS LOCALSTORAGE
// ---------------------------------------------------------------------------
function readStorage<T>(key: string, defaultData: T): T {
  if (typeof window === "undefined") return defaultData;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(defaultData));
      return defaultData;
    }
    return JSON.parse(raw);
  } catch {
    return defaultData;
  }
}

function writeStorage<T>(key: string, data: T) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error("Error writing to localStorage", key, err);
  }
}

// ---------------------------------------------------------------------------
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
  try {
    const db = supabase as any;
    let query = db.from("pesquisas").select("*, perguntas:pesquisa_perguntas(*)").order("created_at", { ascending: false });
    if (companyId) {
      query = query.eq("empresa_id", companyId);
    }
    const { data, error } = await query;
    if (!error && Array.isArray(data)) {
      return enrichPesquisas(data as Pesquisa[]);
    }
  } catch (err) {
    console.warn("Supabase pesquisas fetch fallback to localStorage:", err);
  }

  const list = readStorage<Pesquisa[]>(LOCAL_STORAGE_PESQUISAS, INITIAL_MOCK_PESQUISAS);
  const filtered = companyId
    ? list.filter((p) => p.empresa_id === companyId || p.company_id === companyId)
    : list;
  return enrichPesquisas(filtered);
}

export async function getPesquisaByHash(urlHash: string): Promise<Pesquisa | null> {
  if (!urlHash) return null;
  const cleanHash = decodeURIComponent(urlHash).trim();

  // 1. Prioridade máxima: decodifica payload autônomo (funciona 100% sem login, em qualquer guia ou aparelho)
  if (cleanHash.startsWith("s_")) {
    const dec = decompressSurveyFromHash(cleanHash);
    if (dec) {
      // Salva em cache local do navegador para rápido reuso
      try {
        const list = readStorage<Pesquisa[]>(LOCAL_STORAGE_PESQUISAS, INITIAL_MOCK_PESQUISAS);
        const idx = list.findIndex((x) => x.id === dec.id || x.url_hash === dec.url_hash);
        if (idx >= 0) {
          list[idx] = { ...list[idx], ...dec };
        } else {
          list.unshift(dec);
        }
        writeStorage(LOCAL_STORAGE_PESQUISAS, list);
      } catch {}
      return dec;
    }
  }

  // 2. Busca no Supabase (se as tabelas estiverem disponíveis)
  try {
    const db = supabase as any;
    // Tenta primeiro por url_hash
    let { data, error } = await db
      .from("pesquisas")
      .select("*, perguntas:pesquisa_perguntas(*)")
      .eq("url_hash", cleanHash)
      .maybeSingle();

    // Se não encontrou por url_hash, tenta por id
    if (!data) {
      const res = await db
        .from("pesquisas")
        .select("*, perguntas:pesquisa_perguntas(*)")
        .eq("id", cleanHash)
        .maybeSingle();
      data = res.data;
      error = res.error;
    }

    if (!error && data) {
      const hashFinal = data.url_hash || data.id;
      return {
        ...data,
        url_hash: hashFinal,
        hash_publico: hashFinal,
      } as Pesquisa;
    }
  } catch (err) {
    console.warn("Supabase getPesquisaByHash fallback to localStorage:", err);
  }

  // 3. Fallback no cache local
  const list = readStorage<Pesquisa[]>(LOCAL_STORAGE_PESQUISAS, INITIAL_MOCK_PESQUISAS);
  const p = list.find(
    (item) =>
      item.url_hash === cleanHash ||
      item.id === cleanHash ||
      item.hash_publico === cleanHash
  );
  if (p) {
    const hashFinal = p.url_hash || p.hash_publico || p.id;
    return {
      ...p,
      url_hash: hashFinal,
      hash_publico: hashFinal,
    };
  }
  return null;
}

export async function getPesquisaById(id: string): Promise<Pesquisa | null> {
  const list = await getPesquisasList();
  return list.find((p) => p.id === id) || null;
}

export async function savePesquisa(pesquisaData: Partial<Pesquisa>): Promise<Pesquisa> {
  const isNew = !pesquisaData.id;
  const id = pesquisaData.id || `pesq-${Date.now()}`;
  const url_hash =
    pesquisaData.url_hash ||
    (pesquisaData.titulo
      ? pesquisaData.titulo
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "")
      : `pesquisa-${Date.now()}`);

  const cvRaw = pesquisaData.config_visual || {};
  const bg_color = cvRaw.bg_color || cvRaw.cor_fundo || "#FFF8F5";
  const primary_color = cvRaw.primary_color || cvRaw.cor_primaria || "#E05A10";
  const text_color = cvRaw.text_color || cvRaw.cor_texto || "#1F2937";
  const card_bg_color = cvRaw.card_bg_color || (bg_color === "#3E100C" ? "#2B0B08" : "#FFFFFF");
  const welcome_msg = cvRaw.welcome_msg || cvRaw.mensagem_boas_vindas || "Bem-vindo(a) à nossa pesquisa de satisfação!";
  const thanks_msg = cvRaw.thanks_msg || cvRaw.mensagem_agradecimento || "Muito obrigado pelas suas respostas!";
  const logo_url = cvRaw.logo_url || "";

  const config_visual: ConfigVisualPesquisa = {
    bg_color,
    cor_fundo: bg_color,
    primary_color,
    cor_primaria: primary_color,
    text_color,
    cor_texto: text_color,
    card_bg_color,
    logo_url,
    welcome_msg,
    mensagem_boas_vindas: welcome_msg,
    thanks_msg,
    mensagem_agradecimento: thanks_msg,
    permitir_anonimo: cvRaw.permitir_anonimo ?? true,
  };

  const empresaIdFinal = pesquisaData.empresa_id || pesquisaData.company_id || null;

  const novaPesquisa: Pesquisa = {
    id,
    empresa_id: empresaIdFinal,
    company_id: empresaIdFinal,
    titulo: pesquisaData.titulo || "Nova Pesquisa de Satisfação",
    descricao: pesquisaData.descricao || "",
    tipo: pesquisaData.tipo || "nps",
    status: pesquisaData.status || "ativa",
    url_hash,
    hash_publico: url_hash,
    config_visual,
    perguntas: (pesquisaData.perguntas || []).map((perg, idx) => ({
      ...perg,
      id: perg.id || `perg-${id}-${idx + 1}`,
      pesquisa_id: id,
      ordem: idx + 1,
    })),
    created_at: pesquisaData.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  try {
    const db = supabase as any;
    if (isNew) {
      await db.from("pesquisas").insert([
        {
          id: novaPesquisa.id,
          empresa_id: novaPesquisa.empresa_id,
          titulo: novaPesquisa.titulo,
          descricao: novaPesquisa.descricao,
          tipo: novaPesquisa.tipo,
          status: novaPesquisa.status,
          url_hash: novaPesquisa.url_hash,
          config_visual: novaPesquisa.config_visual,
        },
      ]);
    } else {
      await db
        .from("pesquisas")
        .update({
          titulo: novaPesquisa.titulo,
          descricao: novaPesquisa.descricao,
          tipo: novaPesquisa.tipo,
          status: novaPesquisa.status,
          url_hash: novaPesquisa.url_hash,
          config_visual: novaPesquisa.config_visual,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
    }
  } catch (err) {
    console.warn("Supabase savePesquisa fallback to localStorage:", err);
  }

  const list = readStorage<Pesquisa[]>(LOCAL_STORAGE_PESQUISAS, INITIAL_MOCK_PESQUISAS);
  const idx = list.findIndex((p) => p.id === id);
  if (idx >= 0) {
    list[idx] = novaPesquisa;
  } else {
    list.unshift(novaPesquisa);
  }
  writeStorage(LOCAL_STORAGE_PESQUISAS, list);

  return novaPesquisa;
}

export async function deletePesquisa(id: string): Promise<boolean> {
  try {
    const db = supabase as any;
    await db.from("pesquisas").delete().eq("id", id);
  } catch {}

  const list = readStorage<Pesquisa[]>(LOCAL_STORAGE_PESQUISAS, INITIAL_MOCK_PESQUISAS);
  const updated = list.filter((p) => p.id !== id);
  writeStorage(LOCAL_STORAGE_PESQUISAS, updated);
  return true;
}

// ---------------------------------------------------------------------------
// RESPOSTAS E RELATÓRIO ANALÍTICO
// ---------------------------------------------------------------------------
export async function getRespostasByPesquisa(pesquisaId: string): Promise<PesquisaResposta[]> {
  try {
    const db = supabase as any;
    const { data, error } = await db
      .from("pesquisa_respostas")
      .select("*, itens:pesquisa_respostas_itens(*)")
      .eq("pesquisa_id", pesquisaId)
      .order("created_at", { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      return data as PesquisaResposta[];
    }
  } catch (err) {
    console.warn("Supabase getRespostas fallback to localStorage:", err);
  }

  const allRespostas = readStorage<PesquisaResposta[]>(LOCAL_STORAGE_RESPOSTAS, INITIAL_MOCK_RESPOSTAS);
  return allRespostas.filter((r) => r.pesquisa_id === pesquisaId);
}

export async function saveRespostaPublica(
  pesquisaId: string,
  itens: Array<{ pergunta_id: string; valor_nota?: number | null; valor_texto?: string | null }>,
): Promise<boolean> {
  const respostaId = `resp-${Date.now()}`;
  const now = new Date().toISOString();

  const novaResposta: PesquisaResposta = {
    id: respostaId,
    pesquisa_id: pesquisaId,
    created_at: now,
    itens: itens.map((it) => ({
      ...it,
      id: `it-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      resposta_id: respostaId,
    })),
  };

  try {
    const db = supabase as any;
    const { data: dbResp, error: rErr } = await db
      .from("pesquisa_respostas")
      .insert([
        {
          id: respostaId,
          pesquisa_id: pesquisaId,
          created_at: now,
        },
      ])
      .select()
      .single();

    if (!rErr && dbResp) {
      const itensPayload = itens.map((it) => ({
        resposta_id: respostaId,
        pergunta_id: it.pergunta_id,
        valor_nota: it.valor_nota,
        valor_texto: it.valor_texto,
      }));
      await db.from("pesquisa_respostas_itens").insert(itensPayload);
    }
  } catch (err) {
    console.warn("Supabase saveRespostaPublica fallback to localStorage:", err);
  }

  // Notifica o painel administrativo em tempo real via Supabase Realtime Broadcast
  try {
    const channel = supabase.channel(NPS_REALTIME_CHANNEL);
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        channel.send({
          type: "broadcast",
          event: "nova_resposta_nps",
          payload: {
            pesquisaId,
            resposta: novaResposta,
          },
        }).catch(() => {});
      }
    });
  } catch (syncErr) {
    console.warn("Broadcast resposta aviso:", syncErr);
  }

  const all = readStorage<PesquisaResposta[]>(LOCAL_STORAGE_RESPOSTAS, INITIAL_MOCK_RESPOSTAS);
  all.unshift(novaResposta);
  writeStorage(LOCAL_STORAGE_RESPOSTAS, all);

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

function enrichPesquisas(pesquisas: Pesquisa[]): Pesquisa[] {
  const allRespostas = readStorage<PesquisaResposta[]>(LOCAL_STORAGE_RESPOSTAS, INITIAL_MOCK_RESPOSTAS);

  return pesquisas.map((p) => {
    const respostasP = allRespostas.filter((r) => r.pesquisa_id === p.id);
    const perguntaNps = (p.perguntas || []).find((perg) => perg.tipo_resposta === "nps_score") || p.perguntas?.[0];

    const notas: number[] = [];
    respostasP.forEach((r) => {
      const it = r.itens.find((i) => i.pergunta_id === perguntaNps?.id);
      if (it && typeof it.valor_nota === "number") {
        notas.push(it.valor_nota);
      }
    });

    const scores = calcularNpsScores(notas);

    const hashFinal = p.url_hash || p.hash_publico || p.id;

    return {
      ...p,
      url_hash: hashFinal,
      hash_publico: hashFinal,
      company_id: p.empresa_id || p.company_id || null,
      empresa_id: p.empresa_id || p.company_id || null,
      totalRespostas: respostasP.length,
      total_respostas: respostasP.length,
      scoreNps: scores.scoreNps,
      score_nps: scores.scoreNps,
      promotoresPct: scores.promotoresPct,
      neutrosPct: scores.neutrosPct,
      detratoresPct: scores.detratoresPct,
      zonaClassificacao: scores.zona,
    };
  });
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
