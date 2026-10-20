// src/lib/fives-storage.ts
// Camada de Armazenamento, API e Regras de Negócio para o Módulo HUB 5S (Bloco 27)

import { supabase } from "@/integrations/supabase/client";
import {
  Senso5S,
  DestinacaoCartaoVermelho,
  FivesConfiguracao,
  FivesSetor,
  FivesInstrucaoTrabalho,
  FivesAuditoria,
  FivesAuditoriaItem,
  FivesDescarteCartaoVermelho,
  FivesMuralFoto,
  FivesEvento,
  FivesPortalData,
  FivesRadarDataPoint,
} from "./fives-types";

const fivesDb = supabase as any;

// Perguntas Padrão do Checklist Oficial dos 5 Sensos
export const CHECKLIST_PADRAO_5S: Array<{ senso: Senso5S; pergunta: string; dica: string }> = [
  // 1. SEIRI (Utilização / Descarte)
  {
    senso: "Seiri",
    pergunta: "Itens desnecessários, quebrados ou obsoletos foram identificados e retirados do setor?",
    dica: "Observe caixas paradas, ferramentas defeituosas ou materiais sem uso recente.",
  },
  {
    senso: "Seiri",
    pergunta: "Documentos, papéis ou arquivos digitais desatualizados foram descartados ou arquivados?",
    dica: "Verifique mesas, gaveteiros, quadros de avisos e pastas do setor.",
  },

  // 2. SEITON (Organização / Ordenação)
  {
    senso: "Seiton",
    pergunta: "Materiais, ferramentas e equipamentos possuem locais demarcados com identificação visual?",
    dica: "Cheque etiquetas, sombras no quadro de ferramentas e demarcação de solo.",
  },
  {
    senso: "Seiton",
    pergunta: "Corredores, rotas de fuga e áreas de circulação estão desobstruídos e sinalizados?",
    dica: "Garantir acesso livre a extintores, painéis elétricos e portas de saída.",
  },

  // 3. SEISO (Limpeza / Inspeção)
  {
    senso: "Seiso",
    pergunta: "Bancadas, pisos, paredes e equipamentos estão limpos e livres de óleos, pós ou resíduos?",
    dica: "A limpeza deve servir também como inspeção preventiva de quebras.",
  },
  {
    senso: "Seiso",
    pergunta: "Fontes de sujeira ou vazamentos foram eliminadas ou controladas diretamente na origem?",
    dica: "Identificar de onde parte a contaminação para evitar repetição diária.",
  },

  // 4. SEIKETSU (Padronização / Saúde e Higiene)
  {
    senso: "Seiketsu",
    pergunta: "A Instrução de Trabalho (IT) está visível e o setor segue o 'Padrão Ouro' de organização?",
    dica: "Comparar a foto do estado ideal com a realidade visual encontrada no momento.",
  },
  {
    senso: "Seiketsu",
    pergunta: "Condições de iluminação, ventilação, ergonomia e uso de EPIs estão adequadas?",
    dica: "Atenção ao conforto e integridade física de quem atua no setor.",
  },

  // 5. SHITSUKE (Disciplina / Autodisciplina)
  {
    senso: "Shitsuke",
    pergunta: "A equipe cumpre a rotina de limpeza e organização de forma autônoma sem cobrança?",
    dica: "Avaliar o comprometimento natural e hábito dos colaboradores da área.",
  },
  {
    senso: "Shitsuke",
    pergunta: "Planos de ação de auditorias anteriores foram executados dentro do prazo acordado?",
    dica: "Verificar se as pendências e cartões vermelhos foram resolvidos.",
  },
];

// Dados Iniciais de Demonstração (Whitelabel Default)
const DEFAULT_CONFIG = (companyId: string, companyName?: string): FivesConfiguracao => ({
  id: `cfg-${companyId}`,
  company_id: companyId,
  url_hash: `5s_${companyId.slice(0, 8)}`,
  logo_url: "",
  header_banner_url: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=1400&auto=format&fit=crop&q=80",
  slogan_campanha: `Programa 5S ${companyName ? "• " + companyName : ""}: Um lugar para cada coisa e cada coisa no seu lugar.`,
  primary_color: "#3E100C",
  secondary_color: "#E05A10",
  bg_color: "#FFF8F5",
  senso_destaque_mes: "Seiso (Senso de Limpeza & Inspeção)",
  comite_membros: [
    {
      id: "com-1",
      nome: "Carlos Eduardo Maia",
      cargo: "Consultor Líder",
      papel_5s: "Coordenador Geral",
      contato: "contato@maiaconsultoria.com.br",
    },
    {
      id: "com-2",
      nome: "Mariana Souza",
      cargo: "Gestora de Qualidade",
      papel_5s: "Auditor Líder",
      contato: "qualidade@empresa.com",
    },
    {
      id: "com-3",
      nome: "Roberto Silva",
      cargo: "Supervisor de Manutenção",
      papel_5s: "Facilitador",
    },
  ],
});

