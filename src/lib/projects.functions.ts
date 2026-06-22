import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ProjectStatus = "planejamento" | "em_andamento" | "pausado" | "concluido" | "arquivado";

export const listProjects = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("projects")
      .select("id, name, description, responsible, status, start_date, end_date, progress_pct, company_id, created_at, companies(name)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const getProject = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { data: project, error } = await context.supabase
      .from("projects")
      .select("*, companies(id, name)")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw error;
    return project;
  });

export const createProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { company_id: string; name: string; description?: string; responsible?: string; status?: ProjectStatus; start_date?: string | null; end_date?: string | null }) => d)
  .handler(async ({ data, context }) => {
    const { data: project, error } = await context.supabase
      .from("projects")
      .insert({
        company_id: data.company_id,
        name: data.name,
        description: data.description ?? "",
        responsible: data.responsible ?? "",
        status: data.status ?? "planejamento",
        start_date: data.start_date ?? null,
        end_date: data.end_date ?? null,
        created_by: context.userId,
      })
      .select()
      .single();
    if (error) throw error;
    return project;
  });

export const updateProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; patch: Partial<{ name: string; description: string; responsible: string; status: ProjectStatus; start_date: string | null; end_date: string | null; progress_pct: number }> }) => d)
  .handler(async ({ data, context }) => {
    const { data: project, error } = await context.supabase
      .from("projects")
      .update(data.patch)
      .eq("id", data.id)
      .select()
      .single();
    if (error) throw error;
    return project;
  });

export const deleteProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("projects").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const getProjectStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    const projectId = data.id;
    const sb = context.supabase;
    const today = new Date().toISOString().slice(0, 10);
    const [interviews, processes, opportunities, openPlans, overduePlans, indicators] = await Promise.all([
      sb.from("interviews").select("id", { count: "exact", head: true }).eq("project_id", projectId),
      sb.from("processes").select("id", { count: "exact", head: true }).eq("project_id", projectId),
      sb.from("improvement_opportunities").select("id", { count: "exact", head: true }).eq("project_id", projectId),
      sb.from("action_plans").select("id", { count: "exact", head: true }).eq("project_id", projectId).in("status", ["aberto", "em_andamento"]),
      sb.from("action_plans").select("id", { count: "exact", head: true }).eq("project_id", projectId).lt("due_date", today).neq("status", "concluido"),
      sb.from("indicators").select("id", { count: "exact", head: true }).eq("project_id", projectId),
    ]);
    return {
      interviews: interviews.count ?? 0,
      processes: processes.count ?? 0,
      opportunities: opportunities.count ?? 0,
      openPlans: openPlans.count ?? 0,
      overduePlans: overduePlans.count ?? 0,
      indicators: indicators.count ?? 0,
      criticalIndicators: 0,
      lateIndicators: 0,
    };
  });
