import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/* CRUD de document_templates (branding único para PDFs) */

export const getTemplateForCompany = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ company_id: z.string().uuid().nullable() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    if (data.company_id) {
      const { data: t } = await sb
        .from("document_templates")
        .select("*")
        .eq("company_id", data.company_id)
        .maybeSingle();
      if (t) return t;
    }
    // fallback: default
    const { data: def } = await sb
      .from("document_templates")
      .select("*")
      .eq("is_default", true)
      .maybeSingle();
    return def ?? null;
  });

export const saveTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid().optional(),
      company_id: z.string().uuid().nullable(),
      name: z.string().default("Template"),
      consultancy_logo_url: z.string().nullable().default(null),
      client_logo_url: z.string().nullable().default(null),
      header_html: z.string().default(""),
      footer_html: z.string().default(""),
      primary_color: z.string().default("#0f172a"),
      accent_color: z.string().default("#3b82f6"),
      font_family: z.string().default("Inter, system-ui, sans-serif"),
      code_prefix: z.string().default("DOC"),
      numbering_seed: z.number().int().default(1),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    if (data.id) {
      const { data: row, error } = await sb
        .from("document_templates")
        .update({
          company_id: data.company_id,
          name: data.name,
          consultancy_logo_url: data.consultancy_logo_url,
          client_logo_url: data.client_logo_url,
          header_html: data.header_html,
          footer_html: data.footer_html,
          primary_color: data.primary_color,
          accent_color: data.accent_color,
          font_family: data.font_family,
          code_prefix: data.code_prefix,
          numbering_seed: data.numbering_seed,
        })
        .eq("id", data.id)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return row;
    }
    const { id: _omit, ...insert } = data;
    void _omit;
    const { data: row, error } = await sb
      .from("document_templates")
      .insert(insert)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });
