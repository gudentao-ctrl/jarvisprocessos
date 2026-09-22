import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const DEFAULT_PILLARS = [
  {
    key: "pessoas",
    name: "PESSOAS",
    description: "Cultura, engajamento, liderança e gestão de talentos",
    gradient: "from-violet-500/20 via-purple-500/10 to-transparent",
    accent: "text-violet-600 dark:text-violet-400",
    border: "border-violet-300/60 dark:border-violet-700/50",
    badge: "bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300",
    progressColor: "bg-violet-600 dark:bg-violet-500",
  },
  {
    key: "processo",
    name: "PROCESSOS",
    description: "Operações, fluxos, rotinas, qualidade e eficiência",
    gradient: "from-blue-500/20 via-cyan-500/10 to-transparent",
    accent: "text-blue-600 dark:text-blue-400",
    border: "border-blue-300/60 dark:border-blue-700/50",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300",
    progressColor: "bg-blue-600 dark:bg-blue-500",
  },
  {
    key: "negocio",
    name: "NEGÓCIOS",
    description: "Estratégia, vendas, mercado, finanças e expansão",
    gradient: "from-emerald-500/20 via-teal-500/10 to-transparent",
    accent: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-300/60 dark:border-emerald-700/50",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300",
    progressColor: "bg-emerald-600 dark:bg-emerald-500",
  },
] as const;

export type PillarMeta = {
  key: string;
  name: string;
  description?: string;
  gradient: string;
  accent: string;
  border: string;
  badge: string;
  progressColor: string;
  total: number; // Apenas desdobramentos
  concluidas: number;
  em_andamento: number;
  a_iniciar: number;
  nao_sera_feito: number;
  progress_pct: number;
  total_diretrizes: number;
  total_desdobramentos: number;
};

export type MapaItem = {
  id: string;
  company_id: string;
  title: string;
  description?: string | null;
  problem?: string | null;
  cause?: string | null;
  expected_result?: string | null;
  responsible?: string | null;
  sector?: string | null;
  origin?: string | null;
  status: "aberto" | "em_andamento" | "concluido" | "nao_sera_feito";
  demand_type: string; // pillar key
  due_date?: string | null;
  observations?: string | null;
  parent_id?: string | null;
  item_type: "diretriz" | "acao" | "desdobramento";
  progress_pct: number;
  order_index: number;
  custom_pillar?: string | null;
  gravity?: number | null;
  urgency?: number | null;
  trend?: number | null;
  gut_score?: number | null;
  created_at?: string;
  updated_at?: string;
  children?: MapaItem[];
};

const META_TAG_REGEX = /\[MAPA_META:(.*?)\]/;

