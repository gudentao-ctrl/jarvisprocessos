// Recuperação única de dados do HUB 5S que a versão antiga guardou apenas no navegador.
// Lê as chaves antigas (jarvis_5s_*) deste computador, envia para o banco da empresa
// e apaga a cópia local quando tudo foi salvo. Nunca grava dados 5S no navegador.

import { supabase } from "@/integrations/supabase/client";
import {
  isUuid,
  getFivesConfig,
  saveFivesConfig,
  getFivesSetores,
  saveFivesSetor,
  getFivesIT,
  saveFivesIT,
  saveFivesAuditoria,
  saveFivesMuralFoto,
  saveFivesEvento,
  saveFivesCronogramaEtapa,
  notify5SUpdate,
} from "./fives-storage";
import type {
  FivesAuditoria,
  FivesConfiguracao,
  FivesCronogramaProjeto,
  FivesEvento,
  FivesInstrucaoTrabalho,
  FivesMuralFoto,
  FivesSetor,
} from "./fives-types";

const DEMO_SETORES: Record<string, string> = {
  "1": "Almoxarifado & Logística",
  "2": "Linha de Produção / Usinagem",
  "3": "Administrativo & Diretoria",
  "4": "Manutenção Mecânica & Ferramentaria",
};
const DEMO_COMITE_IDS = new Set(["com-1", "com-2", "com-3"]);
const DEMO_IDS = /^(mural|evt|cart|cfg)-\d+/;
const DEMO_BANNER = "photo-1581091226825-a6a2a5aee158";
const DEFAULT_SLOGAN_END = "Um lugar para cada coisa e cada coisa no seu lugar.";

export type LegacyImportResult = { imported: number; keysRemoved: number };

