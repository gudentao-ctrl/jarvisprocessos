import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

/* Auto-correção determinística do Fluxo.
 * Aplica correções seguras e reversíveis (não usa IA):
 *  - remove conexões duplicadas
 *  - cria evento "end" se ausente
 *  - rotula saídas de decisão sem label ("Sim"/"Não"/…)
 *  - conecta atividades órfãs (sem saída) à próxima por ordering
 * Retorna resumo do que foi feito. */

const DEFAULT_LABELS = ["Sim", "Não", "Retrabalho", "Outro"];

export const autofixFlow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ process_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const pid = data.process_id;

    const [{ data: acts }, { data: conns }, { data: decs }] = await Promise.all([
      sb.from("process_activities").select("*").eq("process_id", pid).order("ordering"),
      sb.from("activity_connections").select("*").eq("process_id", pid).order("order_index"),
      sb.from("process_decisions").select("*"),
    ]);
    const activities = acts ?? [];
    const connections = conns ?? [];
    const decisions = decs ?? [];

    const summary = {
      duplicatesRemoved: 0,
      endCreated: 0,
      decisionLabelsSet: 0,
      orphansConnected: 0,
    };

    // 1) Remove duplicadas (mesma origem/destino/tipo)
    const seen = new Map<string, string>();
    for (const c of connections) {
      const k = `${c.from_activity_id}->${c.to_activity_id}:${c.type}`;
      if (seen.has(k)) {
        await sb.from("activity_connections").delete().eq("id", c.id);
        summary.duplicatesRemoved++;
      } else {
        seen.set(k, c.id);
      }
    }

    // 2) Cria "end" se ausente
    let endId: string | null = activities.find((a: any) => a.type === "end")?.id ?? null;
    if (!endId) {
      const maxOrd = activities.reduce((m: number, a: any) => Math.max(m, a.ordering ?? 0), -1);
      const { data: row } = await sb.from("process_activities").insert({
        process_id: pid, type: "end", title: "Fim", ordering: maxOrd + 1,
      }).select("id").single();
      endId = row?.id ?? null;
      if (endId) summary.endCreated++;
    }

    // 3) Rotula saídas de decisão sem label
    const decisionIds = new Set(activities.filter((a: any) => a.type === "decision").map((a: any) => a.id));
    const outsByFrom = new Map<string, any[]>();
    // Recarrega conexões após remoção
    const { data: conns2 } = await sb.from("activity_connections").select("*").eq("process_id", pid).order("order_index");
    for (const c of conns2 ?? []) {
      if (!outsByFrom.has(c.from_activity_id)) outsByFrom.set(c.from_activity_id, []);
      outsByFrom.get(c.from_activity_id)!.push(c);
    }
    for (const decId of decisionIds) {
      const outs = outsByFrom.get(decId) ?? [];
      const used = new Set(outs.map((o) => (o.label ?? "").trim().toLowerCase()).filter(Boolean));
      let labelIdx = 0;
      for (const o of outs) {
        if (!o.label || !o.label.trim()) {
          let label = DEFAULT_LABELS[labelIdx++] ?? `Opção ${labelIdx}`;
          while (used.has(label.toLowerCase())) label = `${label} ${labelIdx++}`;
          used.add(label.toLowerCase());
          await sb.from("activity_connections").update({ label, type: "decision" }).eq("id", o.id);
          summary.decisionLabelsSet++;
        }
      }
    }

    // 4) Conecta órfãos (sem saída, não é "end") à próxima por ordering
    const withOuts = new Set((conns2 ?? []).map((c) => c.from_activity_id));
    const sorted = [...activities].sort((a: any, b: any) => a.ordering - b.ordering);
    for (let i = 0; i < sorted.length; i++) {
      const a: any = sorted[i];
      if (a.type === "end") continue;
      if (withOuts.has(a.id)) continue;
      // Próxima atividade por ordering; se última, conecta ao end
      const next = sorted.slice(i + 1).find((x: any) => x.id !== a.id) ?? (endId ? { id: endId } : null);
      if (!next) continue;
      await sb.from("activity_connections").insert({
        process_id: pid,
        from_activity_id: a.id,
        to_activity_id: (next as any).id,
        type: "sequential",
        label: "",
      });
      summary.orphansConnected++;
    }

    return summary;
  });