const DEFAULT_SETORES = (companyId: string): FivesSetor[] => [
  {
    id: `setor-1-${companyId}`,
    company_id: companyId,
    nome_setor: "Almoxarifado & Logística",
    descricao: "Estocagem de matéria-prima, expedição e embalagens",
    guardiao_nome: "Marcos Oliveira",
    auditor_nome: "Mariana Souza",
    meta_nota: 90,
    ultima_nota: 94,
    historico_notas: [82, 88, 91, 94],
    selo: "Ouro",
    posicao_ranking: 1,
    tendencia: "up",
  },
  {
    id: `setor-2-${companyId}`,
    company_id: companyId,
    nome_setor: "Linha de Produção / Usinagem",
    descricao: "Bancadas de montagem, máquinas CNC e ferramentas",
    guardiao_nome: "Ana Paula Silva",
    auditor_nome: "Carlos Eduardo",
    meta_nota: 90,
    ultima_nota: 86,
    historico_notas: [78, 80, 84, 86],
    selo: "Prata",
    posicao_ranking: 2,
    tendencia: "up",
  },
  {
    id: `setor-3-${companyId}`,
    company_id: companyId,
    nome_setor: "Administrativo & Diretoria",
    descricao: "Mesas de escritório, arquivos físicos e copa",
    guardiao_nome: "Juliana Santos",
    auditor_nome: "Roberto Silva",
    meta_nota: 90,
    ultima_nota: 81,
    historico_notas: [85, 83, 80, 81],
    selo: "Prata",
    posicao_ranking: 3,
    tendencia: "stable",
  },
  {
    id: `setor-4-${companyId}`,
    company_id: companyId,
    nome_setor: "Manutenção Mecânica & Ferramentaria",
    descricao: "Área de reparos, troca de óleos e solda",
    guardiao_nome: "Paulo Ricardo",
    auditor_nome: "Mariana Souza",
    meta_nota: 90,
    ultima_nota: 74,
    historico_notas: [68, 70, 72, 74],
    selo: "Atencao",
    posicao_ranking: 4,
    tendencia: "up",
  },
];

// Helper de Fallback LocalStorage
function getLocalItem<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : fallback;
  } catch {
    return fallback;
  }
}

function setLocalItem<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn("Falha ao salvar no localStorage:", e);
  }
}

// ---------------------------------------------------------------------------
// CONFIGURAÇÕES WHITELABEL
// ---------------------------------------------------------------------------
export async function getFivesConfig(companyId: string, companyName?: string): Promise<FivesConfiguracao> {
  if (!companyId) return DEFAULT_CONFIG("demo", companyName);

  try {
    const { data, error } = await fivesDb
      .from("fives_configuracoes" as any)
      .select("*")
      .eq("company_id", companyId)
      .maybeSingle();

    if (!error && data) {
      return {
        id: data.id,
        company_id: data.company_id,
        url_hash: data.url_hash || `5s_${companyId.slice(0, 8)}`,
        logo_url: data.logo_url,
        header_banner_url: data.header_banner_url,
        slogan_campanha: data.slogan_campanha,
        primary_color: data.primary_color || "#3E100C",
        secondary_color: data.secondary_color || "#E05A10",
        bg_color: data.bg_color || "#FFF8F5",
        senso_destaque_mes: data.senso_destaque_mes,
        comite_membros: Array.isArray(data.comite_membros) ? data.comite_membros : [],
      };
    }
  } catch (e) {
    console.warn("Tabela fives_configuracoes não encontrada ou sem acesso. Usando fallback.", e);
  }

  // Fallback Local
  const localKey = `jarvis_5s_config_${companyId}`;
  return getLocalItem<FivesConfiguracao>(localKey, DEFAULT_CONFIG(companyId, companyName));
}

export async function saveFivesConfig(config: Partial<FivesConfiguracao>): Promise<FivesConfiguracao> {
  const companyId = config.company_id;
  if (!companyId) throw new Error("ID da empresa é obrigatório.");

  const payload = {
    id: config.id || crypto.randomUUID(),
    company_id: companyId,
    url_hash: config.url_hash || `5s_${companyId.slice(0, 8)}`,
    logo_url: config.logo_url || null,
    header_banner_url: config.header_banner_url || null,
    slogan_campanha: config.slogan_campanha || "Praticar o 5S é transformar nosso ambiente com disciplina e excelência.",
    primary_color: config.primary_color || "#3E100C",
    secondary_color: config.secondary_color || "#E05A10",
    bg_color: config.bg_color || "#FFF8F5",
    senso_destaque_mes: config.senso_destaque_mes || "Seiso (Limpeza)",
    comite_membros: config.comite_membros || [],
    updated_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await fivesDb
      .from("fives_configuracoes" as any)
      .upsert(payload, { onConflict: "company_id" })
      .select()
      .single();

    if (!error && data) {
      setLocalItem(`jarvis_5s_config_${companyId}`, data);
      return data as unknown as FivesConfiguracao;
    }
  } catch (e) {
    console.warn("Erro ao salvar fives_configuracoes no Supabase, salvando localmente:", e);
  }

  setLocalItem(`jarvis_5s_config_${companyId}`, payload);
  return payload as unknown as FivesConfiguracao;
}

