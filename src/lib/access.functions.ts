import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const TOOLS = [
  { key: "portal", label: "Portal do cliente" },
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

const personalDataSchema = z.object({
  full_name: z.string().trim().min(3, "Informe o nome completo").max(120),
  cpf: z.string().transform((value) => value.replace(/\D/g, "")).refine((value) => value.length === 11, "CPF inválido"),
  birth_date: z.string().date("Data de nascimento inválida"),
  whatsapp: z.string().transform((value) => value.replace(/\D/g, "")).refine((value) => value.length >= 10 && value.length <= 13, "WhatsApp inválido"),
});

async function assertSuperadmin(sb: any, userId?: string) {
  let q = sb.from("profiles").select("is_superadmin");
  if (userId) q = q.eq("user_id", userId);
  const { data } = await q.limit(1).maybeSingle();
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

    const claims: any = context.claims ?? {};
    const email: string | null = profile?.email ?? claims.email ?? null;
    const metaName: string =
      claims.user_metadata?.full_name || claims.user_metadata?.name || "";
    const fullName =
      (profile?.full_name && String(profile.full_name).trim()) ||
      (metaName && String(metaName).trim()) ||
      (email ? String(email).split("@")[0].replace(/[._-]+/g, " ") : "");

    if (!profile?.full_name && fullName) {
      await sb.from("profiles").update({ full_name: fullName }).eq("user_id", context.userId);
    }

    return {
      userId: context.userId,
      email,
      fullName,
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
    await assertSuperadmin(sb, context.userId);
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
    await assertSuperadmin(sb, context.userId);
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
    await assertSuperadmin(sb, context.userId);
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
    await assertSuperadmin(sb, context.userId);
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
    await assertSuperadmin(sb, context.userId);
    const { data } = await sb
      .from("audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    return data ?? [];
  });

export const adminUpdateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => personalDataSchema.extend({
    user_id: z.string().uuid(),
    email: z.string().trim().email("E-mail inválido"),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const sb: any = context.supabase;
    await assertSuperadmin(sb, context.userId);
    const { data: current, error: currentError } = await sb
      .from("profiles")
      .select("email")
      .eq("user_id", data.user_id)
      .single();
    if (currentError) throw new Error(currentError.message);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, {
      ...(current.email !== data.email ? { email: data.email, email_confirm: true } : {}),
      user_metadata: { full_name: data.full_name, cpf: data.cpf, birth_date: data.birth_date, whatsapp: data.whatsapp },
    });
    if (authError) throw new Error(authError.message);

    const { error } = await sb.from("profiles").update({
      email: data.email,
      full_name: data.full_name,
      cpf: data.cpf,
      birth_date: data.birth_date,
      whatsapp: data.whatsapp,
    }).eq("user_id", data.user_id);
    if (error) throw new Error(error.message);

    await sb.from("audit_log").insert({
      actor_id: context.userId,
      action: "user_updated",
      entity: "profiles",
      entity_id: data.user_id,
      details: { email_changed: current.email !== data.email },
    });
    return { ok: true };
  });

export const adminCreateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => personalDataSchema.extend({
    email: z.string().trim().email("E-mail inválido"),
    password: z.string().min(8, "A senha temporária deve ter pelo menos 8 caracteres").max(72),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const sb: any = context.supabase;
    await assertSuperadmin(sb, context.userId);
    const resetUrl = new URL(data.redirect_to);
    const isAllowedHost = resetUrl.hostname === "localhost" || resetUrl.hostname.endsWith(".lovable.app");
    if (!isAllowedHost || resetUrl.pathname !== "/auth") throw new Error("Endereço de recuperação inválido");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        full_name: data.full_name,
        cpf: data.cpf,
        birth_date: data.birth_date,
        whatsapp: data.whatsapp,
      },
    });
    if (error || !created.user) throw new Error(error?.message ?? "Não foi possível criar o usuário");
    const { error: profileError } = await sb.from("profiles").update({
      email: data.email,
      full_name: data.full_name,
      cpf: data.cpf,
      birth_date: data.birth_date,
      whatsapp: data.whatsapp,
      status: "active",
    }).eq("user_id", created.user.id);
    if (profileError) throw new Error(profileError.message);
    await sb.from("audit_log").insert({
      actor_id: context.userId,
      action: "user_created",
      entity: "profiles",
      entity_id: created.user.id,
      details: { email: data.email },
    });
    return { ok: true };
  });

export const adminSendPasswordReset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    user_id: z.string().uuid(),
    email: z.string().email(),
    redirect_to: z.string().url(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const sb: any = context.supabase;
    await assertSuperadmin(sb, context.userId);
    const { data: profile } = await sb.from("profiles").select("email").eq("user_id", data.user_id).single();
    if (!profile || profile.email !== data.email) throw new Error("Usuário ou e-mail inválido");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(data.email, { redirectTo: data.redirect_to });
    if (error) throw new Error(error.message);
    await sb.from("audit_log").insert({
      actor_id: context.userId,
      action: "password_reset_sent",
      entity: "profiles",
      entity_id: data.user_id,
      details: {},
    });
    return { ok: true };
  });

export const adminDeleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ user_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb: any = context.supabase;
    await assertSuperadmin(sb, context.userId);
    if (data.user_id === context.userId) throw new Error("O SuperAdmin não pode excluir a própria conta");
    const { data: target } = await sb.from("profiles").select("is_superadmin, email").eq("user_id", data.user_id).single();
    if (!target || target.is_superadmin) throw new Error("Uma conta SuperAdmin não pode ser excluída aqui");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.user_id);
    if (error) throw new Error(error.message);
    await Promise.all([
      sb.from("company_members").delete().eq("user_id", data.user_id),
      sb.from("access_requests").delete().eq("user_id", data.user_id),
      sb.from("profiles").delete().eq("user_id", data.user_id),
    ]);
    await sb.from("audit_log").insert({
      actor_id: context.userId,
      action: "user_deleted",
      entity: "profiles",
      entity_id: data.user_id,
      details: { email: target.email },
    });
    return { ok: true };
  });
