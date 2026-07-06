import { format, parseISO, startOfWeek, startOfMonth } from "date-fns";
import type { ChartKey } from "@/lib/report-types";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid,
} from "recharts";

// Use loose typing here — ReportData is produced by Supabase queries and
// carries nested unknowns after the serverFn boundary.
export type ReportData = any;

const COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#7c3aed", "#0891b2", "#db2777", "#65a30d"];

const H = 240;

function Empty({ msg = "Sem dados no período" }: { msg?: string }) {
  return <div className="grid h-56 place-items-center text-sm text-muted-foreground">{msg}</div>;
}

function groupBy<T = any>(arr: T[], key: (t: T) => string): Record<string, T[]> {
  return (arr ?? []).reduce((acc: any, item: T) => {
    const k = key(item) || "—";
    (acc[k] ||= []).push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

// ---- Planos ----
function ActionsByStatus({ d }: { d: ReportData }) {
  const rows = Object.entries(groupBy(d.plans, (p) => p.status || "sem_status"))
    .map(([name, arr]) => ({ name, value: arr.length }));
  if (!rows.length) return <Empty />;
  return (
    <ResponsiveContainer width="100%" height={H}>
      <PieChart>
        <Pie data={rows} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
          {rows.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <Legend />
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}

function ActionsByPriority({ d }: { d: ReportData }) {
  const rows = Object.entries(groupBy(d.plans, (p) => p.priority || "sem_prioridade"))
    .map(([name, arr]) => ({ name, total: arr.length }));
  if (!rows.length) return <Empty />;
  return (
    <ResponsiveContainer width="100%" height={H}>
      <BarChart data={rows}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip />
        <Bar dataKey="total" fill="#2563eb" />
      </BarChart>
    </ResponsiveContainer>
  );
}

function ActionsByResponsible({ d }: { d: ReportData }) {
  const rows = Object.entries(groupBy(d.plans, (p) => p.responsible || "—"))
    .map(([name, arr]) => ({ name, total: arr.length })).slice(0, 12);
  if (!rows.length) return <Empty />;
  return (
    <ResponsiveContainer width="100%" height={H}>
      <BarChart data={rows} layout="vertical">
        <XAxis type="number" allowDecimals={false} /><YAxis type="category" dataKey="name" width={120} />
        <Tooltip /><Bar dataKey="total" fill="#16a34a" />
      </BarChart>
    </ResponsiveContainer>
  );
}

function ActionsByProcess({ d }: { d: ReportData }) {
  const procMap = new Map(d.processes.map((p) => [p.id, p.name]));
  const rows = Object.entries(groupBy(d.plans, (p) => procMap.get(p.process_id) || "Sem processo"))
    .map(([name, arr]) => ({ name, total: arr.length })).slice(0, 12);
  if (!rows.length) return <Empty />;
  return (
    <ResponsiveContainer width="100%" height={H}>
      <BarChart data={rows}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip />
        <Bar dataKey="total" fill="#7c3aed" />
      </BarChart>
    </ResponsiveContainer>
  );
}

function ActionsEvolution({ d }: { d: ReportData }) {
  // Cumulative created vs concluded per week using history + created_at
  const buckets = new Map<string, { criados: number; concluidos: number }>();
  for (const p of d.plans) {
    const wk = format(startOfWeek(parseISO(p.created_at)), "yyyy-MM-dd");
    const b = buckets.get(wk) ?? { criados: 0, concluidos: 0 };
    b.criados += 1;
    buckets.set(wk, b);
  }
  for (const h of d.planHistory) {
    if (h.field === "status" && h.new_value === "concluido") {
      const wk = format(startOfWeek(parseISO(h.changed_at)), "yyyy-MM-dd");
      const b = buckets.get(wk) ?? { criados: 0, concluidos: 0 };
      b.concluidos += 1;
      buckets.set(wk, b);
    }
  }
  const rows = [...buckets.entries()].sort().map(([wk, v]) => ({ semana: wk.slice(5), ...v }));
  if (!rows.length) return <Empty />;
  return (
    <ResponsiveContainer width="100%" height={H}>
      <LineChart data={rows}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="semana" /><YAxis allowDecimals={false} /><Tooltip /><Legend />
        <Line dataKey="criados" stroke="#2563eb" />
        <Line dataKey="concluidos" stroke="#16a34a" />
      </LineChart>
    </ResponsiveContainer>
  );
}

function ActionsCompletion({ d }: { d: ReportData }) {
  const total = d.plans.length;
  const done = d.plans.filter((p) => p.status === "concluido").length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className="grid h-56 place-items-center">
      <div className="text-center">
        <p className="text-5xl font-bold text-primary">{pct}%</p>
        <p className="mt-2 text-sm text-muted-foreground">{done} de {total} concluídos</p>
      </div>
    </div>
  );
}

// ---- Indicadores ----
function IndicatorsEvolution({ d }: { d: ReportData }) {
  const indMap = new Map(d.indicators.map((i) => [i.id, i.name]));
  const byInd = groupBy(d.collections, (c) => c.indicator_id);
  const series: any[] = [];
  const keys: string[] = [];
  for (const [id, coll] of Object.entries(byInd)) {
    const name = indMap.get(id) ?? id.slice(0, 6);
    keys.push(name);
    for (const c of coll) {
      const dt = format(parseISO(c.submitted_at), "dd/MM");
      let row = series.find((r) => r.data === dt);
      if (!row) { row = { data: dt }; series.push(row); }
      row[name] = c.value;
    }
  }
  if (!series.length) return <Empty />;
  return (
    <ResponsiveContainer width="100%" height={H}>
      <LineChart data={series}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="data" /><YAxis /><Tooltip /><Legend />
        {keys.slice(0, 6).map((k, i) => <Line key={k} dataKey={k} stroke={COLORS[i % COLORS.length]} />)}
      </LineChart>
    </ResponsiveContainer>
  );
}

function IndicatorsTargetVsActual({ d }: { d: ReportData }) {
  const rows = d.indicators.map((i) => {
    const coll = d.collections.filter((c) => c.indicator_id === i.id);
    const last = coll.sort((a, b) => a.submitted_at.localeCompare(b.submitted_at)).pop();
    return { name: i.code || i.name, meta: i.target ?? 0, realizado: last?.value ?? 0 };
  }).filter((r) => r.meta || r.realizado).slice(0, 12);
  if (!rows.length) return <Empty />;
  return (
    <ResponsiveContainer width="100%" height={H}>
      <BarChart data={rows}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" /><YAxis /><Tooltip /><Legend />
        <Bar dataKey="meta" fill="#94a3b8" />
        <Bar dataKey="realizado" fill="#2563eb" />
      </BarChart>
    </ResponsiveContainer>
  );
}

function IndicatorsBelowTarget({ d }: { d: ReportData }) {
  const rows: any[] = [];
  for (const i of d.indicators) {
    const coll = d.collections.filter((c) => c.indicator_id === i.id);
    const last = coll.sort((a, b) => a.submitted_at.localeCompare(b.submitted_at)).pop();
    if (!last || i.target == null) continue;
    const below = i.direction === "lower_better" ? last.value > i.target : last.value < i.target;
    if (below) rows.push({ name: i.code || i.name, gap: Math.abs(last.value - i.target) });
  }
  if (!rows.length) return <Empty msg="Nenhum indicador abaixo da meta" />;
  return (
    <ResponsiveContainer width="100%" height={H}>
      <BarChart data={rows} layout="vertical">
        <XAxis type="number" /><YAxis type="category" dataKey="name" width={120} />
        <Tooltip /><Bar dataKey="gap" fill="#dc2626" />
      </BarChart>
    </ResponsiveContainer>
  );
}

function IndicatorsNoCollection({ d }: { d: ReportData }) {
  const withData = new Set(d.collections.map((c) => c.indicator_id));
  const rows = d.indicators.filter((i) => !withData.has(i.id));
  if (!rows.length) return <Empty msg="Todos os indicadores têm coleta" />;
  return (
    <ul className="space-y-1 p-4 text-sm">
      {rows.map((i) => (
        <li key={i.id} className="flex justify-between border-b py-1">
          <span>{i.code} {i.name}</span>
          <span className="text-muted-foreground">{i.frequency ?? "—"}</span>
        </li>
      ))}
    </ul>
  );
}

// ---- Horas ----
function HoursByBucket({ d, unit }: { d: ReportData; unit: "week" | "month" }) {
  const buckets = new Map<string, number>();
  for (const h of d.hours) {
    const key = format(unit === "week" ? startOfWeek(parseISO(h.work_date)) : startOfMonth(parseISO(h.work_date)),
      unit === "week" ? "dd/MM" : "MM/yyyy");
    buckets.set(key, (buckets.get(key) ?? 0) + (h.hours ?? 0));
  }
  const rows = [...buckets.entries()].map(([bucket, horas]) => ({ bucket, horas }));
  if (!rows.length) return <Empty />;
  return (
    <ResponsiveContainer width="100%" height={H}>
      <BarChart data={rows}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="bucket" /><YAxis /><Tooltip />
        <Bar dataKey="horas" fill="#0891b2" />
      </BarChart>
    </ResponsiveContainer>
  );
}

function HoursByActivity({ d }: { d: ReportData }) {
  const rows = Object.entries(groupBy(d.hours, (h) => h.activity_type || "outros"))
    .map(([name, arr]) => ({ name, value: arr.reduce((s, x) => s + (x.hours ?? 0), 0) }));
  if (!rows.length) return <Empty />;
  return (
    <ResponsiveContainer width="100%" height={H}>
      <PieChart>
        <Pie data={rows} dataKey="value" nameKey="name" outerRadius={80} label>
          {rows.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie><Legend /><Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}

function HoursByProcess({ d }: { d: ReportData }) {
  const rows = Object.entries(groupBy(d.hours, (h) => h.responsible || "—"))
    .map(([name, arr]) => ({ name, horas: arr.reduce((s, x) => s + (x.hours ?? 0), 0) })).slice(0, 12);
  if (!rows.length) return <Empty />;
  return (
    <ResponsiveContainer width="100%" height={H}>
      <BarChart data={rows} layout="vertical">
        <XAxis type="number" /><YAxis type="category" dataKey="name" width={120} />
        <Tooltip /><Bar dataKey="horas" fill="#65a30d" />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ---- Cronoanálise ----
function CronoValueAdded({ d }: { d: ReportData }) {
  const acc = { va: 0, nva: 0, nnva: 0 };
  for (const o of d.cronoObservations) {
    if (o.classification === "va") acc.va += o.time_minutes;
    else if (o.classification === "nva") acc.nva += o.time_minutes;
    else acc.nnva += o.time_minutes;
  }
  const rows = [
    { name: "Agrega valor", value: acc.va },
    { name: "Não agrega mas necessário", value: acc.nnva },
    { name: "Não agrega valor", value: acc.nva },
  ].filter((r) => r.value > 0);
  if (!rows.length) return <Empty />;
  return (
    <ResponsiveContainer width="100%" height={H}>
      <PieChart>
        <Pie data={rows} dataKey="value" nameKey="name" outerRadius={80} label>
          <Cell fill="#16a34a" /><Cell fill="#f59e0b" /><Cell fill="#dc2626" />
        </Pie><Legend /><Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ---- Consultoria ----
function ConsultingActivity({ d }: { d: ReportData }) {
  const rows = [
    { name: "Entrevistas", total: d.interviews.length },
    { name: "Processos mapeados", total: d.processes.length },
    { name: "Cronoanálises", total: d.cronoSessions.length },
    { name: "Reuniões", total: d.calendar.length },
    { name: "Oportunidades", total: d.opportunities.length },
    { name: "Planos", total: d.plans.length },
  ];
  return (
    <ResponsiveContainer width="100%" height={H}>
      <BarChart data={rows}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip />
        <Bar dataKey="total" fill="#db2777" />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ---- Registry ----
export const CHART_CATALOG: { key: ChartKey; group: string; label: string }[] = [
  { key: "actions_evolution",       group: "Planos de Ação", label: "Evolução das ações" },
  { key: "actions_by_status",       group: "Planos de Ação", label: "Ações por status" },
  { key: "actions_by_priority",     group: "Planos de Ação", label: "Ações por prioridade" },
  { key: "actions_by_responsible",  group: "Planos de Ação", label: "Ações por responsável" },
  { key: "actions_by_process",      group: "Planos de Ação", label: "Ações por processo" },
  { key: "actions_completion",      group: "Planos de Ação", label: "Percentual concluído" },
  { key: "indicators_evolution",    group: "Indicadores",    label: "Evolução temporal" },
  { key: "indicators_target_vs_actual", group: "Indicadores", label: "Meta × Realizado" },
  { key: "indicators_below_target", group: "Indicadores",    label: "Indicadores abaixo da meta" },
  { key: "indicators_no_collection",group: "Indicadores",    label: "Indicadores sem coleta" },
  { key: "hours_by_week",           group: "Horas",          label: "Horas por semana" },
  { key: "hours_by_month",          group: "Horas",          label: "Horas por mês" },
  { key: "hours_by_activity",       group: "Horas",          label: "Horas por atividade" },
  { key: "hours_by_process",        group: "Horas",          label: "Horas por responsável" },
  { key: "crono_value_added",       group: "Cronoanálise",   label: "Tempo VA / NVA / NNVA" },
  { key: "consulting_activity",     group: "Consultoria",    label: "Atividade da consultoria" },
];

export function renderChart(key: ChartKey, d: ReportData) {
  switch (key) {
    case "actions_by_status":       return <ActionsByStatus d={d} />;
    case "actions_by_priority":     return <ActionsByPriority d={d} />;
    case "actions_by_responsible":  return <ActionsByResponsible d={d} />;
    case "actions_by_process":      return <ActionsByProcess d={d} />;
    case "actions_evolution":       return <ActionsEvolution d={d} />;
    case "actions_completion":      return <ActionsCompletion d={d} />;
    case "indicators_evolution":    return <IndicatorsEvolution d={d} />;
    case "indicators_target_vs_actual": return <IndicatorsTargetVsActual d={d} />;
    case "indicators_below_target": return <IndicatorsBelowTarget d={d} />;
    case "indicators_no_collection":return <IndicatorsNoCollection d={d} />;
    case "hours_by_week":           return <HoursByBucket d={d} unit="week" />;
    case "hours_by_month":          return <HoursByBucket d={d} unit="month" />;
    case "hours_by_activity":       return <HoursByActivity d={d} />;
    case "hours_by_process":        return <HoursByProcess d={d} />;
    case "crono_value_added":       return <CronoValueAdded d={d} />;
    case "consulting_activity":     return <ConsultingActivity d={d} />;
  }
}