// ---------------------------------------------------------------------------
// GESTÃO DE SETORES
// ---------------------------------------------------------------------------
export async function getFivesSetores(companyId: string): Promise<FivesSetor[]> {
  if (!companyId) return [];

  let setores: FivesSetor[] = [];

  try {
    const { data, error } = await fivesDb
      .from("fives_setores" as any)
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: true });

    if (!error && data && data.length > 0) {
      setores = data as unknown as FivesSetor[];
    }
  } catch (e) {
    console.warn("Erro ao buscar fives_setores:", e);
  }

  if (setores.length === 0) {
    const localKey = `jarvis_5s_setores_${companyId}`;
    setores = getLocalItem<FivesSetor[]>(localKey, DEFAULT_SETORES(companyId));
  }

  // Vincula as últimas notas para ranking e selos
  const auditorias = await getFivesAuditorias(companyId);
  return enrichSetoresComNotas(setores, auditorias);
}

function enrichSetoresComNotas(setores: FivesSetor[], auditorias: FivesAuditoria[]): FivesSetor[] {
  const result = setores.map((s) => {
    const audsSetor = auditorias
      .filter((a) => a.setor_id === s.id)
      .sort((a, b) => new Date(a.data_auditoria).getTime() - new Date(b.data_auditoria).getTime());

    const historico = audsSetor.map((a) => a.nota_final_percent);
    const ultima = historico.length > 0 ? historico[historico.length - 1] : s.ultima_nota ?? 0;
    const penultima = historico.length > 1 ? historico[historico.length - 2] : ultima;

    let selo: "Ouro" | "Prata" | "Atencao" = "Atencao";
    if (ultima >= 90) selo = "Ouro";
    else if (ultima >= 80) selo = "Prata";

    let tendencia: "up" | "down" | "stable" = "stable";
    if (ultima > penultima) tendencia = "up";
    else if (ultima < penultima) tendencia = "down";

    return {
      ...s,
      ultima_nota: ultima,
      historico_notas: historico.length > 0 ? historico : s.historico_notas || [ultima],
      selo,
      tendencia,
    };
  });

  // Ordena por nota decrescente para determinar a posição do ranking
  result.sort((a, b) => (b.ultima_nota ?? 0) - (a.ultima_nota ?? 0));
  return result.map((s, idx) => ({ ...s, posicao_ranking: idx + 1 }));
}

export async function saveFivesSetor(setor: Partial<FivesSetor>): Promise<FivesSetor> {
  const companyId = setor.company_id;
  if (!companyId) throw new Error("ID da empresa é obrigatório.");

  const payload = {
    id: setor.id || crypto.randomUUID(),
    company_id: companyId,
    nome_setor: setor.nome_setor || "Novo Setor",
    descricao: setor.descricao || "",
    guardiao_nome: setor.guardiao_nome || "",
    guardiao_user_id: setor.guardiao_user_id || null,
    auditor_nome: setor.auditor_nome || "",
    auditor_user_id: setor.auditor_user_id || null,
    meta_nota: Number(setor.meta_nota) || 90,
    updated_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await fivesDb
      .from("fives_setores" as any)
      .upsert(payload)
      .select()
      .single();

    if (!error && data) {
      updateSetorCache(companyId, data as unknown as FivesSetor);
      return data as unknown as FivesSetor;
    }
  } catch (e) {
    console.warn("Erro ao salvar fives_setores no Supabase, salvando no cache local:", e);
  }

  updateSetorCache(companyId, payload as unknown as FivesSetor);
  return payload as unknown as FivesSetor;
}

function updateSetorCache(companyId: string, setor: FivesSetor) {
  const key = `jarvis_5s_setores_${companyId}`;
  const existing = getLocalItem<FivesSetor[]>(key, DEFAULT_SETORES(companyId));
  const idx = existing.findIndex((s) => s.id === setor.id);
  if (idx >= 0) existing[idx] = { ...existing[idx], ...setor };
  else existing.push(setor);
  setLocalItem(key, existing);
}

export async function deleteFivesSetor(id: string, companyId: string): Promise<boolean> {
  try {
    await fivesDb.from("fives_setores" as any).delete().eq("id", id);
  } catch (e) {
    console.warn("Erro ao excluir fives_setores no Supabase:", e);
  }

  const key = `jarvis_5s_setores_${companyId}`;
  const existing = getLocalItem<FivesSetor[]>(key, []);
  setLocalItem(key, existing.filter((s) => s.id !== id));
  return true;
}