function readJson<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/** Converte ids antigos (ex.: "setor-1-...") em um identificador fixo, para que repetir a recuperação não duplique registros. */
async function stableId(raw: string | null | undefined, scope: string): Promise<string> {
  if (raw && isUuid(raw)) return raw;
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${scope}:${raw ?? crypto.randomUUID()}`)));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes.slice(0, 16), (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

function legacyKeysFor(companyId: string): string[] {
  const keys: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i);
    if (k && k.startsWith("jarvis_5s_") && k.endsWith(companyId)) keys.push(k);
  }
  return keys;
}

/** Empresas que ainda têm dados 5S antigos guardados neste navegador. */
export function legacyFivesCompanyIds(): string[] {
  if (typeof window === "undefined") return [];
  const ids = new Set<string>();
  const re = /^jarvis_5s_(?:config|setores|auditorias|mural|eventos|cronograma)_([0-9a-f-]{36})$/i;
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const match = re.exec(window.localStorage.key(i) || "");
      if (match && isUuid(match[1])) ids.add(match[1]);
    }
  } catch {
    return [];
  }
  return [...ids];
}

function isDemoSetor(s: FivesSetor, companyId: string): boolean {
  const match = /^setor-(\d)-(.+)$/.exec(String(s.id));
  if (!match || match[2] !== companyId) return false;
  return DEMO_SETORES[match[1]] === s.nome_setor;
}

export async function importLegacyFivesData(companyId: string): Promise<LegacyImportResult> {
  if (typeof window === "undefined" || !isUuid(companyId)) return { imported: 0, keysRemoved: 0 };
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { imported: 0, keysRemoved: 0 };

  let imported = 0;
  const usedKeys = new Set<string>();
  const setorMap = new Map<string, string>();

  // 1) Setores (ignora os setores de exemplo que nunca foram alterados).
  const setoresKey = `jarvis_5s_setores_${companyId}`;
  const localSetores = readJson<FivesSetor[]>(setoresKey) || [];
  const localAudits = [
    ...(readJson<FivesAuditoria[]>(`jarvis_5s_auditorias_${companyId}`) || []),
  ];
  const referenced = new Set(localAudits.map((a) => String(a.setor_id)));
  const existingSetores = await getFivesSetores(companyId);
  existingSetores.forEach((s) => setorMap.set(s.id, s.id));
  for (const s of localSetores) {
    if (!s?.id) continue;
    if (isDemoSetor(s, companyId) && !referenced.has(String(s.id))) continue;
    const id = await stableId(String(s.id), companyId);
    setorMap.set(String(s.id), id);
    if (existingSetores.some((e) => e.id === id)) continue;
    await saveFivesSetor({
      id,
      company_id: companyId,
      nome_setor: s.nome_setor,
      descricao: s.descricao,
      guardiao_nome: s.guardiao_nome,
      guardiao_user_id: s.guardiao_user_id,
      auditor_nome: s.auditor_nome,
      auditor_user_id: s.auditor_user_id,
      meta_nota: s.meta_nota,
    });
    imported++;
  }
  if (localSetores.length) usedKeys.add(setoresKey);

  // 2) Instruções de trabalho por setor.
  for (const [oldId, newId] of setorMap) {
    const itKey = `jarvis_5s_it_${oldId}`;
    const it = readJson<FivesInstrucaoTrabalho>(itKey);
    if (!it) continue;
    usedKeys.add(itKey);
    const hasContent = !!(it.foto_padrao_ouro_url || it.documento_url || (it.rotina_limpeza && it.rotina_limpeza.length));
    if (!hasContent || (await getFivesIT(newId))) continue;
    await saveFivesIT({ ...it, id: undefined, setor_id: newId });
    imported++;
  }

  // 3) Auditorias com seus itens.
  const audKey = `jarvis_5s_auditorias_${companyId}`;
  for (const a of localAudits) {
    const setorId = setorMap.get(String(a.setor_id));
    if (!setorId) continue;
    const id = await stableId(String(a.id), `aud:${companyId}`);
    const itens = await Promise.all((a.itens || []).map(async (it, idx) => ({
      ...it,
      id: await stableId(String(it.id ?? idx), `audit:${id}`),
      auditoria_id: id,
    })));
    await saveFivesAuditoria({ ...a, id, setor_id: setorId, company_id: companyId }, itens);
    imported++;
  }
  if (localAudits.length) usedKeys.add(audKey);

  // 4) Mural antes x depois.
  const muralKey = `jarvis_5s_mural_${companyId}`;
  const mural = readJson<FivesMuralFoto[]>(muralKey) || [];
  for (const f of mural) {
    if (!f?.id || DEMO_IDS.test(String(f.id))) continue;
    await saveFivesMuralFoto({
      ...f,
      id: await stableId(String(f.id), `mural:${companyId}`),
      company_id: companyId,
      setor_id: f.setor_id ? setorMap.get(String(f.setor_id)) ?? null : null,
    });
    imported++;
  }
  if (mural.length) usedKeys.add(muralKey);

  // 5) Eventos / Dia D.
  const evKey = `jarvis_5s_eventos_${companyId}`;
  const eventos = readJson<FivesEvento[]>(evKey) || [];
  for (const e of eventos) {
    if (!e?.id || DEMO_IDS.test(String(e.id))) continue;
    await saveFivesEvento({
      ...e,
      id: await stableId(String(e.id), `evento:${companyId}`),
      company_id: companyId,
      setor_id: e.setor_id ? setorMap.get(String(e.setor_id)) ?? null : null,
    });
    imported++;
  }
  if (eventos.length) usedKeys.add(evKey);

  // 6) Cronograma (só existe localmente o que foi salvo pela empresa).
  const cronKey = `jarvis_5s_cronograma_${companyId}`;
  const cronograma = readJson<FivesCronogramaProjeto[]>(cronKey) || [];
  for (const etapa of cronograma) {
    if (!etapa) continue;
    await saveFivesCronogramaEtapa({
      ...etapa,
      id: await stableId(String(etapa.id), `crono:${companyId}`),
      company_id: companyId,
    });
    imported++;
  }
  if (cronograma.length) usedKeys.add(cronKey);

  // 7) Marca, capa e comitê: só preenche o que ainda não foi definido no banco.
  const cfgKey = `jarvis_5s_config_${companyId}`;
  const localCfg = readJson<FivesConfiguracao>(cfgKey);
  if (localCfg) {
    usedKeys.add(cfgKey);
    if (localCfg.url_hash && localCfg.url_hash !== companyId) usedKeys.add(`jarvis_5s_config_${localCfg.url_hash}`);
    const current = await getFivesConfig(companyId);
    const membros = (localCfg.comite_membros || []).filter((m) => m && !DEMO_COMITE_IDS.has(String(m.id)));
    const banner = localCfg.header_banner_url && !localCfg.header_banner_url.includes(DEMO_BANNER) ? localCfg.header_banner_url : null;
    const slogan = localCfg.slogan_campanha && !localCfg.slogan_campanha.endsWith(DEFAULT_SLOGAN_END) ? localCfg.slogan_campanha : null;
    const patch: Partial<FivesConfiguracao> = {};
    if (localCfg.logo_url && !current.logo_url) patch.logo_url = localCfg.logo_url;
    if (banner && !current.header_banner_url) patch.header_banner_url = banner;
    if (membros.length && !(current.comite_membros || []).length) patch.comite_membros = membros;
    if (slogan && current.slogan_campanha?.endsWith(DEFAULT_SLOGAN_END)) patch.slogan_campanha = slogan;
    if (Object.keys(patch).length && current.id) {
      await saveFivesConfig({ ...current, ...patch, company_id: companyId });
      imported++;
    }
  }

  // Tudo salvo: remove a cópia antiga deste navegador.
  legacyKeysFor(companyId).forEach((k) => usedKeys.add(k));
  usedKeys.forEach((k) => window.localStorage.removeItem(k));
  if (imported > 0) notify5SUpdate(companyId);
  return { imported, keysRemoved: usedKeys.size };
}
