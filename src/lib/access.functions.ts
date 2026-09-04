import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const TOOLS = [
  { key: "gestao", label: "Gestão" },
  { key: "pop", label: "POP" },
  { key: "indicadores", label: "Indicadores" },
  { key: "financeiro", label: "Financeiro" },
  { key: "crm", label: "CRM" },
  { key: "horas", label: "Horas" },
  { key: "chamados", label: "Chamados" },
] as const;

export type ToolKey = (typeof TOOLS)[number]["key"];
export const MEMBER_ROLES = ["gestor", "consultor", "cliente"] as const;

export type Me = {
  userId: string;
  email: string | null;
  fullName: string;
  isSuperadmin: boolean;
  status: "pending" | "active" | "rejected";
  memberships: Array<{
    company_id: string;
    company_name: string | null;
    member_role: string;
    permissions: Record<string, boolean>;
  }>;
};

async function assertSuperadmin(sb: any) {
  const { data } = await sb.from("profiles").select("is_superadmin").maybeSingle();
  if (!data?.is_superadmin) throw new Error("Acesso restrito ao SuperAdmin");
}

export const getMe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Me> => {
    const sb: any = context.supabase;
    const { data: profile } = await sb
      .from("profiles")
      .select("user_id, email, full_name, is_superadmin, status")
      .eq("user_id", context.userId)
      .maybeSingle();

    const { data: members } = await sb
      .from("company_members")
      .select("company_id, member_role, permissions, companies(name)")
      .eq("user_id", context.userId);

    return {
      userId: context.userId,
      email: profile?.email ?? null,
      fullName: profile?.full_name ?? "",
      isSuperadmin: !!profile?.is_superadmin,
      status: (profile?.status ?? "pending") as Me["status"],
      memberships: (members ?? []).map((m: any) => ({
        company_id: m.company_id,
        company_name: m.companies?.name ?? null,
        member_role: m.member_role,
        permissions: (m.permissions ?? {}) as Record<string, boolean>,
      })),
    };
  });

export const requestAccess = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        full_name: z.string().trim().max(120).default(""),
        requested_company: z.string().trim().max(160).default(""),
        message: z.string().trim().max(600).default(""),
      })
      .parse(d ?? {}),
  )
  .handler(async ({ data, context }) => {
    const sb: any = context.supabase;
    const { data: existing } = await sb
      .from("access_requests")
      .select("id, status")
      .eq("user_id", context.userId)
      .eq("status", "pending")
      .maybeSingle();
    if (existing) return { ok: true, alreadyPending: true };

    const { error } = await sb.from("access_requests").insert({
      user_id: context.userId,
      email: context.claims?.email ?? null,
      full_name: data.full_name,
      requested_company: data.requested_company,
      message: data.message,
    });
    if (error) throw new Error(error.message);
    return { ok: true, alreadyPending: false };
  });

/* ---------------- SuperAdmin ---------------- */

export const adminListUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb: any = context.supabase;
    await assertSuperadmin(sb);
    const [{ data: profiles }, { data: members }, { data: requests }] = await Promise.all([
      sb.from("profiles").select("*").order("created_at", { ascending: false }),
      sb.from("company_members").select("*, companies(id, name)"),
      sb.from("access_requests").select("*").order("created_at", { ascending: false }),
    ]);
    return {
      profiles: profiles ?? [],
      members: members ?? [],
      requests: requests ?? [],
    };
  });

export const adminSetUserStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      user_id: z.string().uuid(),
      status: z.enum(["pending", "active", "rejected"]),
      request_id: z.string().uuid().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb: any = context.supabase;
    await assertSuperadmin(sb);
    const { error } = await sb.from("profiles").update({ status: data.status }).eq("user_id", data.user_id);
    if (error) throw new Error(error.message);

    if (data.request_id) {
      await sb
        .from("access_requests")
        .update({
          status: data.status === "active" ? "approved" : "rejected",
          decided_by: context.userId,
          decided_at: new Date().toISOString(),
        })
        .eq("id", data.request_id);
    }

    await sb.from("audit_log").insert({
      actor_id: context.userId,
      action: "user_status_change",
      entity: "profiles",
      entity_id: data.user_id,
      details: { status: data.status },
    });
    return { ok: true };
  });

export const adminSaveMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      user_id: z.string().uuid(),
      company_id: z.string().uuid(),
      member_role: z.enum(MEMBER_ROLES),
      permissions: z.record(z.string(), z.boolean()).default({}),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb: any = context.supabase;
    await assertSuperadmin(sb);
    const { error } = await sb
      .from("company_members")
      .upsert(
        {
          user_id: data.user_id,
          company_id: data.company_id,
          member_role: data.member_role,
          permissions: data.permissions,
        },
        { onConflict: "user_id,company_id" },
      );
    if (error) throw new Error(error.message);

    await sb.from("audit_log").insert({
      actor_id: context.userId,
      action: "member_permissions_change",
      entity: "company_members",
      company_id: data.company_id,
      details: { user_id: data.user_id, member_role: data.member_role, permissions: data.permissions },
    });
    return { ok: true };
  });

export const adminRemoveMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ user_id: z.string().uuid(), company_id: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb: any = context.supabase;
    await assertSuperadmin(sb);
    const { error } = await sb
      .from("company_members")
      .delete()
      .eq("user_id", data.user_id)
      .eq("company_id", data.company_id);
    if (error) throw new Error(error.message);
    await sb.from("audit_log").insert({
      actor_id: context.userId,
      action: "member_removed",
      entity: "company_members",
      company_id: data.company_id,
      details: { user_id: data.user_id },
    });
    return { ok: true };
  });

export const adminListAudit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb: any = context.supabase;
    await assertSuperadmin(sb);
    const { data } = await sb
      .from("audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    return data ?? [];
  });