// ---------------------------------------------------------------------------
// INSTRUÇÕES DE TRABALHO (ITs) & PADRÕES DE LIMPEZA
// ---------------------------------------------------------------------------
export async function getFivesIT(setorId: string): Promise<FivesInstrucaoTrabalho | null> {
  if (!setorId) return null;

  try {
    const { data, error } = await fivesDb
      .from("fives_instrucoes_trabalho" as any)
      .select("*")
      .eq("setor_id", setorId)
      .maybeSingle();

    if (!error && data) {
      return {
        id: data.id,
        setor_id: data.setor_id,
        titulo: data.titulo,
        documento_url: data.documento_url,
        foto_padrao_ouro_url: data.foto_padrao_ouro_url,
        rotina_limpeza: Array.isArray(data.rotina_limpeza) ? data.rotina_limpeza : [],
      };
    }
  } catch (e) {
    console.warn("Erro ao buscar fives_instrucoes_trabalho:", e);
  }

  // Fallback Local
  const localKey = `jarvis_5s_it_${setorId}`;
  return getLocalItem<FivesInstrucaoTrabalho | null>(localKey, {
    id: `it-${setorId}`,
    setor_id: setorId,
    titulo: "Instrução de Limpeza e Organização Padrão 5S",
    documento_url: "",
    foto_padrao_ouro_url: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80",
    rotina_limpeza: [
      {
        id: "rot-1",
        item_local: "Bancadas e Superfícies",
        procedimento: "Passar pano umedecido com desengraxante neutro e secar",
        produto_epi: "Detergente neutro, flanela de microfibra, luvas nitrílicas",
        frequencia: "Diária",
        responsavel: "Operador do Posto",
      },
      {
        id: "rot-2",
        item_local: "Piso e Corredores de Circulação",
        procedimento: "Varrer resíduos secos e lavar com desinfetante industrial",
        produto_epi: "Vassoura de cerdas macias, rodo, bota de segurança",
        frequencia: "Diária",
        responsavel: "Equipe de Apoio / Operador",
      },
      {
        id: "rot-3",
        item_local: "Quadros de Ferramentas e Gabinetes",
        procedimento: "Inspecionar retorno de todas as ferramentas para os suportes com sombra",
        produto_epi: "Flanela seca, óleo protetor anticorrosivo",
        frequencia: "Diária",
        responsavel: "Guardião do Setor",
      },
      {
        id: "rot-4",
        item_local: "Luminárias e Filtros de Ar",
        procedimento: "Limpeza profunda de poeiras suspensas e verificação de lâmpadas",
        produto_epi: "Pano antiestático, óculos de proteção",
        frequencia: "Quinzenal",
        responsavel: "Manutenção Preventiva",
      },
    ],
  });
}

export async function saveFivesIT(it: Partial<FivesInstrucaoTrabalho>): Promise<FivesInstrucaoTrabalho> {
  const setorId = it.setor_id;
  if (!setorId) throw new Error("ID do setor é obrigatório para salvar a IT.");

  const payload = {
    id: it.id || crypto.randomUUID(),
    setor_id: setorId,
    titulo: it.titulo || "Instrução de Trabalho 5S",
    documento_url: it.documento_url || null,
    foto_padrao_ouro_url: it.foto_padrao_ouro_url || null,
    rotina_limpeza: it.rotina_limpeza || [],
    updated_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await fivesDb
      .from("fives_instrucoes_trabalho" as any)
      .upsert(payload, { onConflict: "setor_id" })
      .select()
      .single();

    if (!error && data) {
      setLocalItem(`jarvis_5s_it_${setorId}`, data);
      return data as unknown as FivesInstrucaoTrabalho;
    }
  } catch (e) {
    console.warn("Erro ao salvar fives_instrucoes_trabalho no Supabase:", e);
  }

  setLocalItem(`jarvis_5s_it_${setorId}`, payload);
  return payload as unknown as FivesInstrucaoTrabalho;
}

// ---------------------------------------------------------------------------
// AUDITORIAS DIGITAIS E AVALIAÇÃO DOS 5 SENSOS
// ---------------------------------------------------------------------------
export async function getFivesAuditorias(companyId?: string, setorId?: string): Promise<FivesAuditoria[]> {
  try {
    let query = fivesDb.from("fives_auditorias" as any).select("*, itens:fives_auditoria_itens(*)");
    if (setorId) query = query.eq("setor_id", setorId);
    const { data, error } = await query.order("data_auditoria", { ascending: false });

    if (!error && data && data.length > 0) {
      return data as unknown as FivesAuditoria[];
    }
  } catch (e) {
    console.warn("Erro ao buscar fives_auditorias:", e);
  }

  // Fallback Local
  const localKey = companyId ? `jarvis_5s_auditorias_${companyId}` : "jarvis_5s_auditorias_global";
  const list = getLocalItem<FivesAuditoria[]>(localKey, []);
  if (setorId) return list.filter((a) => a.setor_id === setorId);
  return list;
}

