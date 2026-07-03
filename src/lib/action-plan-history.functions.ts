import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const listActionPlanHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ plan_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("action_plan_history")
      .select("*")
      .eq("plan_id", data.plan_id)
      .order("changed_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const addActionPlanNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      plan_id: z.string().uuid(),
      comment: z.string().min(1),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("action_plan_history")
      .insert({
        plan_id: data.plan_id,
        user_id: context.userId,
        field: "comentario",
        old_value: null,
        new_value: null,
        comment: data.comment,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });
