import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { normalizePermissions, PERMISSION_CATALOG, PERMISSION_ACTIONS } from "./permission-catalog";

export const permissionSchema = z.object({
  version: z.literal(1),
  categories: z.record(z.string(), z.boolean()),
  sub_modules: z.record(z.string(), z.boolean()),
  actions: z.record(z.string(), z.object(Object.fromEntries(PERMISSION_ACTIONS.map((action) => [action, z.boolean().optional()])))),
});

export async function assertAccessAdmin(sb: any) {
  const { data, error } = await sb.rpc("is_access_superadmin");
  if (error || data !== true) throw new Error("Acesso restrito ao SuperAdmin");
}

export async function assertPermission(sb: any, companyId: string | null, tool: string, action = "read") {
  const { data, error } = await sb.rpc("has_company_permission", { _company_id: companyId, _tool: tool, _action: action });
  if (error || data !== true) throw new Error("Você não tem permissão para esta operação nesta empresa.");
}

export const getPermissionWorkspace = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAccessAdmin(context.supabase);
    const [users, companies, memberships] = await Promise.all([
      context.supabase.from("profiles").select("user_id,full_name,email,status,is_superadmin").order("full_name"),
      context.supabase.from("companies").select("id,name,is_active").order("name"),
      context.supabase.from("user_company_permissions").select("*").order("updated_at", { ascending: false }),
    ]);
    for (const result of [users, companies, memberships]) if (result.error) throw new Error(result.error.message);
    return { users: users.data ?? [], companies: companies.data ?? [], memberships: memberships.data ?? [] };
  });

export const saveCompanyPermissions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ user_id: z.string().uuid(), company_id: z.string().uuid(), role: z.enum(["CLIENTE", "CONSULTOR", "GESTOR", "SUPERADMIN"]), permissions: permissionSchema, grant_superadmin: z.boolean().default(false) }).parse(input))
  .handler(async ({ context, data }) => {
    await assertAccessAdmin(context.supabase);
    const known = new Set(PERMISSION_CATALOG.flatMap((group) => group.tools.map((tool) => tool.key)));
    if (Object.keys(data.permissions.sub_modules).some((key) => !known.has(key))) throw new Error("Ferramenta não cadastrada");
    const { error } = await context.supabase.rpc("save_company_permissions", {
      _user_id: data.user_id, _company_id: data.company_id, _role: data.role,
      _permissions: normalizePermissions(data.permissions) as any, _grant_superadmin: data.grant_superadmin,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });