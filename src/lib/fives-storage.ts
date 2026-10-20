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

// Dados Iniciais de Demonstração (Whitelabel Default)
const DEFAULT_CONFIG = (companyId: string, companyName?: string): FivesConfiguracao => ({
  id: `cfg-${companyId}`,
  company_id: companyId,
  company_name: companyName || "Empresa Parceira",
  url_hash: companyId,
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

function isUuid(val?: string | null): boolean {
  if (!val) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
}

// ---------------------------------------------------------------------------
// CONFIGURAÇÕES WHITELABEL
// ---------------------------------------------------------------------------
export async function getFivesConfig(companyId: string, companyName?: string): Promise<FivesConfiguracao> {
  if (!companyId || companyId === "default-company" || companyId === "demo") {
    return DEFAULT_CONFIG("demo", companyName);
  }

  const validUuid = isUuid(companyId);

  try {
    if (validUuid) {
      const { data, error } = await fivesDb
        .from("fives_configuracoes" as any)
        .select("*")
        .eq("company_id", companyId)
        .maybeSingle();

      if (!error && data) {
        let logo = data.logo_url;
        let cName = data.company_name || companyName;
        if (!logo || !cName) {
          try {
            const { data: comp } = await supabase
              .from("companies")
              .select("name, public_company_logo_url")
              .eq("id", companyId)
              .maybeSingle();
            if (comp?.public_company_logo_url && !logo) {
              logo = comp.public_company_logo_url;
            }
            if (comp?.name && !cName) {
              cName = comp.name;
            }
          } catch {}
        }

        const configResult: FivesConfiguracao = {
          id: data.id,
          company_id: data.company_id,
          company_name: cName || "Empresa Parceira",
          url_hash: data.url_hash || companyId,
          logo_url: logo,
          header_banner_url: data.header_banner_url,
          slogan_campanha: data.slogan_campanha,
          primary_color: data.primary_color || "#3E100C",
          secondary_color: data.secondary_color || "#E05A10",
          bg_color: data.bg_color || "#FFF8F5",
          senso_destaque_mes: data.senso_destaque_mes,
          comite_membros: Array.isArray(data.comite_membros) ? data.comite_membros : [],
        };

        setLocalItem(`jarvis_5s_config_${companyId}`, configResult);
        setLocalItem(`jarvis_5s_config_${configResult.url_hash}`, configResult);
        return configResult;
      }

      // Se ainda não existir configuração no banco para este UUID, cria a inicial automaticamente
      if (!error && !data) {
        let compLogo = "";
        let compName = companyName;
        try {
          const { data: comp } = await supabase
            .from("companies")
            .select("name, public_company_logo_url")
            .eq("id", companyId)
            .maybeSingle();
          if (comp?.public_company_logo_url) compLogo = comp.public_company_logo_url;
          if (comp?.name) compName = comp.name;
        } catch {}

        const initialConfig = {
          id: crypto.randomUUID(),
          company_id: companyId,
          company_name: compName || "Empresa Parceira",
          url_hash: companyId,
          logo_url: compLogo || null,
          header_banner_url: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=1400&auto=format&fit=crop&q=80",
          slogan_campanha: `Programa 5S ${compName ? "• " + compName : ""}: Um lugar para cada coisa e cada coisa no seu lugar.`,
          primary_color: "#3E100C",
          secondary_color: "#E05A10",
          bg_color: "#FFF8F5",
          senso_destaque_mes: "Seiso (Limpeza)",
          comite_membros: [],
        };

        try {
          const { data: inserted } = await fivesDb
            .from("fives_configuracoes" as any)
            .upsert(initialConfig, { onConflict: "company_id" })
            .select()
            .maybeSingle();
          if (inserted) {
            setLocalItem(`jarvis_5s_config_${companyId}`, inserted);
            setLocalItem(`jarvis_5s_config_${companyId}`, inserted);
            return inserted as FivesConfiguracao;
          }
        } catch {}
      }
    }
  } catch (e) {
    console.warn("Tabela fives_configuracoes não encontrada ou sem acesso. Usando fallback.", e);
  }

  // Tenta puxar a logo da empresa se houver
  let companyLogo = "";
  if (validUuid) {
    try {
      const { data: comp } = await supabase
        .from("companies")
        .select("name, public_company_logo_url")
        .eq("id", companyId)
        .maybeSingle();
      if (comp?.public_company_logo_url) {
        companyLogo = comp.public_company_logo_url;
      }
      if (comp?.name && !companyName) {
        companyName = comp.name;
      }
    } catch {}
  }

  // Fallback Local
  const localKey = `jarvis_5s_config_${companyId}`;
  const def = DEFAULT_CONFIG(companyId, companyName);
  if (companyLogo) {
    def.logo_url = companyLogo;
  }
  return getLocalItem<FivesConfiguracao>(localKey, def);
}

export async function saveFivesConfig(config: Partial<FivesConfiguracao>): Promise<FivesConfiguracao> {
  const companyId = config.company_id;
  if (!companyId) throw new Error("ID da empresa é obrigatório.");

  const payload = {
    id: config.id || crypto.randomUUID(),
    company_id: companyId,
    company_name: config.company_name || null,
    url_hash: config.url_hash || companyId,
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
      setLocalItem(`jarvis_5s_config_${payload.url_hash}`, data);
      notify5SUpdate(companyId);
      return data as unknown as FivesConfiguracao;
    }
  } catch (e) {
    console.warn("Erro ao salvar fives_configuracoes no Supabase, salvando localmente:", e);
  }

  setLocalItem(`jarvis_5s_config_${companyId}`, payload);
  setLocalItem(`jarvis_5s_config_${payload.url_hash}`, payload);
  notify5SUpdate(companyId);
  return payload as unknown as FivesConfiguracao;
}

// ---------------------------------------------------------------------------
// GESTÃO DE SETORES
// ---------------------------------------------------------------------------
export async function getFivesSetores(companyId: string): Promise<FivesSetor[]> {
  if (!companyId) return [];

  let setores: FivesSetor[] = [];

  try {
    if (isUuid(companyId)) {
      const { data, error } = await fivesDb
        .from("fives_setores" as any)
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: true });

      if (!error && data && data.length > 0) {
        setores = data as unknown as FivesSetor[];
      }
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
  notify5SUpdate(companyId);
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
  notify5SUpdate(companyId);
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
      notify5SUpdate();
      return data as unknown as FivesInstrucaoTrabalho;
    }
  } catch (e) {
    console.warn("Erro ao salvar fives_instrucoes_trabalho no Supabase:", e);
  }

  setLocalItem(`jarvis_5s_it_${setorId}`, payload);
  notify5SUpdate();
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
  const filtered = existing.filter((a) => a.id !== auditoriaId);
  setLocalItem(companyKey, [novaAuditoria, ...filtered]);

  if (auditoria.company_id) {
    notify5SUpdate(auditoria.company_id);
  }

  return novaAuditoria;
}

export async function deleteFivesAuditoria(id: string, companyId?: string): Promise<boolean> {
  try {
    await fivesDb.from("fives_auditoria_itens" as any).delete().eq("auditoria_id", id);
    await fivesDb.from("fives_auditorias" as any).delete().eq("id", id);
  } catch (e) {
    console.warn("Erro ao excluir auditoria no Supabase:", e);
  }

  if (companyId) {
    const companyKey = `jarvis_5s_auditorias_${companyId}`;
    const existing = getLocalItem<FivesAuditoria[]>(companyKey, []);
    setLocalItem(companyKey, existing.filter((a) => a.id !== id));
    notify5SUpdate(companyId);
  }
  const globalExisting = getLocalItem<FivesAuditoria[]>("jarvis_5s_auditorias_global", []);
  setLocalItem("jarvis_5s_auditorias_global", globalExisting.filter((a) => a.id !== id));
  return true;
}

export async function updateFivesAuditoria(
  auditoria: FivesAuditoria,
  companyId?: string
): Promise<FivesAuditoria> {
  return saveFivesAuditoria(
    {
      ...auditoria,
      company_id: companyId || (auditoria as any).company_id,
    },
    auditoria.itens
  );
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
    arquivado: descarte.arquivado ?? false,
    data_conclusao: descarte.data_conclusao || null,
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
  const isConcluido = status === "CONCLUIDO";
  const update: Record<string, any> = {
    destinacao_status: status,
    destinacao_observacao: observacao || null,
    arquivado: isConcluido,
    data_conclusao: isConcluido ? new Date().toISOString() : null,
  };

  try {
    await fivesDb
      .from("fives_descartes_cartao_vermelho" as any)
      .update(update)
      .eq("id", id);
    notify5SUpdate();
  } catch (e) {
    console.warn("Erro ao atualizar status do descarte no Supabase:", e);
  }
  return true;
}

