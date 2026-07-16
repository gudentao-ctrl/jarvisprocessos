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
      redundantGatewaysRemoved: 0,
      duplicateEventsRemoved: 0,
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

    // 5) Remove gateways redundantes (decision com 1-in/1-out): reconecta a origem direto ao destino.
    const { data: conns3 } = await sb.from("activity_connections").select("*").eq("process_id", pid);
    const insBy = new Map<string, any[]>();
    const outsBy = new Map<string, any[]>();
    for (const c of conns3 ?? []) {
      if (!insBy.has(c.to_activity_id)) insBy.set(c.to_activity_id, []);
      insBy.get(c.to_activity_id)!.push(c);
      if (!outsBy.has(c.from_activity_id)) outsBy.set(c.from_activity_id, []);
      outsBy.get(c.from_activity_id)!.push(c);
    }
    for (const a of activities) {
      if (a.type !== "decision") continue;
      const ins = insBy.get(a.id) ?? [];
      const outs = outsBy.get(a.id) ?? [];
      if (ins.length === 1 && outs.length === 1) {
        // Reconecta ins[0].from → outs[0].to
        await sb.from("activity_connections").update({
          to_activity_id: outs[0].to_activity_id,
        }).eq("id", ins[0].id);
        await sb.from("activity_connections").delete().eq("id", outs[0].id);
        await sb.from("process_decisions").delete().eq("activity_id", a.id);
        await sb.from("process_activities").delete().eq("id", a.id);
        summary.redundantGatewaysRemoved++;
      }
    }

    // 6) Remove eventos start/end duplicados: mantém o de menor ordering.
    for (const type of ["start", "end"] as const) {
      const evs = activities.filter((x: any) => x.type === type)
        .sort((a: any, b: any) => (a.ordering ?? 0) - (b.ordering ?? 0));
      if (evs.length <= 1) continue;
      const keep = evs[0].id;
      for (const dup of evs.slice(1)) {
        // Redireciona entradas do duplicado para o mantido
        await sb.from("activity_connections").update({ to_activity_id: keep }).eq("to_activity_id", dup.id);
        await sb.from("activity_connections").update({ from_activity_id: keep }).eq("from_activity_id", dup.id);
        await sb.from("process_activities").delete().eq("id", dup.id);
        summary.duplicateEventsRemoved++;
      }
    }

    return summary;
  });
