import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const TICKET_KINDS = [
  { value: "melhoria", label: "Melhoria" },
  { value: "bug", label: "Erro / bug" },
] as const;

export const TICKET_PRIORITIES = [
  { value: "baixa", label: "Baixa" },
  { value: "media", label: "Média" },
  { value: "alta", label: "Alta" },
] as const;

export const TICKET_STATUS = [
  { value: "aberto", label: "Aberto" },
  { value: "em_analise", label: "Em análise" },
  { value: "resolvido", label: "Resolvido" },
  { value: "recusado", label: "Recusado" },
] as const;

export function ticketKindLabel(v?: string | null) {
  return TICKET_KINDS.find((k) => k.value === v)?.label ?? v ?? "—";
}
export function ticketStatusLabel(v?: string | null) {
  return TICKET_STATUS.find((k) => k.value === v)?.label ?? v ?? "—";
}
export function ticketPriorityLabel(v?: string | null) {
  return TICKET_PRIORITIES.find((k) => k.value === v)?.label ?? v ?? "—";
}

const ticketSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(3, "Informe o título").max(160),
  description: z.string().trim().max(4000).default(""),
  kind: z.enum(["melhoria", "bug"]).default("melhoria"),
  priority: z.enum(["baixa", "media", "alta"]).default("media"),
});

export const listMyTickets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb: any = context.supabase;
    const { data, error } = await sb
      .from("tickets")
      .select("*")
      .eq("created_by", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const saveTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ticketSchema.parse(d))
  .handler(async ({ data, context }) => {
    const sb: any = context.supabase;
    const { id, ...rest } = data;
    if (id) {
      const { error } = await sb.from("tickets").update(rest).eq("id", id);
      if (error) throw new Error(error.message);
      return { id };
    }
    const { data: row, error } = await sb
      .from("tickets")
      .insert({ ...rest, created_by: context.userId })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id as string };
  });

export const deleteTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await (context.supabase as any).from("tickets").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListTickets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb: any = context.supabase;
    const [{ data: tickets, error }, { data: profiles }] = await Promise.all([
      sb.from("tickets").select("*").order("created_at", { ascending: false }),
      sb.from("profiles").select("user_id, full_name, email"),
    ]);
    if (error) throw new Error(error.message);
    const byUser = new Map((profiles ?? []).map((p: any) => [p.user_id, p]));
    return (tickets ?? []).map((t: any) => ({
      ...t,
      author_name:
        (byUser.get(t.created_by) as any)?.full_name ||
        (byUser.get(t.created_by) as any)?.email ||
        "—",
    }));
  });

export const adminUpdateTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["aberto", "em_analise", "resolvido", "recusado"]).optional(),
        response: z.string().trim().max(4000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb: any = context.supabase;
    const { id, ...rest } = data;
    const payload: any = { ...rest };
    if (rest.status === "resolvido") payload.resolved_at = new Date().toISOString();
    const { error } = await sb.from("tickets").update(payload).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