export async function saveFivesAuditoria(
  auditoria: Partial<FivesAuditoria>,
  itensParam?: FivesAuditoriaItem[]
): Promise<FivesAuditoria> {
  const itens = itensParam || auditoria.itens || [];
  const setorId = auditoria.setor_id;
  if (!setorId) throw new Error("Selecione o setor auditado.");

  // Cálculo da Nota Final em % (Escala de 1 a 5 convertida para 0 a 100%)
  const totalPontosPossiveis = itens.length * 5;
  const pontosObtidos = itens.reduce((sum, item) => sum + (Number(item.nota) || 0), 0);
  const notaPercent = totalPontosPossiveis > 0 ? Math.round((pontosObtidos / totalPontosPossiveis) * 100) : 0;

  const auditoriaId = auditoria.id || crypto.randomUUID();
  const auditoriaPayload = {
    id: auditoriaId,
    setor_id: setorId,
    auditor_nome: auditoria.auditor_nome || "Auditor 5S",
    auditor_user_id: auditoria.auditor_user_id || null,
    data_auditoria: auditoria.data_auditoria || new Date().toISOString(),
    nota_final_percent: notaPercent,
    status_conclusao: "CONCLUIDO",
    observacoes_gerais: auditoria.observacoes_gerais || "",
    created_at: new Date().toISOString(),
  };

  const itensPayload = itens.map((it) => ({
    id: it.id || crypto.randomUUID(),
    auditoria_id: auditoriaId,
    senso: it.senso,
    pergunta: it.pergunta,
    nota: it.nota,
    foto_evidencia_url: it.foto_evidencia_url || null,
    observacao: it.observacao || null,
    plano_acao_o_que: it.nota < 4 ? it.plano_acao_o_que || "Correção de conformidade 5S" : null,
    plano_acao_responsavel: it.nota < 4 ? it.plano_acao_responsavel || "Guardião do Setor" : null,
    plano_acao_prazo: it.nota < 4 ? it.plano_acao_prazo || null : null,
    plano_acao_status: it.nota < 4 ? "PENDENTE" : "CONCLUIDO",
  }));

  try {
    const { error: errAud } = await fivesDb.from("fives_auditorias" as any).insert(auditoriaPayload);
    if (!errAud) {
      await fivesDb.from("fives_auditoria_itens" as any).insert(itensPayload);
    }
  } catch (e) {
    console.warn("Erro ao salvar auditoria no Supabase:", e);
  }

  // Atualiza cache local
  const companyKey = auditoria.company_id ? `jarvis_5s_auditorias_${auditoria.company_id}` : "jarvis_5s_auditorias_global";
  const existing = getLocalItem<FivesAuditoria[]>(companyKey, []);
  const novaAuditoria: FivesAuditoria = {
    ...auditoriaPayload,
    itens: itensPayload as FivesAuditoriaItem[],
  };
  setLocalItem(companyKey, [novaAuditoria, ...existing]);

  return novaAuditoria;
}

// ---------------------------------------------------------------------------
// ÁREA DO CARTÃO VERMELHO (DESCARTE PROVISÓRIO - SEIRI)
// ---------------------------------------------------------------------------
export async function getFivesDescartes(companyId?: string, setorId?: string): Promise<FivesDescarteCartaoVermelho[]> {
  try {
    let query = fivesDb.from("fives_descartes_cartao_vermelho" as any).select("*");
    if (setorId) query = query.eq("setor_id", setorId);
    const { data, error } = await query.order("created_at", { ascending: false });

    if (!error && data && data.length > 0) {
      return data as unknown as FivesDescarteCartaoVermelho[];
    }
  } catch (e) {
    console.warn("Erro ao buscar descartes do cartão vermelho:", e);
  }

  const localKey = companyId ? `jarvis_5s_descartes_${companyId}` : "jarvis_5s_descartes_global";
  const list = getLocalItem<FivesDescarteCartaoVermelho[]>(localKey, [
    {
      id: "cart-1",
      setor_id: "setor-1",
      item_descricao: "3 Paletes de madeira danificados ocupando a área de circulação",
      localizacao: "Corredor B - Próximo à Doca 2",
      foto_url: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400&auto=format&fit=crop&q=80",
      data_limite: new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString().slice(0, 10),
      destinacao_status: "PENDENTE",
      setor_nome: "Almoxarifado & Logística",
    },
    {
      id: "cart-2",
      setor_id: "setor-2",
      item_descricao: "Gabinete metálico antigo sem utilidade funcional",
      localizacao: "Atrás do torno CNC 02",
      foto_url: "https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?w=400&auto=format&fit=crop&q=80",
      data_limite: new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString().slice(0, 10),
      destinacao_status: "SUCATA",
      destinacao_observacao: "Encaminhado para a central de reciclagem da empresa",
      setor_nome: "Linha de Produção / Usinagem",
    },
  ]);

  if (setorId) return list.filter((d) => d.setor_id === setorId);
  return list;
}

