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
  FivesCronogramaProjeto,
  FivesPerguntaCustomizada,
} from "./fives-types";

const fivesDb = supabase as any;

// Notificador de Atualização Global (Cross-Tab e Real-time Local)
export function notify5SUpdate(companyId?: string) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("jarvis_5s_data_updated", { detail: { companyId } }));
    try {
      localStorage.setItem("jarvis_5s_last_update", Date.now().toString());
    } catch {}
  }
}

// Perguntas Padrão do Checklist Oficial dos 5 Sensos (Aprofundado: 4 Critérios por Senso = 20 Perguntas Técnicas)
export const CHECKLIST_PADRAO_5S: Array<{ senso: Senso5S; pergunta: string; dica: string; ordem?: number }> = [
  // 1. SEIRI (Utilização / Descarte de Excessos)
  {
    senso: "Seiri",
    pergunta: "Itens desnecessários, quebrados, obsoletos ou sem uso há mais de 30 dias foram identificados e retirados?",
    dica: "Observe ferramentas danificadas, peças defeituosas, amostras antigas e materiais fora de especificação.",
    ordem: 1,
  },
  {
    senso: "Seiri",
    pergunta: "A sistemática de Cartão Vermelho (quarentena de descarte) está sendo aplicada corretamente no setor?",
    dica: "Verifique se itens com descarte incerto possuem etiqueta com data limite e local demarcado de quarentena.",
    ordem: 2,
  },
  {
    senso: "Seiri",
    pergunta: "Documentos em papel, pastas físicas e arquivos digitais do setor estão livres de duplicidades e versões vencidas?",
    dica: "Cheque gavetas, arquivos de aço, quadros informativos e pastas na rede local ou nuvem.",
    ordem: 3,
  },
  {
    senso: "Seiri",
    pergunta: "A quantidade de materiais, insumos e peças no posto de trabalho é estritamente a necessária para o turno/dia?",
    dica: "Evitar superdimensionamento de estoque intermediário sobre bancadas e corredores de circulação.",
    ordem: 4,
  },

  // 2. SEITON (Organização / Ordenação e Endereçamento)
  {
    senso: "Seiton",
    pergunta: "Todas as ferramentas, instrumentos e materiais possuem local fixo com identificação visual clara e inequívoca?",
    dica: "Examine quadros de sombra, etiquetas identificadoras nas gavetas e prateleiras devidamente numeradas.",
    ordem: 5,
  },
  {
    senso: "Seiton",
    pergunta: "Demarcações visuais no solo/bancadas delimitam adequadamente vias de pedestres, pallets e equipamentos móveis?",
    dica: "Faixas amarelas/zebradas no piso conservadas, sem apagamento e respeitadas na operação diária.",
    ordem: 6,
  },
  {
    senso: "Seiton",
    pergunta: "A disposição dos itens segue o princípio ergonômico de frequência de uso (mais usados ao alcance fácil)?",
    dica: "Itens diários ao alcance das mãos sem exigir curvatura do corpo; itens pesados nas prateleiras inferiores.",
    ordem: 7,
  },
  {
    senso: "Seiton",
    pergunta: "Rotas de fuga, extintores de incêndio, hidrantes, macas e painéis elétricos estão 100% desobstruídos e sinalizados?",
    dica: "Área de segurança de pelo menos 1 metro de raio livre à frente de qualquer dispositivo emergencial.",
    ordem: 8,
  },

  // 3. SEISO (Limpeza / Inspeção de Fontes de Sujeira)
  {
    senso: "Seiso",
    pergunta: "Bancadas, pisos, painéis, máquinas e ferramentas estão limpos e livres de poeira, cavacos, graxa ou resíduos?",
    dica: "A limpeza deve ser impecável tanto na superfície visível quanto nas partes internas e sob as bancadas.",
    ordem: 9,
  },
  {
    senso: "Seiso",
    pergunta: "A limpeza é realizada pelo operador com inspeção preventiva de quebras, folgas, ruídos e trincas mecânicas?",
    dica: "O ato de limpar serve como primeira linha de defesa da manutenção autônoma do equipamento.",
    ordem: 10,
  },
  {
    senso: "Seiso",
    pergunta: "Fontes geradoras de sujeira, respingos ou vazamentos de fluidos foram identificadas, contidas e bloqueadas?",
    dica: "Eliminar a causa-raiz que gera a contaminação em vez de apenas limpar repetidamente o sintoma.",
    ordem: 11,
  },
  {
    senso: "Seiso",
    pergunta: "Coletores de lixo estão identificados, com sacos adequados, tampa operante e coleta seletiva rigorosamente respeitada?",
    dica: "Orgânico, recicláveis, contaminados e resíduos industriais separados sem misturas indevidas.",
    ordem: 12,
  },

  // 4. SEIKETSU (Padronização / Saúde, Higiene e Segurança)
  {
    senso: "Seiketsu",
    pergunta: "A fotografia de referência do 'Padrão Ouro (Estado Ideal)' está visível no mural do setor e sendo cumprida?",
    dica: "Compare a realidade atual do setor com a foto oficial homologada pela liderança e comitê 5S.",
    ordem: 13,
  },
  {
    senso: "Seiketsu",
    pergunta: "A Instrução de Trabalho (IT) de Limpeza e a matriz de rotinas estão atualizadas, legíveis e afixadas no setor?",
    dica: "Tabela com itens, procedimentos, periodicidades (diária/semanal/mensal) e responsáveis claros.",
    ordem: 14,
  },
  {
    senso: "Seiketsu",
    pergunta: "As condições de iluminação, ruído, ventilação, climatização e postura ergonômica atendem aos padrões de bem-estar?",
    dica: "Garantir ambiente sadio, seguro e confortável para a saúde física e mental dos colaboradores.",
    ordem: 15,
  },
  {
    senso: "Seiketsu",
    pergunta: "Os Equipamentos de Proteção Individual (EPIs) exigidos para o setor estão em uso correto e bem conservados?",
    dica: "Óculos, protetor auricular, calçado de segurança e luvas adequadas conforme matriz de risco do setor.",
    ordem: 16,
  },

  // 5. SHITSUKE (Disciplina / Autodisciplina e Melhoria Contínua)
  {
    senso: "Shitsuke",
    pergunta: "Os colaboradores cumprem os procedimentos de 5S e padrões operacionais por hábito natural, sem necessidade de cobrança?",
    dica: "Avalie a maturidade cultural da equipe: organização mantida mesmo no final de expediente ou picos de produção.",
    ordem: 17,
  },
  {
    senso: "Shitsuke",
    pergunta: "Todos os Planos de Ação decorrentes de auditorias anteriores foram executados dentro do prazo acordado?",
    dica: "Verificar se há ações atrasadas ou pendências crônicas registradas no sistema do comitê.",
    ordem: 18,
  },
  {
    senso: "Shitsuke",
    pergunta: "O Guardião do Setor lidera ativamente a manutenção dos padrões e participa com regularidade das reuniões do 5S?",
    dica: "O líder do setor deve ser o exemplo vivo e facilitador das demandas e melhorias da equipe.",
    ordem: 19,
  },
  {
    senso: "Shitsuke",
    pergunta: "A equipe propõe ativamente sugestões de melhoria contínua (Kaizen) para aperfeiçoar os padrões e ITs existentes?",
    dica: "Valorizar ideias práticas dos operadores que tornam a limpeza e organização mais rápidas e seguras.",
    ordem: 20,
  },
];

