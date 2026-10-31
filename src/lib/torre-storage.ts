// Persistência da Torre de Controle (DRE do cliente, maturidade) e do Cockpit do Roadmap.
// Tudo fica no banco por empresa, para que computador e celular mostrem os mesmos dados.
// Erros do banco são sempre repassados: nunca há cópia local como alternativa.

import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import {
  type DreBlock,
  computeDre,
  isLegacyDemoRecord,
  legacyRecordToBlocks,
  sanitizeBlocks,
} from "./dre-model";
import {
  calculateMaturityAverages,
  type MonthlyMaturityRecord,
  type RoadmapCockpitData,
  type DreSummaryForCockpit,
} from "./torre-controle-storage";

export type DreMode = "realizado" | "orcado";

export interface DreRecord {
  id: string;
  company_id: string;
  month_year: string;
  mode: DreMode;
  blocks: DreBlock[];
  notes: string | null;
  updated_at: string;
}

const fail = (error: { message: string } | null, what: string) => {
  if (error) throw new Error(`${what}: ${error.message}`);
};

// ---------------- DRE: modelo do cliente ----------------

export async function fetchDreTemplate(companyId: string): Promise<DreBlock[] | null> {
  const { data, error } = await supabase
    .from("torre_dre_templates")
    .select("blocks")
    .eq("company_id", companyId)
    .maybeSingle();
  fail(error, "Não foi possível carregar o modelo de DRE");
  return data ? sanitizeBlocks(data.blocks) : null;
}

export async function saveDreTemplate(companyId: string, blocks: DreBlock[]): Promise<void> {
  const { error } = await supabase
    .from("torre_dre_templates")
    .upsert({ company_id: companyId, blocks: blocks as unknown as Json }, { onConflict: "company_id" });
  fail(error, "Não foi possível salvar o modelo de DRE");
}

// ---------------- DRE: meses lançados ----------------

export async function fetchDreRecords(companyId: string): Promise<DreRecord[]> {
  const { data, error } = await supabase
    .from("torre_dre_records")
    .select("id, company_id, month_year, mode, blocks, notes, updated_at")
    .eq("company_id", companyId)
    .order("month_year", { ascending: true });
  fail(error, "Não foi possível carregar os DREs");
  return (data ?? []).map((r) => ({
    ...r,
    mode: r.mode as DreMode,
    blocks: sanitizeBlocks(r.blocks),
  }));
}

export async function saveDreRecord(input: {
  companyId: string;
  monthYear: string;
  mode: DreMode;
  blocks: DreBlock[];
  notes?: string | null;
}): Promise<void> {
  const { error } = await supabase.from("torre_dre_records").upsert(
    {
      company_id: input.companyId,
      month_year: input.monthYear,
      mode: input.mode,
      blocks: input.blocks as unknown as Json,
      notes: input.notes ?? null,
    },
    { onConflict: "company_id,month_year,mode" },
  );
  fail(error, "Não foi possível salvar o DRE");
}

export async function deleteDreRecord(id: string): Promise<void> {
  const { error } = await supabase.from("torre_dre_records").delete().eq("id", id);
  fail(error, "Não foi possível excluir o DRE");
}

export function summarizeDreForCockpit(records: DreRecord[]): DreSummaryForCockpit[] {
  return records
    .filter((r) => r.mode === "realizado")
    .map((r) => {
      const t = computeDre(r.blocks).totals;
      return {
        month_year: r.month_year,
        receitaBruta: t.receitaBruta,
        custos: t.custosVariaveis + t.custosFixos,
        resultado: t.resultado,
        margemContribuicaoPct: t.margemContribuicaoPct,
      };
    });
}

// ---------------- Maturidade ----------------

export async function fetchMaturityRecords(companyId: string): Promise<MonthlyMaturityRecord[]> {
  const { data, error } = await supabase
    .from("torre_maturity_records")
    .select("id, company_id, month_year, answers, notes, created_at, updated_at")
    .eq("company_id", companyId)
    .order("month_year", { ascending: true });
  fail(error, "Não foi possível carregar a maturidade");
  return (data ?? []).map((r) => {
    const answers: Record<number, number> = {};
    const raw = (r.answers ?? {}) as Record<string, unknown>;
    for (const [k, v] of Object.entries(raw)) {
      const n = Number(v);
      if (Number.isFinite(n)) answers[Number(k)] = Math.min(5, Math.max(1, Math.round(n)));
    }
    const { pilar_averages, global_average } = calculateMaturityAverages(answers);
    return {
      id: r.id,
      company_id: r.company_id,
      month_year: r.month_year,
      answers,
      pilar_averages,
      global_average,
      notes: r.notes ?? "",
      created_at: r.created_at,
      updated_at: r.updated_at,
    };
  });
}

export async function saveMaturityRecord(rec: {
  company_id: string;
  month_year: string;
  answers: Record<number, number>;
  notes?: string;
}): Promise<void> {
  const { error } = await supabase.from("torre_maturity_records").upsert(
    {
      company_id: rec.company_id,
      month_year: rec.month_year,
      answers: rec.answers as unknown as Json,
      notes: rec.notes?.slice(0, 5000) || null,
    },
    { onConflict: "company_id,month_year" },
  );
  fail(error, "Não foi possível salvar a maturidade");
}

// ---------------- Cockpit do Roadmap ----------------

export async function fetchRoadmapCockpit(companyId: string): Promise<RoadmapCockpitData | null> {
  const { data, error } = await supabase
    .from("roadmap_cockpits")
    .select("data, updated_at")
    .eq("company_id", companyId)
    .maybeSingle();
  fail(error, "Não foi possível carregar o cockpit");
  if (!data) return null;
  const parsed = data.data as unknown as RoadmapCockpitData;
  return { ...parsed, company_id: companyId, last_updated: data.updated_at };
}

export async function saveRoadmapCockpit(companyId: string, cockpit: RoadmapCockpitData): Promise<void> {
  const { error } = await supabase
    .from("roadmap_cockpits")
    .upsert({ company_id: companyId, data: { ...cockpit, company_id: companyId } as unknown as Json }, { onConflict: "company_id" });
  fail(error, "Não foi possível salvar o cockpit");
}

// ---------------- Recuperação única do que ficou só no navegador ----------------

const LEGACY_DRE_KEY = "jarvis_dre_records_v1";
const LEGACY_MATURITY_KEY = "jarvis_maturity_records_v1";
const LEGACY_ROADMAP_PREFIX = "jarvis_roadmap_cockpit_v1_";

function readList<T>(key: string): T[] {
  try {
    const raw = window.localStorage.getItem(key);
    const v = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? (v as T[]) : [];
  } catch {
    return [];
  }
}

function writeListOrRemove(key: string, list: unknown[]) {
  if (list.length === 0) window.localStorage.removeItem(key);
  else window.localStorage.setItem(key, JSON.stringify(list));
}

/**
 * Envia para o banco os DREs, avaliações de maturidade e o cockpit que a versão antiga
 * guardou apenas neste navegador, sem sobrescrever o que já existe no banco.
 * Depois de salvo, a cópia local daquela empresa é apagada. DREs de exemplo nunca são enviados.
 */
export async function importLegacyTorreData(companyId: string): Promise<number> {
  if (typeof window === "undefined" || !companyId) return 0;
  let imported = 0;

  type LegacyDre = { company_id: string; month_year: string; mode?: string } & Parameters<typeof legacyRecordToBlocks>[0];
  const dreAll = readList<LegacyDre>(LEGACY_DRE_KEY);
  const dreMine = dreAll.filter((r) => r?.company_id === companyId);
  if (dreMine.length > 0) {
    const existing = await fetchDreRecords(companyId);
    for (const r of dreMine) {
      const mode: DreMode = r.mode === "orcado" ? "orcado" : "realizado";
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(r.month_year))) continue;
      if (existing.some((e) => e.month_year === r.month_year && e.mode === mode)) continue;
      const blocks = legacyRecordToBlocks(r);
      if (isLegacyDemoRecord(blocks)) continue;
      await saveDreRecord({ companyId, monthYear: r.month_year, mode, blocks });
      imported++;
    }
    writeListOrRemove(LEGACY_DRE_KEY, dreAll.filter((r) => r?.company_id !== companyId));
  }

  type LegacyMat = { company_id: string; month_year: string; answers: Record<number, number>; notes?: string };
  const matAll = readList<LegacyMat>(LEGACY_MATURITY_KEY);
  const matMine = matAll.filter((r) => r?.company_id === companyId);
  if (matMine.length > 0) {
    const existing = await fetchMaturityRecords(companyId);
    for (const r of matMine) {
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(r.month_year))) continue;
      if (existing.some((e) => e.month_year === r.month_year)) continue;
      await saveMaturityRecord({ company_id: companyId, month_year: r.month_year, answers: r.answers ?? {}, notes: r.notes });
      imported++;
    }
    writeListOrRemove(LEGACY_MATURITY_KEY, matAll.filter((r) => r?.company_id !== companyId));
  }

  const cockpitKey = `${LEGACY_ROADMAP_PREFIX}${companyId}`;
  const rawCockpit = window.localStorage.getItem(cockpitKey);
  if (rawCockpit) {
    try {
      const parsed = JSON.parse(rawCockpit) as RoadmapCockpitData;
      const existing = await fetchRoadmapCockpit(companyId);
      if (!existing && parsed && typeof parsed === "object" && parsed.kpis) {
        await saveRoadmapCockpit(companyId, parsed);
        imported++;
      }
    } catch {
      // cópia local corrompida: nada a recuperar
    }
    window.localStorage.removeItem(cockpitKey);
  }
  return imported;
}