export async function saveFivesDescarte(descarte: Partial<FivesDescarteCartaoVermelho>): Promise<FivesDescarteCartaoVermelho> {
  const setorId = descarte.setor_id;
  if (!setorId) throw new Error("Selecione o setor de origem do item.");

  const payload = {
    id: descarte.id || crypto.randomUUID(),
    setor_id: setorId,
    item_descricao: descarte.item_descricao || "Item sob análise de descarte",
    localizacao: descarte.localizacao || "Área de quarentena do setor",
    foto_url: descarte.foto_url || null,
    data_limite: descarte.data_limite || new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 10),
    destinacao_status: descarte.destinacao_status || "PENDENTE",
    destinacao_observacao: descarte.destinacao_observacao || null,
    created_at: new Date().toISOString(),
  };

  try {
    await fivesDb.from("fives_descartes_cartao_vermelho" as any).upsert(payload);
  } catch (e) {
    console.warn("Erro ao salvar cartão vermelho no Supabase:", e);
  }

  return payload as FivesDescarteCartaoVermelho;
}

export async function updateStatusDescarte(
  id: string,
  status: DestinacaoCartaoVermelho,
  observacao?: string
): Promise<boolean> {
  try {
    await fivesDb
      .from("fives_descartes_cartao_vermelho" as any)
      .update({ destinacao_status: status, destinacao_observacao: observacao || null })
      .eq("id", id);
  } catch (e) {
    console.warn("Erro ao atualizar status do descarte no Supabase:", e);
  }
  return true;
}

export async function deleteFivesDescarte(id: string): Promise<boolean> {
  try {
    await fivesDb.from("fives_descartes_cartao_vermelho" as any).delete().eq("id", id);
  } catch (e) {
    console.warn("Erro ao excluir cartão vermelho no Supabase:", e);
  }
  return true;
}

// ---------------------------------------------------------------------------
// MURAL ANTES VS. DEPOIS
// ---------------------------------------------------------------------------
export async function getFivesMuralFotos(companyId: string): Promise<FivesMuralFoto[]> {
  try {
    const { data, error } = await fivesDb
      .from("fives_mural_fotos" as any)
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    if (!error && data && data.length > 0) {
      return data as unknown as FivesMuralFoto[];
    }
  } catch (e) {
    console.warn("Erro ao buscar mural de fotos:", e);
  }

  const localKey = `jarvis_5s_mural_${companyId}`;
  return getLocalItem<FivesMuralFoto[]>(localKey, [
    {
      id: "mural-1",
      company_id: companyId,
      titulo: "Organização e Demarcação do Almoxarifado Central",
      descricao: "Itens no chão foram alocados em estantes rotuladas e corredores foram demarcados com fita amarela.",
      foto_antes_url: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&auto=format&fit=crop&q=80",
      foto_depois_url: "https://images.unsplash.com/photo-1553413077-190dd305871c?w=600&auto=format&fit=crop&q=80",
      data_registro: new Date().toISOString().slice(0, 10),
      setor_nome: "Almoxarifado & Logística",
    },
    {
      id: "mural-2",
      company_id: companyId,
      titulo: "Bancada Padrão Ouro na Linha de Montagem",
      descricao: "Quadro de ferramentas com silhuetas (sombras) e eliminação de cabos soltos no posto de trabalho.",
      foto_antes_url: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600&auto=format&fit=crop&q=80",
      foto_depois_url: "https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=600&auto=format&fit=crop&q=80",
      data_registro: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().slice(0, 10),
      setor_nome: "Linha de Produção / Usinagem",
    },
  ]);
}

export async function saveFivesMuralFoto(foto: Partial<FivesMuralFoto>): Promise<FivesMuralFoto> {
  const companyId = foto.company_id;
  if (!companyId) throw new Error("ID da empresa é obrigatório.");

  const payload = {
    id: foto.id || crypto.randomUUID(),
    company_id: companyId,
    setor_id: foto.setor_id || null,
    titulo: foto.titulo || "Transformação 5S",
    descricao: foto.descricao || "",
    foto_antes_url: foto.foto_antes_url || "",
    foto_depois_url: foto.foto_depois_url || "",
    data_registro: foto.data_registro || new Date().toISOString().slice(0, 10),
    created_at: new Date().toISOString(),
  };

  try {
    await fivesDb.from("fives_mural_fotos" as any).upsert(payload);
  } catch (e) {
    console.warn("Erro ao salvar mural de fotos no Supabase:", e);
  }

  const key = `jarvis_5s_mural_${companyId}`;
  const existing = getLocalItem<FivesMuralFoto[]>(key, []);
  setLocalItem(key, [payload as FivesMuralFoto, ...existing]);

  return payload as FivesMuralFoto;
}