// Helper de Formatação de Data Brasileira (DD/MM/AAAA)
export function formatFivesDate(dateStr?: string | null): string {
  if (!dateStr) return "";
  if (dateStr.includes("/")) return dateStr;
  const parts = dateStr.split("T")[0].split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

// ---------------------------------------------------------------------------
// Persistência: tudo fica no banco protegido por empresa, para que site e
// celular mostrem exatamente os mesmos dados. Nada é guardado só no navegador.
// ---------------------------------------------------------------------------
function failOn(error: unknown, message: string): void {
  if (error) {
    console.error(message, error);
    throw new Error(message);
  }
}

export function isUuid(val?: string | null): boolean {
  if (!val) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
}

function ensureId(id?: string | null): string {
  return isUuid(id) ? (id as string) : crypto.randomUUID();
}

function emptyConfig(companyId: string, companyName?: string): FivesConfiguracao {
  return {
    id: "",
    company_id: companyId,
    company_name: companyName || null,
    url_hash: "",
    logo_url: null,
    header_banner_url: null,
    slogan_campanha: `Programa 5S${companyName ? " • " + companyName : ""}: Um lugar para cada coisa e cada coisa no seu lugar.`,
    primary_color: "#3E100C",
    secondary_color: "#E05A10",
    bg_color: "#FFF8F5",
    senso_destaque_mes: "Seiso (Limpeza)",
    comite_membros: [],
  };
}

function normalizeConfig(data: any, companyName?: string, companyLogo?: string | null): FivesConfiguracao {
  return {
    id: data.id,
    company_id: data.company_id,
    company_name: data.company_name || companyName || null,
    url_hash: data.url_hash,
    logo_url: data.logo_url || companyLogo || null,
    header_banner_url: data.header_banner_url,
    slogan_campanha: data.slogan_campanha,
    primary_color: data.primary_color || "#3E100C",
    secondary_color: data.secondary_color || "#E05A10",
    bg_color: data.bg_color || "#FFF8F5",
    senso_destaque_mes: data.senso_destaque_mes,
    comite_membros: Array.isArray(data.comite_membros) ? data.comite_membros : [],
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

async function getCompanyBasics(companyId: string): Promise<{ name?: string; logo?: string | null }> {
  const { data } = await supabase.from("companies").select("name, public_company_logo_url").eq("id", companyId).maybeSingle();
  return { name: data?.name || undefined, logo: data?.public_company_logo_url || null };
}

// ---------------------------------------------------------------------------
// CONFIGURAÇÕES WHITELABEL
// ---------------------------------------------------------------------------
export async function getFivesConfig(companyId: string, companyName?: string): Promise<FivesConfiguracao> {
  if (!isUuid(companyId)) return emptyConfig(companyId, companyName);
  const { data, error } = await fivesDb.from("fives_configuracoes").select("*").eq("company_id", companyId).maybeSingle();
  failOn(error, "Não foi possível carregar a configuração do 5S.");
  const basics = await getCompanyBasics(companyId);
  const name = companyName || basics.name;
  if (data) return normalizeConfig(data, name, basics.logo);

  // Primeiro acesso da empresa: cria a configuração (o link público recebe um código aleatório).
  const base = emptyConfig(companyId, name);
  const { data: inserted, error: insertError } = await fivesDb
    .from("fives_configuracoes")
    .insert({
      company_id: companyId,
      company_name: name || null,
      slogan_campanha: base.slogan_campanha,
      senso_destaque_mes: base.senso_destaque_mes,
    })
    .select()
    .maybeSingle();
  if (insertError || !inserted) {
    // Sem permissão para criar: mostra a configuração padrão sem salvar.
    return { ...base, logo_url: basics.logo || null };
  }
  return normalizeConfig(inserted, name, basics.logo);
}

export async function saveFivesConfig(config: Partial<FivesConfiguracao>): Promise<FivesConfiguracao> {
  const companyId = config.company_id;
  if (!companyId || !isUuid(companyId)) throw new Error("Selecione uma empresa válida.");
  const payload = {
    company_id: companyId,
    company_name: config.company_name || null,
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
  const { data, error } = await fivesDb.from("fives_configuracoes").upsert(payload, { onConflict: "company_id" }).select().single();
  failOn(error, "Não foi possível salvar a configuração do 5S.");
  notify5SUpdate(companyId);
  return normalizeConfig(data);
}

// ---------------------------------------------------------------------------
// SETORES
// ---------------------------------------------------------------------------
export async function getFivesSetores(companyId: string): Promise<FivesSetor[]> {
  if (!isUuid(companyId)) return [];
  const { data, error } = await fivesDb.from("fives_setores").select("*").eq("company_id", companyId).order("created_at", { ascending: true });
  failOn(error, "Não foi possível carregar os setores do 5S.");
  const auditorias = await getFivesAuditorias(companyId);
  return enrichSetoresComNotas((data || []) as FivesSetor[], auditorias);
}

function enrichSetoresComNotas(setores: FivesSetor[], auditorias: FivesAuditoria[]): FivesSetor[] {
  const result = setores.map((s) => {
    const historico = auditorias
      .filter((a) => a.setor_id === s.id)
      .sort((a, b) => new Date(a.data_auditoria).getTime() - new Date(b.data_auditoria).getTime())
      .map((a) => Number(a.nota_final_percent));
    const ultima = historico.length > 0 ? historico[historico.length - 1] : null;
    const penultima = historico.length > 1 ? historico[historico.length - 2] : ultima;
    let selo: "Ouro" | "Prata" | "Atencao" = "Atencao";
    if ((ultima ?? 0) >= 90) selo = "Ouro";
    else if ((ultima ?? 0) >= 80) selo = "Prata";
    let tendencia: "up" | "down" | "stable" = "stable";
    if (ultima !== null && penultima !== null) {
      if (ultima > penultima) tendencia = "up";
      else if (ultima < penultima) tendencia = "down";
    }
    return { ...s, meta_nota: Number(s.meta_nota), ultima_nota: ultima, historico_notas: historico, selo, tendencia };
  });
  result.sort((a, b) => (b.ultima_nota ?? -1) - (a.ultima_nota ?? -1));
  return result.map((s, idx) => ({ ...s, posicao_ranking: idx + 1 }));
}

export async function saveFivesSetor(setor: Partial<FivesSetor>): Promise<FivesSetor> {
  const companyId = setor.company_id;
  if (!companyId || !isUuid(companyId)) throw new Error("Selecione uma empresa válida.");
  const payload = {
    id: ensureId(setor.id),
    company_id: companyId,
    nome_setor: setor.nome_setor || "Novo Setor",
    descricao: setor.descricao || "",
    guardiao_nome: setor.guardiao_nome || "",
    guardiao_user_id: isUuid(setor.guardiao_user_id) ? setor.guardiao_user_id : null,
    auditor_nome: setor.auditor_nome || "",
    auditor_user_id: isUuid(setor.auditor_user_id) ? setor.auditor_user_id : null,
    meta_nota: Number(setor.meta_nota) || 90,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await fivesDb.from("fives_setores").upsert(payload).select().single();
  failOn(error, "Não foi possível salvar o setor.");
  notify5SUpdate(companyId);
  return data as FivesSetor;
}

export async function deleteFivesSetor(id: string, companyId: string): Promise<boolean> {
  const { error } = await fivesDb.from("fives_setores").delete().eq("id", id);
  failOn(error, "Não foi possível excluir o setor.");
  notify5SUpdate(companyId);
  return true;
}

// ---------------------------------------------------------------------------
// INSTRUÇÕES DE TRABALHO (ITs) & PADRÕES DE LIMPEZA
// ---------------------------------------------------------------------------
function normalizeIT(data: any): FivesInstrucaoTrabalho {
  return {
    id: data.id,
    setor_id: data.setor_id,
    titulo: data.titulo,
    documento_url: data.documento_url,
    foto_padrao_ouro_url: data.foto_padrao_ouro_url,
    rotina_limpeza: Array.isArray(data.rotina_limpeza) ? data.rotina_limpeza : [],
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

export async function getFivesIT(setorId: string): Promise<FivesInstrucaoTrabalho | null> {
  if (!isUuid(setorId)) return null;
  const { data, error } = await fivesDb.from("fives_instrucoes_trabalho").select("*").eq("setor_id", setorId).maybeSingle();
  failOn(error, "Não foi possível carregar a instrução de trabalho.");
  return data ? normalizeIT(data) : null;
}

export async function saveFivesIT(it: Partial<FivesInstrucaoTrabalho>): Promise<FivesInstrucaoTrabalho> {
  const setorId = it.setor_id;
  if (!setorId || !isUuid(setorId)) throw new Error("Salve o setor antes de cadastrar a instrução de trabalho.");
  const payload = {
    setor_id: setorId,
    titulo: it.titulo || "Instrução de Trabalho 5S",
    documento_url: it.documento_url || null,
    foto_padrao_ouro_url: it.foto_padrao_ouro_url || null,
    rotina_limpeza: it.rotina_limpeza || [],
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await fivesDb.from("fives_instrucoes_trabalho").upsert(payload, { onConflict: "setor_id" }).select().single();
  failOn(error, "Não foi possível salvar a instrução de trabalho.");
  notify5SUpdate();
  return normalizeIT(data);
}

// ---------------------------------------------------------------------------
// AUDITORIAS
// ---------------------------------------------------------------------------
export async function getFivesAuditorias(companyId?: string, setorId?: string): Promise<FivesAuditoria[]> {
  let query = fivesDb.from("fives_auditorias").select("*, itens:fives_auditoria_itens(*), setor:fives_setores!inner(company_id, nome_setor)");
  if (companyId && isUuid(companyId)) query = query.eq("setor.company_id", companyId);
  else if (companyId) return [];
  if (setorId) query = query.eq("setor_id", setorId);
  const { data, error } = await query.order("data_auditoria", { ascending: false });
  failOn(error, "Não foi possível carregar as auditorias do 5S.");
  return ((data || []) as any[]).map(({ setor, ...a }) => ({
    ...a,
    company_id: setor?.company_id,
    nota_final_percent: Number(a.nota_final_percent),
  })) as FivesAuditoria[];
}

export async function saveFivesAuditoria(
  auditoria: Partial<FivesAuditoria>,
  itensParam?: FivesAuditoriaItem[]
): Promise<FivesAuditoria> {
  const itens = itensParam || auditoria.itens || [];
  const setorId = auditoria.setor_id;
  if (!setorId || !isUuid(setorId)) throw new Error("Selecione o setor auditado.");

  const totalPontosPossiveis = itens.length * 5;
  const pontosObtidos = itens.reduce((sum, item) => sum + (Number(item.nota) || 0), 0);
  const notaPercent = totalPontosPossiveis > 0 ? Math.round((pontosObtidos / totalPontosPossiveis) * 100) : 0;
  const auditoriaId = ensureId(auditoria.id);
  const auditoriaPayload = {
    id: auditoriaId,
    setor_id: setorId,
    auditor_nome: auditoria.auditor_nome || "Auditor 5S",
    auditor_user_id: isUuid(auditoria.auditor_user_id) ? auditoria.auditor_user_id : null,
    data_auditoria: auditoria.data_auditoria || new Date().toISOString(),
    nota_final_percent: notaPercent,
    status_conclusao: "CONCLUIDO",
    observacoes_gerais: auditoria.observacoes_gerais || "",
  };
  const itensPayload = itens.map((it) => ({
    id: ensureId(it.id),
    auditoria_id: auditoriaId,
    senso: it.senso,
    pergunta: it.pergunta,
    nota: it.nota,
    foto_evidencia_url: it.foto_evidencia_url || null,
    observacao: it.observacao || null,
    plano_acao_o_que: it.nota < 4 ? it.plano_acao_o_que || "Correção de conformidade 5S" : null,
    plano_acao_responsavel: it.nota < 4 ? it.plano_acao_responsavel || "Guardião do Setor" : null,
    plano_acao_prazo: it.nota < 4 ? it.plano_acao_prazo || null : null,
    plano_acao_status: it.nota < 4 ? it.plano_acao_status || "PENDENTE" : "CONCLUIDO",
  }));

  const { error: errAud } = await fivesDb.from("fives_auditorias").upsert(auditoriaPayload);
  failOn(errAud, "Não foi possível salvar a auditoria.");
  const { error: errDel } = await fivesDb.from("fives_auditoria_itens").delete().eq("auditoria_id", auditoriaId);
  failOn(errDel, "Não foi possível atualizar os itens da auditoria.");
  if (itensPayload.length > 0) {
    const { error: errItens } = await fivesDb.from("fives_auditoria_itens").insert(itensPayload);
    failOn(errItens, "Não foi possível salvar os itens da auditoria.");
  }
  notify5SUpdate(auditoria.company_id);
  return { ...auditoriaPayload, company_id: auditoria.company_id, itens: itensPayload as FivesAuditoriaItem[] };
}

export async function deleteFivesAuditoria(id: string, companyId?: string): Promise<boolean> {
  const { error } = await fivesDb.from("fives_auditorias").delete().eq("id", id);
  failOn(error, "Não foi possível excluir a auditoria.");
  notify5SUpdate(companyId);
  return true;
}

export async function updateFivesAuditoria(auditoria: FivesAuditoria, companyId?: string): Promise<FivesAuditoria> {
  return saveFivesAuditoria({ ...auditoria, company_id: companyId || auditoria.company_id }, auditoria.itens);
}

// ---------------------------------------------------------------------------
// CARTÃO VERMELHO (Descarte provisório - Seiri)
// ---------------------------------------------------------------------------
export async function getFivesDescartes(companyId?: string, setorId?: string): Promise<FivesDescarteCartaoVermelho[]> {
  let query = fivesDb.from("fives_descartes_cartao_vermelho").select("*, setor:fives_setores!inner(company_id, nome_setor)");
  if (companyId && isUuid(companyId)) query = query.eq("setor.company_id", companyId);
  else if (companyId) return [];
  if (setorId) query = query.eq("setor_id", setorId);
  const { data, error } = await query.order("created_at", { ascending: false });
  failOn(error, "Não foi possível carregar os cartões vermelhos.");
  return ((data || []) as any[]).map(({ setor, ...d }) => ({ ...d, setor_nome: setor?.nome_setor })) as FivesDescarteCartaoVermelho[];
}

export async function saveFivesDescarte(descarte: Partial<FivesDescarteCartaoVermelho>): Promise<FivesDescarteCartaoVermelho> {
  const setorId = descarte.setor_id;
  if (!setorId || !isUuid(setorId)) throw new Error("Selecione o setor de origem do item.");
  const payload = {
    id: ensureId(descarte.id),
    setor_id: setorId,
    item_descricao: descarte.item_descricao || "Item sob análise de descarte",
    localizacao: descarte.localizacao || "Área de quarentena do setor",
    foto_url: descarte.foto_url || null,
    data_limite: descarte.data_limite || new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 10),
    destinacao_status: descarte.destinacao_status || "PENDENTE",
    destinacao_observacao: descarte.destinacao_observacao || null,
    arquivado: descarte.arquivado ?? false,
    data_conclusao: descarte.data_conclusao || null,
  };
  const { data, error } = await fivesDb.from("fives_descartes_cartao_vermelho").upsert(payload).select().single();
  failOn(error, "Não foi possível salvar o cartão vermelho.");
  notify5SUpdate();
  return data as FivesDescarteCartaoVermelho;
}

export async function updateStatusDescarte(id: string, status: DestinacaoCartaoVermelho, observacao?: string): Promise<boolean> {
  const isConcluido = status === "CONCLUIDO";
  const update: Record<string, unknown> = {
    destinacao_status: status,
    arquivado: isConcluido,
    data_conclusao: isConcluido ? new Date().toISOString() : null,
  };
  if (observacao !== undefined) update.destinacao_observacao = observacao;
  const { error } = await fivesDb.from("fives_descartes_cartao_vermelho").update(update).eq("id", id);
  failOn(error, "Não foi possível atualizar o cartão vermelho.");
  notify5SUpdate();
  return true;
}

export async function archivarDescarte(id: string): Promise<boolean> {
  return updateStatusDescarte(id, "CONCLUIDO", "Arquivado como concluído pelo gestor.");
}

export async function deleteFivesDescarte(id: string): Promise<boolean> {
  const { error } = await fivesDb.from("fives_descartes_cartao_vermelho").delete().eq("id", id);
  failOn(error, "Não foi possível excluir o cartão vermelho.");
  notify5SUpdate();
  return true;
}

// ---------------------------------------------------------------------------
// MURAL ANTES vs DEPOIS
// ---------------------------------------------------------------------------
export async function getFivesMuralFotos(companyId: string): Promise<FivesMuralFoto[]> {
  if (!isUuid(companyId)) return [];
  const { data, error } = await fivesDb.from("fives_mural_fotos").select("*").eq("company_id", companyId).order("created_at", { ascending: false });
  failOn(error, "Não foi possível carregar o mural.");
  return (data || []) as FivesMuralFoto[];
}

export async function saveFivesMuralFoto(foto: Partial<FivesMuralFoto>): Promise<FivesMuralFoto> {
  const companyId = foto.company_id;
  if (!companyId || !isUuid(companyId)) throw new Error("Selecione uma empresa válida.");
  const payload = {
    id: ensureId(foto.id),
    company_id: companyId,
    setor_id: isUuid(foto.setor_id) ? foto.setor_id : null,
    titulo: foto.titulo || "Transformação 5S",
    descricao: foto.descricao || "",
    foto_antes_url: foto.foto_antes_url || "",
    foto_depois_url: foto.foto_depois_url || "",
    data_registro: foto.data_registro || new Date().toISOString().slice(0, 10),
  };
  const { data, error } = await fivesDb.from("fives_mural_fotos").upsert(payload).select().single();
  failOn(error, "Não foi possível salvar a transformação no mural.");
  notify5SUpdate(companyId);
  return data as FivesMuralFoto;
}

export async function deleteFivesMuralFoto(id: string, companyId: string): Promise<boolean> {
  const { error } = await fivesDb.from("fives_mural_fotos").delete().eq("id", id);
  failOn(error, "Não foi possível excluir a foto do mural.");
  notify5SUpdate(companyId);
  return true;
}

// ---------------------------------------------------------------------------
// EVENTOS / DIA D
// ---------------------------------------------------------------------------
export async function getFivesEventos(companyId: string): Promise<FivesEvento[]> {
  if (!isUuid(companyId)) return [];
  const { data, error } = await fivesDb.from("fives_eventos").select("*").eq("company_id", companyId).order("data_evento", { ascending: true });
  failOn(error, "Não foi possível carregar os eventos do 5S.");
  return (data || []) as FivesEvento[];
}

export async function saveFivesEvento(evento: Partial<FivesEvento>): Promise<FivesEvento> {
  const companyId = evento.company_id;
  if (!companyId || !isUuid(companyId)) throw new Error("Selecione uma empresa válida.");
  const payload = {
    id: ensureId(evento.id),
    company_id: companyId,
    setor_id: isUuid(evento.setor_id) ? evento.setor_id : null,
    titulo: evento.titulo || "Novo Evento 5S",
    descricao: evento.descricao || "",
    tipo: evento.tipo || "DIA_D",
    data_evento: evento.data_evento || new Date().toISOString().slice(0, 10),
    horario: evento.horario || null,
    responsavel: evento.responsavel || "Comitê 5S",
    concluido: evento.concluido ?? false,
  };
  const { data, error } = await fivesDb.from("fives_eventos").upsert(payload).select().single();
  failOn(error, "Não foi possível salvar o evento.");
  notify5SUpdate(companyId);
  return data as FivesEvento;
}

export async function deleteFivesEvento(id: string, companyId: string): Promise<boolean> {
  const { error } = await fivesDb.from("fives_eventos").delete().eq("id", id);
  failOn(error, "Não foi possível excluir o evento.");
  notify5SUpdate(companyId);
  return true;
}

// ---------------------------------------------------------------------------
// CRONOGRAMA DE IMPLANTAÇÃO
// ---------------------------------------------------------------------------
const ETAPAS_PADRAO_CRONOGRAMA: Omit<FivesCronogramaProjeto, "id" | "company_id" | "created_at">[] = [
  { etapa_titulo: "Sensibilização e Formação do Comitê 5S", descricao: "Palestras de conscientização, definição dos membros do Comitê 5S e nomeação dos Guardiões de Setor.", data_inicio: null, data_fim: null, data_execucao: null, responsavel: "Maia Consultoria", status: "PENDENTE", ordem: 1 },
  { etapa_titulo: "Mapeamento de Áreas e Treinamentos", descricao: "Definição das zonas/setores auditados, treinamento prático dos auditores internos e capacitação dos guardiões.", data_inicio: null, data_fim: null, data_execucao: null, responsavel: "Comitê 5S", status: "PENDENTE", ordem: 2 },
  { etapa_titulo: "Grande Bota-Fora (Dia D)", descricao: "Mutirão geral de descarte com Cartão Vermelho aplicado em todos os setores simultaneamente.", data_inicio: null, data_fim: null, data_execucao: null, responsavel: "Comitê 5S + Guardiões", status: "PENDENTE", ordem: 3 },
  { etapa_titulo: "Implantação dos Sensos (Seiri → Shitsuke)", descricao: "Ciclo sequencial de implantação dos 5 Sensos com treinamentos práticos por etapa e auditoria de verificação.", data_inicio: null, data_fim: null, data_execucao: null, responsavel: "Guardiões de Setor", status: "PENDENTE", ordem: 4 },
  { etapa_titulo: "Ciclo de Auditorias Contínuas e Premiação", descricao: "Auditorias cruzadas mensais, apuração do Ranking de Setores, premiação Selo Ouro/Prata e reconhecimento dos destaques.", data_inicio: null, data_fim: null, data_execucao: null, responsavel: "Auditores + Maia Consultoria", status: "PENDENTE", ordem: 5 },
];

function etapasPadrao(companyId: string): FivesCronogramaProjeto[] {
  // Sugestão de etapas exibida até a empresa salvar o próprio cronograma.
  return ETAPAS_PADRAO_CRONOGRAMA.map((e, idx) => ({ ...e, id: `padrao-crono-${idx}`, company_id: companyId }));
}

export async function getFivesCronogramaProjeto(companyId: string): Promise<FivesCronogramaProjeto[]> {
  if (!isUuid(companyId)) return [];
  const { data, error } = await fivesDb.from("fives_cronograma_projeto").select("*").eq("company_id", companyId).order("ordem", { ascending: true });
  failOn(error, "Não foi possível carregar o cronograma do 5S.");
  return data && data.length > 0 ? (data as FivesCronogramaProjeto[]) : etapasPadrao(companyId);
}

export async function saveFivesCronogramaEtapa(etapa: Partial<FivesCronogramaProjeto>): Promise<FivesCronogramaProjeto> {
  const companyId = etapa.company_id;
  if (!companyId || !isUuid(companyId)) throw new Error("Selecione uma empresa válida.");
  const payload = {
    id: ensureId(etapa.id),
    company_id: companyId,
    etapa_titulo: etapa.etapa_titulo || "Etapa 5S",
    descricao: etapa.descricao || null,
    data_inicio: etapa.data_inicio || null,
    data_fim: etapa.data_fim || null,
    data_execucao: etapa.data_execucao || null,
    responsavel: etapa.responsavel || null,
    status: etapa.status || "PENDENTE",
    ordem: etapa.ordem ?? 1,
  };
  const { data, error } = await fivesDb.from("fives_cronograma_projeto").upsert(payload).select().single();
  failOn(error, "Não foi possível salvar a etapa do cronograma.");
  notify5SUpdate(companyId);
  return data as FivesCronogramaProjeto;
}

export async function deleteFivesCronogramaEtapa(id: string, companyId: string): Promise<boolean> {
  if (!isUuid(id)) return true;
  const { error } = await fivesDb.from("fives_cronograma_projeto").delete().eq("id", id);
  failOn(error, "Não foi possível excluir a etapa do cronograma.");
  notify5SUpdate(companyId);
  return true;
}

// ---------------------------------------------------------------------------
// MONTAGEM DO PORTAL (interno e público usam o mesmo cálculo)
// ---------------------------------------------------------------------------
const NOMES_RADAR: Record<Senso5S, string> = {
  Seiri: "Utilização (Seiri)",
  Seiton: "Organização (Seiton)",
  Seiso: "Limpeza (Seiso)",
  Seiketsu: "Padronização (Seiketsu)",
  Shitsuke: "Disciplina (Shitsuke)",
};

function assemblePortalData(input: {
  companyId: string;
  companyName?: string;
  config: FivesConfiguracao;
  setores: FivesSetor[];
  auditorias: FivesAuditoria[];
  descartes: FivesDescarteCartaoVermelho[];
  mural: FivesMuralFoto[];
  eventos: FivesEvento[];
  cronograma: FivesCronogramaProjeto[];
  itsMap: Record<string, FivesInstrucaoTrabalho>;
}): FivesPortalData {
  const { config, setores, auditorias, descartes } = input;
  const scores: Record<Senso5S, { soma: number; count: number }> = {
    Seiri: { soma: 0, count: 0 }, Seiton: { soma: 0, count: 0 }, Seiso: { soma: 0, count: 0 },
    Seiketsu: { soma: 0, count: 0 }, Shitsuke: { soma: 0, count: 0 },
  };
  auditorias.forEach((a) => (a.itens || []).forEach((item) => {
    const key = (Object.keys(scores) as Senso5S[]).find((s) => s.toLowerCase() === String(item.senso).toLowerCase());
    if (key) { scores[key].soma += Number(item.nota) || 0; scores[key].count += 1; }
  }));
  // Sem auditorias, o radar fica zerado: nunca exibimos notas inventadas.
  const radarData: FivesRadarDataPoint[] = (Object.keys(NOMES_RADAR) as Senso5S[]).map((senso) => ({
    senso,
    nome: NOMES_RADAR[senso],
    score: scores[senso].count > 0 ? Math.round((scores[senso].soma / (scores[senso].count * 5)) * 100) : 0,
    fullMark: 100,
  }));
  const avaliados = setores.filter((s) => s.ultima_nota !== null && s.ultima_nota !== undefined);
  const notaMediaGlobal = avaliados.length > 0
    ? Math.round(avaliados.reduce((acc, s) => acc + (s.ultima_nota || 0), 0) / avaliados.length)
    : 0;
  const totalPlanosAcao = auditorias.reduce((acc, a) => acc + (a.itens?.filter((i) => i.nota < 4).length || 0), 0);
  const name = input.companyName || config.company_name || "Empresa";
  return {
    config,
    company: {
      id: input.companyId,
      name,
      logo_url: config.logo_url || null,
      primary_color: config.primary_color,
      secondary_color: config.secondary_color,
      bg_color: config.bg_color,
    },
    setores,
    auditoriasRecentes: auditorias.slice(0, 10),
    radarData,
    kpis: {
      setorCampeao: avaliados.length > 0 ? setores[0] : null,
      notaMediaGlobal,
      sensoDestaqueMes: config.senso_destaque_mes || "Seiso (Limpeza)",
      totalAuditorias: auditorias.length,
      totalDescartes: descartes.length,
      totalPlanosAcao,
    },
    muralFotos: input.mural,
    instrucoesTrabalho: input.itsMap,
    cartoesVermelhos: descartes,
    eventos: input.eventos,
    cronogramaProjeto: input.cronograma,
  };
}

export async function getFivesPortalDataByCompanyId(companyId: string, companyName?: string): Promise<FivesPortalData> {
  const [config, setores, auditorias, descartes, mural, eventos, cronograma] = await Promise.all([
    getFivesConfig(companyId, companyName),
    getFivesSetores(companyId),
    getFivesAuditorias(companyId),
    getFivesDescartes(companyId),
    getFivesMuralFotos(companyId),
    getFivesEventos(companyId),
    getFivesCronogramaProjeto(companyId),
  ]);
  const itsMap: Record<string, FivesInstrucaoTrabalho> = {};
  if (setores.length > 0) {
    const { data, error } = await fivesDb.from("fives_instrucoes_trabalho").select("*").in("setor_id", setores.map((s) => s.id));
    failOn(error, "Não foi possível carregar as instruções de trabalho.");
    (data || []).forEach((it: any) => { itsMap[it.setor_id] = normalizeIT(it); });
  }
  return assemblePortalData({ companyId, companyName: companyName || config.company_name || undefined, config, setores, auditorias, descartes, mural, eventos, cronograma, itsMap });
}

// Portal público (QR Code / link): leitura somente pelo código aleatório do link.
export async function getFivesPortalDataByHash(hash: string): Promise<FivesPortalData | null> {
  if (!hash || hash.length < 20 || hash.length > 200) return null;
  const { data, error } = await (supabase as any).rpc("get_fives_portal", { _hash: hash });
  failOn(error, "Não foi possível carregar o Portal 5S.");
  if (!data) return null;
  const companyId: string = data.company?.id;
  const config = normalizeConfig(data.config, data.company?.name, data.company?.logo_url);
  const auditorias = ((data.auditorias || []) as any[]).map((a) => ({ ...a, company_id: companyId, nota_final_percent: Number(a.nota_final_percent) })) as FivesAuditoria[];
  const setores = enrichSetoresComNotas((data.setores || []) as FivesSetor[], auditorias);
  const itsMap: Record<string, FivesInstrucaoTrabalho> = {};
  ((data.its || []) as any[]).forEach((it) => { itsMap[it.setor_id] = normalizeIT(it); });
  const cronograma = (data.cronograma || []) as FivesCronogramaProjeto[];
  return assemblePortalData({
    companyId,
    companyName: data.company?.name,
    config,
    setores,
    auditorias,
    descartes: (data.descartes || []) as FivesDescarteCartaoVermelho[],
    mural: (data.mural || []) as FivesMuralFoto[],
    eventos: (data.eventos || []) as FivesEvento[],
    cronograma: cronograma.length > 0 ? cronograma : etapasPadrao(companyId),
    itsMap,
  });
}

// ---------------------------------------------------------------------------
// BANCO DE QUESTÕES CUSTOMIZADAS
// ---------------------------------------------------------------------------
export async function getFivesPerguntasCustomizadas(companyId: string): Promise<FivesPerguntaCustomizada[]> {
  if (!isUuid(companyId)) return [];
  const { data, error } = await fivesDb
    .from("fives_perguntas_customizadas")
    .select("*")
    .eq("company_id", companyId)
    .eq("ativo", true)
    .order("senso", { ascending: true })
    .order("ordem", { ascending: true });
  failOn(error, "Não foi possível carregar o banco de questões.");
  return (data || []) as FivesPerguntaCustomizada[];
}

export async function saveFivesPerguntaCustomizada(pergunta: Partial<FivesPerguntaCustomizada>): Promise<FivesPerguntaCustomizada> {
  if (!pergunta.company_id || !isUuid(pergunta.company_id)) throw new Error("Selecione uma empresa válida.");
  const payload = {
    id: ensureId(pergunta.id),
    company_id: pergunta.company_id,
    senso: pergunta.senso,
    titulo_pergunta: pergunta.titulo_pergunta || "",
    criterio_avaliacao: pergunta.criterio_avaliacao || "",
    ativo: pergunta.ativo ?? true,
    ordem: pergunta.ordem ?? 1,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await fivesDb.from("fives_perguntas_customizadas").upsert(payload).select().single();
  failOn(error, "Não foi possível salvar a pergunta.");
  notify5SUpdate(pergunta.company_id);
  return data as FivesPerguntaCustomizada;
}

export async function deleteFivesPerguntaCustomizada(id: string, companyId?: string): Promise<boolean> {
  const { error } = await fivesDb.from("fives_perguntas_customizadas").delete().eq("id", id);
  failOn(error, "Não foi possível excluir a pergunta.");
  notify5SUpdate(companyId);
  return true;
}

/** Usa as perguntas da empresa quando houver ao menos 5; senão o checklist técnico padrão. */
export async function getChecklistParaAuditoria(companyId: string): Promise<Array<{ senso: Senso5S; pergunta: string; dica: string; ordem?: number }>> {
  const customizadas = await getFivesPerguntasCustomizadas(companyId);
  if (customizadas.length >= 5) {
    return customizadas.map((p) => ({ senso: p.senso, pergunta: p.titulo_pergunta, dica: p.criterio_avaliacao, ordem: p.ordem }));
  }
  return CHECKLIST_PADRAO_5S;
}

// ---------------------------------------------------------------------------
// TEMPO REAL
// ---------------------------------------------------------------------------
export type FivesRealtimeCallback = () => void;

const REALTIME_TABLES = [
  "fives_auditorias",
  "fives_setores",
  "fives_descartes_cartao_vermelho",
  "fives_configuracoes",
  "fives_mural_fotos",
  "fives_eventos",
  "fives_cronograma_projeto",
];

/** Escuta mudanças (usuários logados) e, para o portal público, atualiza a cada minuto. */
export function subscribeFivesRealtime(companyId: string, onUpdate: FivesRealtimeCallback): () => void {
  let channel = supabase.channel(`fives_realtime_${companyId}_${Date.now()}`);
  REALTIME_TABLES.forEach((table) => {
    channel = channel.on("postgres_changes" as any, { event: "*", schema: "public", table }, () => onUpdate());
  });
  channel.subscribe();
  const timer = typeof window !== "undefined" ? window.setInterval(onUpdate, 60_000) : undefined;
  return () => {
    if (timer) window.clearInterval(timer);
    void supabase.removeChannel(channel);
  };
}