function extractMeta(obs?: string | null) {
  if (!obs) return null;
  const match = obs.match(META_TAG_REGEX);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

function cleanObservations(obs?: string | null) {
  if (!obs) return "";
  return obs.replace(META_TAG_REGEX, "").trim();
}

function buildMetaTag(data: {
  parent_id?: string | null;
  item_type?: string;
  progress_pct?: number;
  custom_pillar?: string | null;
  status?: string;
  sector?: string | null;
  origin?: string | null;
  problem?: string | null;
  cause?: string | null;
  expected_result?: string | null;
  gravity?: number | null;
  urgency?: number | null;
  trend?: number | null;
}) {
  return `[MAPA_META:${JSON.stringify(data)}]`;
}

export const getMapaData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ company_id: z.string().uuid() }).parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase;

    const { data: rows, error } = await sb
      .from("action_plans")
      .select("*")
      .eq("company_id", data.company_id)
      .order("created_at", { ascending: true });

    if (error) throw new Error(error.message);

    // Map rows and extract metadata
    const rawItems: MapaItem[] = (rows ?? []).map((r: any) => {
      const meta = extractMeta(r.observations);
      const parent_id = r.parent_id !== undefined && r.parent_id !== null ? r.parent_id : meta?.parent_id ?? null;
      const item_type = r.item_type || meta?.item_type || (parent_id ? "desdobramento" : "diretriz");
      
      const rawStatus = (meta?.status || r.status || "aberto") as any;
      const status: "aberto" | "em_andamento" | "concluido" | "nao_sera_feito" =
        ["aberto", "em_andamento", "concluido", "nao_sera_feito"].includes(rawStatus)
          ? rawStatus
          : "aberto";

      let progress_pct = 0;
      if (r.progress_pct !== undefined && r.progress_pct !== null) {
        progress_pct = Number(r.progress_pct);
      } else if (meta?.progress_pct !== undefined && meta?.progress_pct !== null) {
        progress_pct = Number(meta.progress_pct);
      } else if (status === "concluido") {
        progress_pct = 100;
      } else if (status === "em_andamento") {
        progress_pct = 50;
      } else {
        progress_pct = 0;
      }

      const rawDemand = (r.demand_type || "processo").toLowerCase();
      const standardKeysList = ["pessoas", "processo", "negocio"];
      const inferredCustom = !standardKeysList.includes(rawDemand) ? (r.demand_type || "").toUpperCase() : null;
      const custom_pillar = r.custom_pillar || meta?.custom_pillar || inferredCustom || null;
      const demand_type = custom_pillar ? custom_pillar.toLowerCase() : rawDemand;

      const gravity = Number(r.gravity ?? meta?.gravity ?? 3);
      const urgency = Number(r.urgency ?? meta?.urgency ?? 3);
      const trend = Number(r.trend ?? meta?.trend ?? 3);
      const gut_score = Number(r.gut_score ?? gravity * urgency * trend);

      return {
        id: r.id,
        company_id: r.company_id,
        title: r.title,
        description: r.description || null,
        problem: r.problem ?? meta?.problem ?? null,
        cause: r.cause ?? meta?.cause ?? null,
        expected_result: r.expected_result ?? meta?.expected_result ?? null,
        responsible: r.responsible || null,
        sector: r.sector ?? meta?.sector ?? null,
        origin: r.origin ?? meta?.origin ?? null,
        status,
        demand_type,
        due_date: r.due_date || r.new_due_date || null,
        observations: cleanObservations(r.observations),
        parent_id,
        item_type: item_type as any,
        progress_pct,
        order_index: r.order_index ?? 0,
        custom_pillar,
        gravity,
        urgency,
        trend,
        gut_score,
        created_at: r.created_at,
        updated_at: r.updated_at,
      };
    });

    // Detect distinct pillars
    const standardKeys = new Set(["pessoas", "processo", "negocio"]);
    const foundKeys = new Set(rawItems.map((i) => i.demand_type.toLowerCase()));
    
    // First, build hierarchical tree by pillar to compute derived progress and status for diretrizes
    const treeByPillar: Record<string, MapaItem[]> = {};
    const processedItems: MapaItem[] = [];

    const allPillarKeys = Array.from(new Set([...standardKeys, ...foundKeys]));

    for (const pKey of allPillarKeys) {
      const pItems = rawItems.filter((i) => i.demand_type.toLowerCase() === pKey);
      const rootItems = pItems.filter((i) => !i.parent_id);

      const builtRoots: MapaItem[] = rootItems.map((root) => {
        const children = pItems.filter((c) => c.parent_id === root.id);

        let dirProgress = root.progress_pct;
        let dirStatus = root.status;

        // Regra 1: O percentual de avanço de uma diretriz deve ser igual à média de avanço das ações de desdobramento
        if (children.length > 0) {
          const activeChildren = children.filter((c) => c.status !== "nao_sera_feito");
          if (activeChildren.length > 0) {
            dirProgress = Math.round(
              activeChildren.reduce((acc, c) => acc + (c.progress_pct || 0), 0) / activeChildren.length,
            );
            if (activeChildren.every((c) => c.status === "concluido")) {
              dirStatus = "concluido";
            } else if (activeChildren.some((c) => c.status === "em_andamento" || (c.progress_pct || 0) > 0)) {
              dirStatus = "em_andamento";
            } else {
              dirStatus = "aberto";
            }
          } else {
            dirProgress = 0;
            dirStatus = "nao_sera_feito";
          }
        }

        const updatedRoot: MapaItem = {
          ...root,
          progress_pct: dirProgress,
          status: dirStatus,
          children,
        };

        processedItems.push(updatedRoot, ...children);
        return updatedRoot;
      });

      // Capture any orphan children
      const rootIds = new Set(rootItems.map((r) => r.id));
      const orphans = pItems.filter((i) => i.parent_id && !rootIds.has(i.parent_id));
      processedItems.push(...orphans);

      treeByPillar[pKey] = [...builtRoots, ...orphans];
    }

    // Build pillars list with metrics
    // Regra: Contagem de status no dashboard considera APENAS ações (desdobramentos), nunca diretrizes.
    // Aplica-se rigorosamente tanto aos pilares padrão quanto a novos pilares criados.
    function buildPillarMeta(key: string, basePillar: any, pItems: MapaItem[]): PillarMeta {
      const pRoots = pItems.filter((i) => !i.parent_id);
      // Ações = itens com item_type !== "diretriz"
      const pAcoes = pItems.filter((i) => i.item_type !== "diretriz");

      const total = pAcoes.length;
      const concluidas = pAcoes.filter((i) => i.status === "concluido").length;
      const em_andamento = pAcoes.filter((i) => i.status === "em_andamento").length;
      const a_iniciar = pAcoes.filter((i) => i.status === "aberto").length;
      const nao_sera_feito = pAcoes.filter((i) => i.status === "nao_sera_feito").length;

      const activeAcoes = pAcoes.filter((i) => i.status !== "nao_sera_feito");
      const sumProgress = activeAcoes.reduce((acc, curr) => acc + (curr.progress_pct || 0), 0);
      const progress_pct = activeAcoes.length > 0 ? Math.round(sumProgress / activeAcoes.length) : 0;

      return {
        ...basePillar,
        total,
        concluidas,
        em_andamento,
        a_iniciar,
        nao_sera_feito,
        progress_pct,
        total_diretrizes: pRoots.length,
        total_desdobramentos: pAcoes.length,
      };
    }

    const pillars: PillarMeta[] = [];

    for (const def of DEFAULT_PILLARS) {
      const pItems = rawItems.filter((i) => i.demand_type.toLowerCase() === def.key);
      pillars.push(buildPillarMeta(def.key, def, pItems));
    }

    // Custom pillars found in items
    for (const key of foundKeys) {
      if (!standardKeys.has(key)) {
        const pItems = rawItems.filter((i) => i.demand_type.toLowerCase() === key);
        const pillarName = pItems.find((i) => i.custom_pillar)?.custom_pillar || key.toUpperCase();
        pillars.push(
          buildPillarMeta(
            key,
            {
              key,
              name: pillarName,
              description: `Pilar customizado: ${pillarName}`,
              gradient: "from-amber-500/20 via-orange-500/10 to-transparent",
              accent: "text-amber-600 dark:text-amber-400",
              border: "border-amber-300/60 dark:border-amber-700/50",
              badge: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
              progressColor: "bg-amber-600 dark:bg-amber-500",
            },
            pItems,
          ),
        );
      }
    }

    return {
      pillars,
      items: rawItems,
      treeByPillar,
    };
  });

