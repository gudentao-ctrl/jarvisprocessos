import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/* ============================================================
 * ADMIN — configuração da página pública
 * ============================================================ */

export const getPortalSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ company_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("companies")
      .select(
        "id, name, public_token, public_enabled, public_title, public_company_logo_url, public_consultancy_logo_url",
      )
      .eq("id", data.company_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const updatePortalSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        company_id: z.string().uuid(),
        public_enabled: z.boolean().optional(),
        public_title: z.string().max(200).nullable().optional(),
        public_company_logo_url: z.string().max(1000).nullable().optional(),
        public_consultancy_logo_url: z.string().max(1000).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const patch: {
      public_enabled?: boolean;
      public_title?: string | null;
      public_company_logo_url?: string | null;
      public_consultancy_logo_url?: string | null;
    } = {};
    if (data.public_enabled !== undefined) patch.public_enabled = data.public_enabled;
    if (data.public_title !== undefined) patch.public_title = data.public_title || null;
    if (data.public_company_logo_url !== undefined)
      patch.public_company_logo_url = data.public_company_logo_url || null;
    if (data.public_consultancy_logo_url !== undefined)
      patch.public_consultancy_logo_url = data.public_consultancy_logo_url || null;

    const { data: row, error } = await context.supabase
      .from("companies")
      .update(patch)
      .eq("id", data.company_id)
      .select(
        "id, name, public_token, public_enabled, public_title, public_company_logo_url, public_consultancy_logo_url",
      )
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const regeneratePortalToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ company_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    // Gera 24 bytes aleatórios → base64url ~ 32 chars
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    const b64 = btoa(String.fromCharCode(...bytes))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    const { data: row, error } = await context.supabase
      .from("companies")
      .update({ public_token: b64 })
      .eq("id", data.company_id)
      .select("id, public_token")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

/* ============================================================
 * PORTAL DO CLIENTE — dashboard read-only autenticado
 * ============================================================ */

async function adminClient() {
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Converte um caminho no bucket privado em URL assinada; mantém URLs http intactas. */
async function resolveLogo(sb: any, value: string | null): Promise<string | null> {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  const { data } = await sb.storage.from("portal-logos").createSignedUrl(value, 60 * 60 * 12);
  return data?.signedUrl ?? null;
}

async function requirePortalAccess(userSb: any, userId: string, companyId: string) {
  const { data: profile, error: profileError } = await userSb
    .from("profiles")
    .select("status, is_superadmin")
    .eq("user_id", userId)
    .maybeSingle();
  if (profileError) throw new Error(profileError.message);
  if (!profile || (profile.status !== "active" && !profile.is_superadmin)) {
    throw new Error("Seu cadastro ainda não foi aprovado pelo SuperAdmin.");
  }
  if (profile.is_superadmin) return;

  const { data: membership, error: membershipError } = await userSb
    .from("company_members")
    .select("permissions")
    .eq("user_id", userId)
    .eq("company_id", companyId)
    .maybeSingle();
  if (membershipError) throw new Error(membershipError.message);
  if (membership?.permissions?.portal !== true) {
    throw new Error("Seu acesso ao portal desta empresa não foi liberado pelo SuperAdmin.");
  }
}

export const getPublicDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ token: z.string().min(8).max(64) }).parse(d))
  .handler(async ({ data, context }) => {
    setResponseHeader("Cache-Control", "private, no-store");
    const sb = await adminClient();

    const { data: company, error: ce } = await sb
      .from("companies")
      .select(
        "id, name, public_enabled, public_title, public_company_logo_url, public_consultancy_logo_url, updated_at",
      )
      .eq("public_token", data.token)
      .maybeSingle();
    if (ce) throw new Error(ce.message);
    if (!company || !company.public_enabled) return null;

    const companyId = company.id as string;
    await requirePortalAccess(context.supabase, context.userId, companyId);

    const [indicators, plans, processes, causes, pains, interviews, sectors] = await Promise.all([
      sb
        .from("indicators")
        .select(
          "id, code, name, description, unit, target, frequency, direction, critical_min, critical_max, responsible_name, process_id",
        )
        .eq("company_id", companyId)
        .order("name"),
      sb
        .from("action_plans")
        .select(
          "id, title, problem, cause, category, demand_type, sector, sector_id, responsible, priority, status, gravity, urgency, trend, due_date, new_due_date, expected_result, observations, origin, created_at, updated_at, process_id, indicator_id, root_cause_id, pain_point_id, interview_id",
        )
        .eq("company_id", companyId)
        .order("created_at", { ascending: false }),
      sb.from("processes").select("id, name").eq("company_id", companyId),
      sb.from("root_cause_analyses").select("id, problem, conclusion, pain_point_id").eq("company_id", companyId),
      sb.from("pain_points").select("id, description, source_interview_id").eq("company_id", companyId),
      sb.from("interviews").select("id, title, interview_date").eq("company_id", companyId),
      sb.from("sectors").select("id, name").eq("company_id", companyId).order("name"),
    ]);
    if (indicators.error) throw new Error(indicators.error.message);
    if (plans.error) throw new Error(plans.error.message);
    if (processes.error) throw new Error(processes.error.message);
    if (causes.error) throw new Error(causes.error.message);
    if (pains.error) throw new Error(pains.error.message);
    if (interviews.error) throw new Error(interviews.error.message);
    if (sectors.error) throw new Error(sectors.error.message);

    const indIds = (indicators.data ?? []).map((i) => i.id);
    let collections: any[] = [];
    if (indIds.length) {
      const { data: cols, error: coe } = await sb
        .from("indicator_collections")
        .select("id, indicator_id, value, reference_period, submitted_at, evaluation, observation")
        .in("indicator_id", indIds)
        .order("submitted_at", { ascending: true });
      if (coe) throw new Error(coe.message);
      collections = cols ?? [];
    }

    const [companyLogo, consultancyLogo] = await Promise.all([
      resolveLogo(sb, company.public_company_logo_url as string | null),
      resolveLogo(sb, company.public_consultancy_logo_url as string | null),
    ]);

    return {
      company: {
        id: company.id,
        name: company.name,
        title: company.public_title || company.name,
        company_logo_url: companyLogo,
        consultancy_logo_url: consultancyLogo,
        updated_at: company.updated_at,
      },
      indicators: indicators.data ?? [],
      collections,
      plans: plans.data ?? [],
      processes: processes.data ?? [],
      causes: causes.data ?? [],
      pains: pains.data ?? [],
      interviews: interviews.data ?? [],
      sectors: sectors.data ?? [],
    };
  });

export const getPublicPlanDetails = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ token: z.string().min(8).max(64), plan_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    setResponseHeader("Cache-Control", "private, no-store");
    const sb = await adminClient();

    const { data: company, error: ce } = await sb
      .from("companies")
      .select("id, public_enabled")
      .eq("public_token", data.token)
      .maybeSingle();
    if (ce) throw new Error(ce.message);
    if (!company || !company.public_enabled) return null;
    await requirePortalAccess(context.supabase, context.userId, company.id as string);

    const { data: plan, error: pe } = await sb
      .from("action_plans")
      .select(
        "id, title, problem, cause, category, demand_type, sector, responsible, priority, status, gravity, urgency, trend, due_date, new_due_date, expected_result, observations, evidences, origin, created_at, updated_at",
      )
      .eq("id", data.plan_id)
      .eq("company_id", company.id)
      .maybeSingle();
    if (pe) throw new Error(pe.message);
    if (!plan) return null;

    const { data: history, error: he } = await sb
      .from("action_plan_history")
      .select("id, field, old_value, new_value, comment, changed_at")
      .eq("plan_id", data.plan_id)
      .order("changed_at", { ascending: false });
    if (he) throw new Error(he.message);

    return { plan, history: history ?? [] };
  });
