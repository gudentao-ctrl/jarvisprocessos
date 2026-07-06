import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const Input = z.object({
  company_id: z.string().uuid(),
  from: z.string(),
  to: z.string(),
});

export type ReportData = Awaited<ReturnType<typeof fetchReport>>;

async function fetchReport(sb: any, company_id: string, from: string, to: string) {
  // Extend "to" to end of day
  const toEnd = `${to}T23:59:59.999Z`;
  const fromStart = `${from}T00:00:00.000Z`;

  const [
    company, interviews, processes, cronoSessions, cronoObs, indicators, collections,
    plans, planHistory, calendar, hours, opportunities,
  ] = await Promise.all([
    sb.from("companies").select("id,name").eq("id", company_id).maybeSingle(),
    sb.from("interviews").select("id,title,interview_date,participant,status,generation_status,created_at")
      .eq("company_id", company_id).gte("interview_date", from).lte("interview_date", to),
    sb.from("processes").select("id,name,status,objective,created_at,updated_at")
      .eq("company_id", company_id),
    sb.from("cronoanalysis_sessions").select("id,process_id,observation_date,product,machine,notes")
      .eq("company_id", company_id).gte("observation_date", from).lte("observation_date", to),
    sb.from("cronoanalysis_observations").select("session_id,activity,classification,time_minutes"),
    sb.from("indicators").select("id,code,name,unit,target,frequency,direction,critical_min,critical_max")
      .eq("company_id", company_id),
    sb.from("indicator_collections").select("indicator_id,value,reference_period,submitted_at,evaluation")
      .gte("submitted_at", fromStart).lte("submitted_at", toEnd),
    sb.from("action_plans").select("id,title,status,priority,responsible,due_date,created_at,updated_at,process_id,category,gut_score")
      .eq("company_id", company_id),
    sb.from("action_plan_history").select("plan_id,field,new_value,changed_at")
      .gte("changed_at", fromStart).lte("changed_at", toEnd),
    sb.from("calendar_events").select("id,title,event_type,starts_at,ends_at,participants,duration_min")
      .eq("company_id", company_id).gte("starts_at", fromStart).lte("starts_at", toEnd),
    sb.from("work_hours").select("id,work_date,hours,activity_type,responsible,notes")
      .eq("company_id", company_id).gte("work_date", from).lte("work_date", to),
    sb.from("improvement_opportunities").select("id,title,category,status,expected_impact,created_at")
      .eq("company_id", company_id),
  ]);

  // Filter collections by company (via indicator list)
  const indIds = new Set((indicators.data ?? []).map((i: any) => i.id));
  const scopedCollections = (collections.data ?? []).filter((c: any) => indIds.has(c.indicator_id));

  const planIds = new Set((plans.data ?? []).map((p: any) => p.id));
  const scopedHistory = (planHistory.data ?? []).filter((h: any) => planIds.has(h.plan_id));

  const sessIds = new Set((cronoSessions.data ?? []).map((s: any) => s.id));
  const scopedObs = (cronoObs.data ?? []).filter((o: any) => sessIds.has(o.session_id));

  return {
    company: company.data,
    period: { from, to },
    interviews: interviews.data ?? [],
    processes: processes.data ?? [],
    cronoSessions: cronoSessions.data ?? [],
    cronoObservations: scopedObs,
    indicators: indicators.data ?? [],
    collections: scopedCollections,
    plans: plans.data ?? [],
    planHistory: scopedHistory,
    calendar: calendar.data ?? [],
    hours: hours.data ?? [],
    opportunities: opportunities.data ?? [],
  };
}

export const getReportData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data, context }) => {
    return fetchReport(context.supabase, data.company_id, data.from, data.to);
  });