export async function archivarDescarte(id: string): Promise<boolean> {
  return updateStatusDescarte(id, "CONCLUIDO", "Arquivado como concluído pelo gestor.");
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
  const filtered = existing.filter((f) => f.id !== payload.id);
  setLocalItem(key, [payload as FivesMuralFoto, ...filtered]);
  notify5SUpdate(companyId);

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
  notify5SUpdate(companyId);
  return true;
}

// ---------------------------------------------------------------------------
// CRONOGRAMA & EVENTOS ("DIA D", AUDITORIAS CRUZADAS)
// ---------------------------------------------------------------------------
export async function getFivesEventos(companyId: string): Promise<FivesEvento[]> {
  try {
    if (isUuid(companyId)) {
      const { data, error } = await fivesDb
        .from("fives_eventos" as any)
        .select("*")
        .eq("company_id", companyId)
        .order("data_evento", { ascending: true });

      if (!error && data && data.length > 0) {
        return data as unknown as FivesEvento[];
      }
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
  notify5SUpdate(companyId);

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
  notify5SUpdate(companyId);
  return true;
}

// ---------------------------------------------------------------------------
// CRONOGRAMA DA IMPLANTAÇÃO 5S (LINHA DO TEMPO DO PROJETO)
// ---------------------------------------------------------------------------

const ETAPAS_PADRAO_CRONOGRAMA: Omit<FivesCronogramaProjeto, "id" | "company_id" | "created_at">[] = [
  { etapa_titulo: "Sensibilização e Formação do Comitê 5S", descricao: "Palestras de conscientização, definição dos membros do Comitê 5S e nomeação dos Guardiões de Setor.", data_inicio: null, data_fim: null, data_execucao: null, responsavel: "Maia Consultoria", status: "PENDENTE", ordem: 1 },
  { etapa_titulo: "Mapeamento de Áreas e Treinamentos", descricao: "Definição das zonas/setores auditados, treinamento prático dos auditores internos e capacitação dos guardiões.", data_inicio: null, data_fim: null, data_execucao: null, responsavel: "Comitê 5S", status: "PENDENTE", ordem: 2 },
  { etapa_titulo: "Grande Bota-Fora (Dia D)", descricao: "Mutirão geral de descarte com Cartão Vermelho aplicado em todos os setores simultaneamente.", data_inicio: null, data_fim: null, data_execucao: null, responsavel: "Comitê 5S + Guardiões", status: "PENDENTE", ordem: 3 },
  { etapa_titulo: "Implantação dos Sensos (Seiri → Shitsuke)", descricao: "Ciclo sequencial de implantação dos 5 Sensos com treinamentos práticos por etapa e auditoria de verificação.", data_inicio: null, data_fim: null, data_execucao: null, responsavel: "Guardiões de Setor", status: "PENDENTE", ordem: 4 },
  { etapa_titulo: "Ciclo de Auditorias Contínuas e Premiação", descricao: "Auditorias cruzadas mensais, apuração do Ranking de Setores, premiação Selo Ouro/Prata e reconhecimento dos destaques.", data_inicio: null, data_fim: null, data_execucao: null, responsavel: "Auditores + Maia Consultoria", status: "PENDENTE", ordem: 5 },
];

export async function getFivesCronogramaProjeto(companyId: string): Promise<FivesCronogramaProjeto[]> {
  try {
    if (isUuid(companyId)) {
      const { data, error } = await fivesDb
        .from("fives_cronograma_projeto" as any)
        .select("*")
        .eq("company_id", companyId)
        .order("ordem", { ascending: true });

      if (!error && data && data.length > 0) {
        return data as unknown as FivesCronogramaProjeto[];
      }
    }
  } catch (e) {
    console.warn("Erro ao buscar cronograma 5S:", e);
  }

  const localKey = `jarvis_5s_cronograma_${companyId}`;
  const local = getLocalItem<FivesCronogramaProjeto[]>(localKey, []);
  if (local.length > 0) return local;

  // Retorna etapas padrão se não há nada cadastrado
  return ETAPAS_PADRAO_CRONOGRAMA.map((e, idx) => ({
    ...e,
    id: `padrao-crono-${idx}`,
    company_id: companyId,
    created_at: new Date().toISOString(),
  }));
}

export async function saveFivesCronogramaEtapa(etapa: Partial<FivesCronogramaProjeto>): Promise<FivesCronogramaProjeto> {
  const companyId = etapa.company_id;
  if (!companyId) throw new Error("company_id obrigatório.");

  const payload: FivesCronogramaProjeto = {
    id: etapa.id || crypto.randomUUID(),
    company_id: companyId,
    etapa_titulo: etapa.etapa_titulo || "Etapa 5S",
    descricao: etapa.descricao || null,
    data_inicio: etapa.data_inicio || null,
    data_fim: etapa.data_fim || null,
    data_execucao: etapa.data_execucao || null,
    responsavel: etapa.responsavel || null,
    status: etapa.status || "PENDENTE",
    ordem: etapa.ordem ?? 1,
    created_at: etapa.created_at || new Date().toISOString(),
  };

  try {
    await fivesDb.from("fives_cronograma_projeto" as any).upsert(payload);
  } catch (e) {
    console.warn("Erro ao salvar etapa de cronograma 5S:", e);
  }

  const localKey = `jarvis_5s_cronograma_${companyId}`;
  const existing = getLocalItem<FivesCronogramaProjeto[]>(localKey, []);
  const filtered = existing.filter((item) => item.id !== payload.id);
  setLocalItem(localKey, [...filtered, payload].sort((a, b) => a.ordem - b.ordem));
  notify5SUpdate(companyId);

  return payload;
}

export async function deleteFivesCronogramaEtapa(id: string, companyId: string): Promise<boolean> {
  try {
    await fivesDb.from("fives_cronograma_projeto" as any).delete().eq("id", id);
  } catch (e) {
    console.warn("Erro ao excluir etapa de cronograma 5S:", e);
  }

  const localKey = `jarvis_5s_cronograma_${companyId}`;
  const existing = getLocalItem<FivesCronogramaProjeto[]>(localKey, []);
  setLocalItem(localKey, existing.filter((item) => item.id !== id));
  notify5SUpdate(companyId);
  return true;
}

// ---------------------------------------------------------------------------
// CONSOLIDAÇÃO DO PORTAL DO COLABORADOR 5S (PÚBLICO E AUTENTICADO)
// ---------------------------------------------------------------------------
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

  let resolvedCompanyName = companyName || config.company_name;
  if ((!resolvedCompanyName || resolvedCompanyName === "Empresa Cliente" || resolvedCompanyName === "Empresa Parceira") && isUuid(companyId)) {
    try {
      const { data: comp } = await supabase
        .from("companies")
        .select("name, public_company_logo_url")
        .eq("id", companyId)
        .maybeSingle();
      if (comp?.name) resolvedCompanyName = comp.name;
    } catch {}
  }
  if (!resolvedCompanyName) resolvedCompanyName = "Empresa Cliente";

  return {
    config,
    company: {
      id: companyId,
      name: resolvedCompanyName,
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
    cronogramaProjeto: cronograma,
  };
}

export async function getFivesPortalDataByHash(hash: string): Promise<FivesPortalData | null> {
  if (!hash) return null;

  try {
    // 1. Tenta buscar configuração com o hash correspondente na tabela fives_configuracoes
    // Busca por url_hash OU por company_id (caso o hash seja o UUID da empresa)
    let cfgQuery = fivesDb.from("fives_configuracoes" as any).select("*");
    if (isUuid(hash)) {
      cfgQuery = cfgQuery.or(`url_hash.eq.${hash},company_id.eq.${hash}`);
    } else {
      cfgQuery = cfgQuery.eq("url_hash", hash);
    }
    const { data: cfg } = await cfgQuery.maybeSingle();

    if (cfg && cfg.company_id) {
      let companyName = cfg.company_name || "Empresa Parceira";
      try {
        const { data: comp } = await supabase
          .from("companies")
          .select("id, name, public_company_logo_url")
          .eq("id", cfg.company_id)
          .maybeSingle();
        if (comp?.name) companyName = comp.name;
      } catch {}
      return getFivesPortalDataByCompanyId(cfg.company_id, companyName);
    }

    // 2. Se o hash for um UUID de company direto
    const isDirectUuid = isUuid(hash);
    if (isDirectUuid) {
      const { data: comp } = await supabase
        .from("companies")
        .select("id, name, public_company_logo_url")
        .eq("id", hash)
        .maybeSingle();
      if (comp) {
        return getFivesPortalDataByCompanyId(comp.id, comp.name);
      }
      return getFivesPortalDataByCompanyId(hash);
    }

    // 3. Se o hash começar com 5s_, busca pela company cujo id começa com esse prefixo
    if (hash.startsWith("5s_")) {
      const prefix = hash.replace(/^5s_/, "");
      // Tenta buscar no cache local da configuração primeiro
      const localCfg = getLocalItem<FivesConfiguracao | null>(`jarvis_5s_config_${hash}`, null);
      if (localCfg?.company_id) {
        return getFivesPortalDataByCompanyId(localCfg.company_id);
      }

      // Busca na tabela companies
      const { data: matchedComp } = await supabase
        .from("companies")
        .select("id, name, public_company_logo_url")
        .ilike("id", `${prefix}%`)
        .maybeSingle();
      if (matchedComp) {
        return getFivesPortalDataByCompanyId(matchedComp.id, matchedComp.name);
      }
    }

    // 4. Tenta buscar pelo public_token da company
    const { data: compToken } = await supabase
      .from("companies")
      .select("id, name, public_company_logo_url, public_token")
      .eq("public_token", hash)
      .maybeSingle();

    if (compToken) {
      return getFivesPortalDataByCompanyId(compToken.id, compToken.name);
    }
  } catch (e) {
    console.warn("Erro ao buscar portal 5S por hash via Supabase:", e);
  }

  // 5. Fallback local por hash
  const localCfg = getLocalItem<FivesConfiguracao | null>(`jarvis_5s_config_${hash}`, null);
  if (localCfg?.company_id) {
    return getFivesPortalDataByCompanyId(localCfg.company_id);
  }

  // 6. Se nada encontrou, pega a primeira empresa cadastrada no sistema
  try {
    const { data: firstComp } = await supabase
      .from("companies")
      .select("id, name")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (firstComp) {
      return getFivesPortalDataByCompanyId(firstComp.id, firstComp.name);
    }
  } catch {}

  const demoCompanyId = hash.replace(/^5s_/, "") || "demo";
  return getFivesPortalDataByCompanyId(demoCompanyId, "Indústria Modelo 5S");
}


// ---------------------------------------------------------------------------
// PERGUNTAS CUSTOMIZADAS POR EMPRESA
// ---------------------------------------------------------------------------
export async function getFivesPerguntasCustomizadas(companyId: string): Promise<import("./fives-types").FivesPerguntaCustomizada[]> {
  try {
    const { data, error } = await fivesDb
      .from("fives_perguntas_customizadas" as any)
      .select("*")
      .eq("company_id", companyId)
      .eq("ativo", true)
      .order("senso", { ascending: true })
      .order("ordem", { ascending: true });

    if (!error && data && data.length > 0) {
      return data as import("./fives-types").FivesPerguntaCustomizada[];
    }
  } catch (e) {
    console.warn("Tabela fives_perguntas_customizadas não disponível. Usando checklist padrão.", e);
  }
  return [];
}

export async function saveFivesPerguntaCustomizada(
  pergunta: Partial<import("./fives-types").FivesPerguntaCustomizada>
): Promise<import("./fives-types").FivesPerguntaCustomizada> {
  const payload = {
    id: pergunta.id || crypto.randomUUID(),
    company_id: pergunta.company_id,
    senso: pergunta.senso,
    titulo_pergunta: pergunta.titulo_pergunta || "",
    criterio_avaliacao: pergunta.criterio_avaliacao || "",
    ativo: pergunta.ativo ?? true,
    ordem: pergunta.ordem ?? 1,
    updated_at: new Date().toISOString(),
  };

  try {
    await fivesDb.from("fives_perguntas_customizadas" as any).upsert(payload);
  } catch (e) {
    console.warn("Erro ao salvar pergunta customizada:", e);
  }

  return payload as import("./fives-types").FivesPerguntaCustomizada;
}

export async function deleteFivesPerguntaCustomizada(id: string, _companyId?: string): Promise<boolean> {
  try {
    await fivesDb.from("fives_perguntas_customizadas" as any).delete().eq("id", id);
  } catch (e) {
    console.warn("Erro ao excluir pergunta customizada:", e);
  }
  return true;
}

/**
 * Retorna as perguntas do checklist para uma auditoria:
 * Se a empresa tiver customizadas, usa-as; senão usa o checklist padrão técnico aprofundado.
 */
export async function getChecklistParaAuditoria(companyId: string): Promise<Array<{ senso: Senso5S; pergunta: string; dica: string; ordem?: number }>> {
  const customizadas = await getFivesPerguntasCustomizadas(companyId);
  if (customizadas.length >= 5) {
    return customizadas.map((p) => ({
      senso: p.senso,
      pergunta: p.titulo_pergunta,
      dica: p.criterio_avaliacao,
      ordem: p.ordem,
    }));
  }
  return CHECKLIST_PADRAO_5S;
}

// ---------------------------------------------------------------------------
// REALTIME: Helpers para subscrições Supabase
// ---------------------------------------------------------------------------
export type FivesRealtimeCallback = () => void;

/**
 * Inicia escuta em tempo real nas tabelas críticas do 5S para a empresa especificada.
 * Retorna função cleanup para remover todos os canais ao desmontar o componente.
 */
export function subscribeFivesRealtime(companyId: string, onUpdate: FivesRealtimeCallback): () => void {
  const channelName = `fives_realtime_${companyId}_${Date.now()}`;

  const channel = supabase
    .channel(channelName)
    .on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "fives_auditorias",
    }, () => {
      notify5SUpdate(companyId);
      onUpdate();
    })
    .on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "fives_setores",
    }, () => {
      notify5SUpdate(companyId);
      onUpdate();
    })
    .on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "fives_descartes_cartao_vermelho",
    }, () => {
      notify5SUpdate(companyId);
      onUpdate();
    })
    .on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "fives_configuracoes",
    }, () => {
      notify5SUpdate(companyId);
      onUpdate();
    })
    .on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "fives_mural_fotos",
    }, () => {
      notify5SUpdate(companyId);
      onUpdate();
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
