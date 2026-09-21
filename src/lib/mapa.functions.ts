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
  total: number;
  concluidas: number;
  em_andamento: number;
  a_iniciar: number;
  progress_pct: number;
};

export type MapaItem = {
  id: string;
  company_id: string;
  title: string;
  description?: string | null;
  responsible?: string | null;
  status: "aberto" | "em_andamento" | "concluido";
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
    const items: MapaItem[] = (rows ?? []).map((r: any) => {
      const meta = extractMeta(r.observations);
      const parent_id = r.parent_id !== undefined && r.parent_id !== null ? r.parent_id : meta?.parent_id ?? null;
      const item_type = r.item_type || meta?.item_type || (parent_id ? "desdobramento" : "diretriz");
      
      let progress_pct = 0;
      if (r.progress_pct !== undefined && r.progress_pct !== null) {
        progress_pct = Number(r.progress_pct);
      } else if (meta?.progress_pct !== undefined && meta?.progress_pct !== null) {
        progress_pct = Number(meta.progress_pct);
      } else if (r.status === "concluido") {
        progress_pct = 100;
      } else if (r.status === "em_andamento") {
        progress_pct = 50;
      }

      const custom_pillar = r.custom_pillar || meta?.custom_pillar || null;
      const rawDemand = (r.demand_type || "processo").toLowerCase();
      const demand_type = custom_pillar ? custom_pillar.toLowerCase() : rawDemand;

      return {
        id: r.id,
        company_id: r.company_id,
        title: r.title,
        description: r.description || null,
        responsible: r.responsible || null,
        status: (r.status as any) || "aberto",
        demand_type,
        due_date: r.due_date || r.new_due_date || null,
        observations: cleanObservations(r.observations),
        parent_id,
        item_type: item_type as any,
        progress_pct,
        order_index: r.order_index ?? 0,
        custom_pillar,
        gravity: r.gravity ?? 3,
        urgency: r.urgency ?? 3,
        trend: r.trend ?? 3,
        gut_score: r.gut_score ?? (r.gravity ?? 3) * (r.urgency ?? 3) * (r.trend ?? 3),
        created_at: r.created_at,
        updated_at: r.updated_at,
      };
    });

    // Detect distinct pillars
    const standardKeys = new Set(["pessoas", "processo", "negocio"]);
    const foundKeys = new Set(items.map((i) => i.demand_type.toLowerCase()));
    
    // Build pillars list with metrics
    const pillars: PillarMeta[] = [];

    // 1. Standard pillars always available
    for (const def of DEFAULT_PILLARS) {
      const pItems = items.filter((i) => i.demand_type.toLowerCase() === def.key);
      const total = pItems.length;
      const concluidas = pItems.filter((i) => i.status === "concluido").length;
      const em_andamento = pItems.filter((i) => i.status === "em_andamento").length;
      const a_iniciar = pItems.filter((i) => i.status === "aberto").length;
      
      const sumProgress = pItems.reduce((acc, curr) => acc + (curr.progress_pct || 0), 0);
      const progress_pct = total > 0 ? Math.round(sumProgress / total) : 0;

      pillars.push({
        ...def,
        total,
        concluidas,
        em_andamento,
        a_iniciar,
        progress_pct,
      });
    }

    // 2. Custom pillars found in items
    for (const key of foundKeys) {
      if (!standardKeys.has(key)) {
        const pItems = items.filter((i) => i.demand_type.toLowerCase() === key);
        const total = pItems.length;
        const concluidas = pItems.filter((i) => i.status === "concluido").length;
        const em_andamento = pItems.filter((i) => i.status === "em_andamento").length;
        const a_iniciar = pItems.filter((i) => i.status === "aberto").length;
        const sumProgress = pItems.reduce((acc, curr) => acc + (curr.progress_pct || 0), 0);
        const progress_pct = total > 0 ? Math.round(sumProgress / total) : 0;

        pillars.push({
          key,
          name: key.toUpperCase(),
          description: `Pilar customizado: ${key.toUpperCase()}`,
          gradient: "from-amber-500/20 via-orange-500/10 to-transparent",
          accent: "text-amber-600 dark:text-amber-400",
          border: "border-amber-300/60 dark:border-amber-700/50",
          badge: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
          progressColor: "bg-amber-600 dark:bg-amber-500",
          total,
          concluidas,
          em_andamento,
          a_iniciar,
          progress_pct,
        });
      }
    }

    // Build hierarchical tree by pillar
    // Root level: items with parent_id === null or item_type === 'diretriz'
    const treeByPillar: Record<string, MapaItem[]> = {};

    for (const p of pillars) {
      const pItems = items.filter((i) => i.demand_type.toLowerCase() === p.key);
      const rootItems = pItems.filter((i) => !i.parent_id);
      
      const builtRoots = rootItems.map((root) => {
        const children = pItems.filter((c) => c.parent_id === root.id);
        return {
          ...root,
          children,
        };
      });

      // Also capture any orphan children whose parent is not found in rootItems
      const rootIds = new Set(rootItems.map((r) => r.id));
      const orphans = pItems.filter((i) => i.parent_id && !rootIds.has(i.parent_id));
      
      treeByPillar[p.key] = [...builtRoots, ...orphans];
    }

    return {
      pillars,
      items,
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
        responsible: z.string().optional().nullable(),
        status: z.enum(["aberto", "em_andamento", "concluido"]).default("aberto"),
        demand_type: z.string().min(1).default("processo"),
        parent_id: z.string().uuid().optional().nullable(),
        item_type: z.enum(["diretriz", "acao", "desdobramento"]).default("diretriz"),
        progress_pct: z.number().int().min(0).max(100).default(0),
        due_date: z.string().optional().nullable(),
        observations: z.string().optional().nullable(),
        custom_pillar: z.string().optional().nullable(),
        order_index: z.number().int().optional().default(0),
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
    } else if (adjustedProgress === 100 && adjustedStatus !== "concluido") {
      adjustedStatus = "concluido";
    } else if (adjustedProgress > 0 && adjustedProgress < 100 && adjustedStatus === "aberto") {
      adjustedStatus = "em_andamento";
    }

    const cleanObs = cleanObservations(data.observations);
    const metaTag = buildMetaTag({
      parent_id: data.parent_id,
      item_type: data.item_type,
      progress_pct: adjustedProgress,
      custom_pillar: data.custom_pillar || null,
    });
    const finalObservations = [cleanObs, metaTag].filter(Boolean).join(" ");

    // Standard demand_type mapping for compatibility with planos-acao
    let standardDemand = data.demand_type.toLowerCase();
    if (!["pessoas", "processo", "negocio"].includes(standardDemand)) {
      // It's a custom pillar, default to processo in demand_type and record custom_pillar
      standardDemand = "processo";
    }

    const basePayload: any = {
      company_id: data.company_id,
      title: data.title,
      description: data.description || "",
      responsible: data.responsible || "",
      status: adjustedStatus,
      demand_type: standardDemand,
      due_date: data.due_date || null,
      observations: finalObservations,
    };

    const extendedPayload = {
      ...basePayload,
      parent_id: data.parent_id || null,
      item_type: data.item_type,
      progress_pct: adjustedProgress,
      order_index: data.order_index ?? 0,
      custom_pillar: data.custom_pillar || null,
    };

    if (data.id) {
      // Try update with extended columns
      let { data: row, error } = await (sb.from("action_plans") as any)
        .update(extendedPayload)
        .eq("id", data.id)
        .select()
        .maybeSingle();

      // If schema error because columns don't exist yet, fallback to basePayload
      if (error && (error.message?.includes("column") || error.code === "PGRST204")) {
        const fallbackRes = await (sb.from("action_plans") as any)
          .update(basePayload)
          .eq("id", data.id)
          .select()
          .single();
        if (fallbackRes.error) throw new Error(fallbackRes.error.message);
        row = fallbackRes.data;
      } else if (error) {
        throw new Error(error.message);
      }

      return row;
    } else {
      // Insert new
      let { data: row, error } = await (sb.from("action_plans") as any)
        .insert({
          ...extendedPayload,
          created_by: context.userId,
        })
        .select()
        .maybeSingle();

      // If schema error because columns don't exist yet, fallback to basePayload
      if (error && (error.message?.includes("column") || error.code === "PGRST204")) {
        const fallbackRes = await (sb.from("action_plans") as any)
          .insert({
            ...basePayload,
            created_by: context.userId,
          })
          .select()
          .single();
        if (fallbackRes.error) throw new Error(fallbackRes.error.message);
        row = fallbackRes.data;
      } else if (error) {
        throw new Error(error.message);
      }

      return row;
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