export const saveMapaItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid().optional(),
        company_id: z.string().uuid(),
        title: z.string().min(1, "O título é obrigatório"),
        description: z.string().optional().nullable(),
        problem: z.string().optional().nullable(),
        cause: z.string().optional().nullable(),
        expected_result: z.string().optional().nullable(),
        responsible: z.string().optional().nullable(),
        sector: z.string().optional().nullable(),
        origin: z.string().optional().nullable(),
        status: z.enum(["aberto", "em_andamento", "concluido", "nao_sera_feito"]).default("aberto"),
        demand_type: z.string().min(1).default("processo"),
        parent_id: z.string().uuid().optional().nullable(),
        item_type: z.enum(["diretriz", "acao", "desdobramento"]).default("diretriz"),
        progress_pct: z.number().int().min(0).max(100).default(0),
        due_date: z.string().optional().nullable(),
        observations: z.string().optional().nullable(),
        custom_pillar: z.string().optional().nullable(),
        order_index: z.number().int().optional().default(0),
        gravity: z.number().int().min(1).max(5).optional().default(3),
        urgency: z.number().int().min(1).max(5).optional().default(3),
        trend: z.number().int().min(1).max(5).optional().default(3),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase;

    // Harmonize status & progress
    let adjustedStatus = data.status;
    let adjustedProgress = data.progress_pct;

    if (adjustedStatus === "concluido" && adjustedProgress < 100) {
      adjustedProgress = 100;
    } else if (adjustedProgress === 100 && adjustedStatus !== "concluido" && adjustedStatus !== "nao_sera_feito") {
      adjustedStatus = "concluido";
    } else if (adjustedProgress > 0 && adjustedProgress < 100 && adjustedStatus === "aberto") {
      adjustedStatus = "em_andamento";
    } else if (adjustedStatus === "nao_sera_feito") {
      adjustedProgress = 0;
    }

    const cleanObs = cleanObservations(data.observations);
    // Standard demand_type mapping for compatibility with planos-acao
    let standardDemand = data.demand_type.toLowerCase();
    const isCustomPillar = !["pessoas", "processo", "negocio"].includes(standardDemand) || !!data.custom_pillar;
    const resolvedCustomPillar = data.custom_pillar?.trim() || (isCustomPillar ? data.demand_type.toUpperCase() : null);

    if (!["pessoas", "processo", "negocio"].includes(standardDemand)) {
      standardDemand = "processo";
    }

    const metaTag = buildMetaTag({
      parent_id: data.parent_id,
      item_type: data.item_type,
      progress_pct: adjustedProgress,
      custom_pillar: resolvedCustomPillar,
      status: adjustedStatus,
      sector: data.sector || null,
      origin: data.origin || null,
      problem: data.problem || null,
      cause: data.cause || null,
      expected_result: data.expected_result || null,
      gravity: data.gravity,
      urgency: data.urgency,
      trend: data.trend,
    });
    const finalObservations = [cleanObs, metaTag].filter(Boolean).join(" ");

    // gut_score is a GENERATED ALWAYS column in DB — never insert/update it directly
    const gutScore = (data.gravity ?? 3) * (data.urgency ?? 3) * (data.trend ?? 3);
    const priority =
      gutScore >= 75 ? "critica" : gutScore >= 40 ? "alta" : gutScore >= 15 ? "media" : "baixa";

    // Safe DB status: if enum does not accept nao_sera_feito yet, use aberto in column and store in meta
    const dbStatus = adjustedStatus === "nao_sera_feito" ? "aberto" : adjustedStatus;

    const isDiretriz = data.item_type === "diretriz";

    // Diretriz: only structural/labeling fields — no GUT, no action fields
    // Desdobramento/acao: all action fields included
    const basePayload: any = {
      company_id: data.company_id,
      title: data.title,
      description: data.description || "",
      responsible: isDiretriz ? (data.responsible || "") : (data.responsible || ""),
      status: dbStatus,
      demand_type: standardDemand,
      observations: finalObservations,
      // Action-specific fields only for non-diretriz
      ...(isDiretriz
        ? {}
        : {
            problem: data.problem || null,
            cause: data.cause || null,
            expected_result: data.expected_result || null,
            sector: data.sector || null,
            origin: data.origin || null,
            priority,
            gravity: data.gravity ?? 3,
            urgency: data.urgency ?? 3,
            trend: data.trend ?? 3,
            due_date: data.due_date || null,
          }),
    };

    const extendedPayload = {
      ...basePayload,
      parent_id: data.parent_id || null,
      item_type: data.item_type,
      progress_pct: adjustedProgress,
      order_index: data.order_index ?? 0,
      custom_pillar: resolvedCustomPillar,
    };

    // Try with actual status first (in case enum was migrated)
    const tryExtendedWithActualStatus = {
      ...extendedPayload,
      status: adjustedStatus,
    };

    if (data.id) {
      // 1. Try update with actual status and extended payload
      let res = await (sb.from("action_plans") as any)
        .update(tryExtendedWithActualStatus)
        .eq("id", data.id)
        .select()
        .maybeSingle();

      // If failed due to enum value nao_sera_feito, retry with dbStatus
      if (res.error && res.error.message?.includes("action_status")) {
        res = await (sb.from("action_plans") as any)
          .update(extendedPayload)
          .eq("id", data.id)
          .select()
          .maybeSingle();
      }

      // If schema error because columns don't exist yet, fallback to basePayload
      if (res.error && (res.error.message?.includes("column") || res.error.code === "PGRST204")) {
        const fallbackRes = await (sb.from("action_plans") as any)
          .update(basePayload)
          .eq("id", data.id)
          .select()
          .single();
        if (fallbackRes.error) throw new Error(fallbackRes.error.message);
        return fallbackRes.data;
      } else if (res.error) {
        throw new Error(res.error.message);
      }

      return res.data;
    } else {
      // Insert new
      let res = await (sb.from("action_plans") as any)
        .insert({
          ...tryExtendedWithActualStatus,
          created_by: context.userId,
        })
        .select()
        .maybeSingle();

      // If failed due to enum value nao_sera_feito, retry with dbStatus
      if (res.error && res.error.message?.includes("action_status")) {
        res = await (sb.from("action_plans") as any)
          .insert({
            ...extendedPayload,
            created_by: context.userId,
          })
          .select()
          .maybeSingle();
      }

      // If schema error because columns don't exist yet, fallback to basePayload
      if (res.error && (res.error.message?.includes("column") || res.error.code === "PGRST204")) {
        const fallbackRes = await (sb.from("action_plans") as any)
          .insert({
            ...basePayload,
            created_by: context.userId,
          })
          .select()
          .single();
        if (fallbackRes.error) throw new Error(fallbackRes.error.message);
        return fallbackRes.data;
      } else if (res.error) {
        throw new Error(res.error.message);
      }

      return res.data;
    }
  });

export const deleteMapaItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;

    // 1. Delete children whose parent_id is this item
    await (sb.from("action_plans") as any).delete().eq("parent_id", data.id);

    // 2. Also check if any children have this parent_id stored in observations fallback
    const { data: allPlans } = await sb
      .from("action_plans")
      .select("id, observations")
      .ilike("observations", `%${data.id}%`);

    if (allPlans?.length) {
      for (const p of allPlans) {
        const meta = extractMeta(p.observations);
        if (meta?.parent_id === data.id) {
          await sb.from("action_plans").delete().eq("id", p.id);
        }
      }
    }

    // 3. Delete the item itself
    const { error } = await sb.from("action_plans").delete().eq("id", data.id);
    if (error) throw new Error(error.message);

    return { ok: true };
  });