export async function deleteFivesMuralFoto(id: string, companyId: string): Promise<boolean> {
  try {
    await fivesDb.from("fives_mural_fotos" as any).delete().eq("id", id);
  } catch (e) {
    console.warn("Erro ao excluir foto do mural no Supabase:", e);
  }

  const key = `jarvis_5s_mural_${companyId}`;
  const existing = getLocalItem<FivesMuralFoto[]>(key, []);
  setLocalItem(key, existing.filter((f) => f.id !== id));
  return true;
}

// ---------------------------------------------------------------------------
// CRONOGRAMA & EVENTOS ("DIA D", AUDITORIAS CRUZADAS)
// ---------------------------------------------------------------------------
export async function getFivesEventos(companyId: string): Promise<FivesEvento[]> {
  try {
    const { data, error } = await fivesDb
      .from("fives_eventos" as any)
      .select("*")
      .eq("company_id", companyId)
      .order("data_evento", { ascending: true });

    if (!error && data && data.length > 0) {
      return data as unknown as FivesEvento[];
    }
  } catch (e) {
    console.warn("Erro ao buscar eventos 5S:", e);
  }

  const localKey = `jarvis_5s_eventos_${companyId}`;
  return getLocalItem<FivesEvento[]>(localKey, [
    {
      id: "evt-1",
      company_id: companyId,
      titulo: "Grande 'Dia D' de Descarte e Organização",
      descricao: "Mutirão geral em toda a fábrica para descarte no Cartão Vermelho e limpeza de bancadas.",
      tipo: "DIA_D",
      data_evento: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString().slice(0, 10),
      horario: "08:00 às 12:00",
      responsavel: "Comitê Central 5S",
      concluido: false,
    },
    {
      id: "evt-2",
      company_id: companyId,
      titulo: "Auditoria Cruzada: Logística ➔ Produção",
      descricao: "Auditores do Almoxarifado farão inspeção independente na Linha de Usinagem.",
      tipo: "AUDITORIA_CRUZADA",
      data_evento: new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString().slice(0, 10),
      horario: "14:00 às 16:30",
      responsavel: "Mariana Souza",
      concluido: false,
    },
    {
      id: "evt-3",
      company_id: companyId,
      titulo: "Reunião Mensal do Comitê 5S",
      descricao: "Alinhamento de notas, premiação do Selo Ouro e análise dos Cartões Vermelhos.",
      tipo: "COMITE",
      data_evento: new Date(Date.now() + 18 * 24 * 3600 * 1000).toISOString().slice(0, 10),
      horario: "16:00 às 17:30",
      responsavel: "Carlos Eduardo Maia",
      concluido: false,
    },
  ]);
}

export async function saveFivesEvento(evento: Partial<FivesEvento>): Promise<FivesEvento> {
  const companyId = evento.company_id;
  if (!companyId) throw new Error("ID da empresa é obrigatório.");

  const payload = {
    id: evento.id || crypto.randomUUID(),
    company_id: companyId,
    setor_id: evento.setor_id || null,
    titulo: evento.titulo || "Novo Evento 5S",
    descricao: evento.descricao || "",
    tipo: evento.tipo || "DIA_D",
    data_evento: evento.data_evento || new Date().toISOString().slice(0, 10),
    horario: evento.horario || null,
    responsavel: evento.responsavel || "Comitê 5S",
    concluido: evento.concluido ?? false,
    created_at: new Date().toISOString(),
  };

  try {
    await fivesDb.from("fives_eventos" as any).upsert(payload);
  } catch (e) {
    console.warn("Erro ao salvar evento 5S no Supabase:", e);
  }

  const key = `jarvis_5s_eventos_${companyId}`;
  const existing = getLocalItem<FivesEvento[]>(key, []);
  setLocalItem(key, [...existing, payload as FivesEvento]);

  return payload as FivesEvento;
}

export async function deleteFivesEvento(id: string, companyId: string): Promise<boolean> {
  try {
    await fivesDb.from("fives_eventos" as any).delete().eq("id", id);
  } catch (e) {
    console.warn("Erro ao excluir evento 5S no Supabase:", e);
  }

  const key = `jarvis_5s_eventos_${companyId}`;
  const existing = getLocalItem<FivesEvento[]>(key, []);
  setLocalItem(key, existing.filter((e) => e.id !== id));
  return true;
}

// ---------------------------------------------------------------------------
// CONSOLIDAÇÃO DO PORTAL DO COLABORADOR 5S (PÚBLICO E AUTENTICADO)
// ---------------------------------------------------------------------------
export async function getFivesPortalDataByCompanyId(companyId: string, companyName?: string): Promise<FivesPortalData> {
  const [config, setores, auditorias, descartes, mural, eventos] = await Promise.all([
    getFivesConfig(companyId, companyName),
    getFivesSetores(companyId),
    getFivesAuditorias(companyId),
    getFivesDescartes(companyId),
    getFivesMuralFotos(companyId),
    getFivesEventos(companyId),
  ]);

  // Carrega as ITs de cada setor
  const itsMap: Record<string, FivesInstrucaoTrabalho> = {};
  await Promise.all(
    setores.map(async (s) => {
      const it = await getFivesIT(s.id);
      if (it) itsMap[s.id] = it;
    })
  );

  // Calcula Dados do Gráfico Radar (Teia dos 5 Sensos)
  const radarData: FivesRadarDataPoint[] = [
    { senso: "Seiri", nome: "Utilização (Seiri)", score: 88, fullMark: 100 },
    { senso: "Seiton", nome: "Organização (Seiton)", score: 84, fullMark: 100 },
    { senso: "Seiso", nome: "Limpeza (Seiso)", score: 92, fullMark: 100 },
    { senso: "Seiketsu", nome: "Padronização (Seiketsu)", score: 80, fullMark: 100 },
    { senso: "Shitsuke", nome: "Disciplina (Shitsuke)", score: 85, fullMark: 100 },
  ];

  // Se houver auditorias com itens pontuados, calcula médias reais por senso
  if (auditorias.length > 0) {
    const scoresPorSenso: Record<Senso5S, { soma: number; count: number }> = {
      Seiri: { soma: 0, count: 0 },
      Seiton: { soma: 0, count: 0 },
      Seiso: { soma: 0, count: 0 },
      Seiketsu: { soma: 0, count: 0 },
      Shitsuke: { soma: 0, count: 0 },
    };

    auditorias.forEach((a) => {
      (a.itens || []).forEach((item) => {
        if (scoresPorSenso[item.senso]) {
          scoresPorSenso[item.senso].soma += item.nota;
          scoresPorSenso[item.senso].count += 1;
        }
      });
    });

    radarData.forEach((point) => {
      const calc = scoresPorSenso[point.senso];
      if (calc && calc.count > 0) {
        point.score = Math.round((calc.soma / (calc.count * 5)) * 100);
      }
    });
  }

  // KPIs Consolidados
  const setorCampeao = setores.length > 0 ? setores[0] : null;
  const notaMediaGlobal =
    setores.length > 0
      ? Math.round(setores.reduce((acc, s) => acc + (s.ultima_nota || 0), 0) / setores.length)
      : 85;

  const totalPlanosAcao = auditorias.reduce(
    (acc, a) => acc + (a.itens?.filter((i) => i.nota < 4).length || 0),
    0
  );

  return {
    config,
    company: {
      id: companyId,
      name: companyName || "Empresa Cliente",
      logo_url: config.logo_url || null,
      primary_color: config.primary_color,
      secondary_color: config.secondary_color,
      bg_color: config.bg_color,
    },
    setores,
    auditoriasRecentes: auditorias.slice(0, 10),
    radarData,
    kpis: {
      setorCampeao,
      notaMediaGlobal,
      sensoDestaqueMes: config.senso_destaque_mes || "Seiso (Limpeza)",
      totalAuditorias: auditorias.length,
      totalDescartes: descartes.length,
      totalPlanosAcao,
    },
    muralFotos: mural,
    instrucoesTrabalho: itsMap,
    cartoesVermelhos: descartes,
    eventos,
  };
}

export async function getFivesPortalDataByHash(hash: string): Promise<FivesPortalData | null> {
  if (!hash) return null;

  try {
    // 1. Tenta buscar configuração com o hash correspondente
    const { data: cfg } = await fivesDb
      .from("fives_configuracoes" as any)
      .select("*, companies(id, name, public_company_logo_url)")
      .eq("url_hash", hash)
      .maybeSingle();

    if (cfg && cfg.company_id) {
      const companyName = (cfg as any).companies?.name || "Empresa Parceira";
      return getFivesPortalDataByCompanyId(cfg.company_id, companyName);
    }

    // 2. Tenta buscar pelo public_token ou ID direto da company
    const { data: comp } = await supabase
      .from("companies")
      .select("id, name, public_company_logo_url, public_token")
      .or(`public_token.eq.${hash},id.eq.${hash}`)
      .maybeSingle();

    if (comp) {
      return getFivesPortalDataByCompanyId(comp.id, comp.name);
    }
  } catch (e) {
    console.warn("Erro ao buscar portal 5S por hash via Supabase:", e);
  }

  // Fallback demo caso o hash comece com 5s_
  const demoCompanyId = hash.replace(/^5s_/, "") || "demo";
  return getFivesPortalDataByCompanyId(demoCompanyId, "Indústria Modelo 5S");
}
