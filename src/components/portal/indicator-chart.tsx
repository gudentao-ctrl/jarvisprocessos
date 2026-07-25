import { useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  Bar,
  BarChart,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  ReferenceArea,
  Legend,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
  Cell,
} from "recharts";

/* ============================================================
 * Escolha automática do tipo de gráfico + escala legível
 * ============================================================ */

export type ChartKind = "gauge" | "bar" | "area" | "line";

export function isPercentUnit(unit?: string | null) {
  if (!unit) return false;
  const u = unit.trim().toLowerCase();
  return u === "%" || u.startsWith("percent") || u === "pct";
}

/**
 * Regras:
 * - 1 coleta + meta definida  → medidor (gauge) de atingimento
 * - 2 a 4 coletas             → barras (comparação de poucos pontos)
 * - 5+ coletas, unidade %     → área (evolução de proporção)
 * - 5+ coletas, demais casos  → linha (série temporal)
 */
export function pickChartKind(indicator: any, points: number): ChartKind {
  if (points <= 1) return indicator?.target != null ? "gauge" : "bar";
  if (points <= 4) return "bar";
  return isPercentUnit(indicator?.unit) ? "area" : "line";
}

export function formatValue(v: number | null | undefined, unit?: string | null) {
  if (v == null || Number.isNaN(Number(v))) return "—";
  const n = Number(v);
  const abs = Math.abs(n);
  const digits = abs >= 100 ? 0 : abs >= 10 ? 1 : 2;
  const s = n.toLocaleString("pt-BR", { maximumFractionDigits: digits });
  if (!unit) return s;
  return isPercentUnit(unit) ? `${s}%` : `${s} ${unit}`;
}

function compact(n: number) {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}M`;
  if (abs >= 1_000) return `${(n / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}k`;
  return n.toLocaleString("pt-BR", { maximumFractionDigits: abs < 10 ? 1 : 0 });
}

/** Arredonda o topo/base para um valor "redondo" e devolve ticks uniformes. */
export function buildScale(values: number[], opts: { target?: number | null; percent?: boolean }) {
  const all = [...values.filter((v) => Number.isFinite(v))];
  if (opts.target != null && Number.isFinite(Number(opts.target))) all.push(Number(opts.target));
  if (!all.length) return { domain: [0, 1] as [number, number], ticks: [0, 1] };

  let min = Math.min(...all);
  let max = Math.max(...all);

  if (opts.percent) {
    min = Math.min(0, min);
    max = Math.max(100, max);
  } else {
    if (min > 0) min = 0; // ancorar em zero quando tudo é positivo
    const span = max - min || Math.abs(max) || 1;
    max = max + span * 0.12;
    if (min < 0) min = min - span * 0.12;
  }

  const rawStep = (max - min) / 4 || 1;
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= rawStep) ?? rawStep;
  const niceMin = Math.floor(min / step) * step;
  const niceMax = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = niceMin; v <= niceMax + step / 1000; v += step) {
    ticks.push(Number(v.toFixed(6)));
  }
  return { domain: [niceMin, niceMax] as [number, number], ticks };
}

const OK = "hsl(142 76% 36%)";
const BLUE = "hsl(217 91% 60%)";
const WARN = "hsl(38 92% 50%)";
const BAD = "hsl(0 84% 60%)";

function pointLabel(c: any) {
  if (c?.reference_period) return String(c.reference_period);
  return new Date(c.submitted_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export type Point = { label: string; value: number; evaluation?: string | null };

export function toPoints(collections: any[]): Point[] {
  return (collections ?? []).map((c) => ({
    label: pointLabel(c),
    value: Number(c.value),
    evaluation: c.evaluation,
  }));
}

function colorFor(evaluation?: string | null) {
  if (evaluation === "critico") return BAD;
  if (evaluation === "abaixo_meta") return WARN;
  return BLUE;
}

/* ------------------------------------------------------------------
 * Sparkline do card — escala mínima (min/max) e tipo adequado
 * ------------------------------------------------------------------ */
export function IndicatorSpark({
  indicator,
  collections,
  height = 56,
}: {
  indicator: any;
  collections: any[];
  height?: number;
}) {
  const points = useMemo(() => toPoints(collections).slice(-12), [collections]);
  const kind = pickChartKind(indicator, points.length);
  const percent = isPercentUnit(indicator?.unit);
  const target = indicator?.target != null ? Number(indicator.target) : null;
  const scale = useMemo(
    () => buildScale(points.map((p) => p.value), { target, percent }),
    [points, target, percent],
  );

  if (!points.length) {
    return (
      <div className="grid h-full place-items-center text-[10px] text-muted-foreground">
        Sem coletas no período
      </div>
    );
  }

  if (kind === "gauge") {
    const last = points[points.length - 1].value;
    const pct = target ? Math.max(0, Math.min(150, (last / target) * 100)) : 0;
    const fill = pct >= 100 ? OK : pct >= 80 ? WARN : BAD;
    return (
      <div style={{ height }} className="relative">
        <ResponsiveContainer>
          <RadialBarChart
            innerRadius="72%"
            outerRadius="100%"
            data={[{ name: "v", value: pct, fill }]}
            startAngle={180}
            endAngle={0}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
            <RadialBar dataKey="value" cornerRadius={6} background />
          </RadialBarChart>
        </ResponsiveContainer>
        <span className="absolute inset-x-0 bottom-0 text-center text-[10px] font-semibold tabular-nums">
          {Math.round(pct)}% da meta
        </span>
      </div>
    );
  }

  const common = (
    <>
      <YAxis
        hide
        domain={scale.domain}
        ticks={scale.ticks}
      />
      <Tooltip
        formatter={(v: any) => formatValue(Number(v), indicator?.unit)}
        labelFormatter={(l: any) => String(l)}
        contentStyle={{ fontSize: 11, borderRadius: 8 }}
      />
      {target != null && <ReferenceLine y={target} stroke={OK} strokeDasharray="3 3" />}
    </>
  );

  return (
    <div style={{ height }} className="flex items-stretch gap-1">
      <div className="flex w-8 shrink-0 flex-col justify-between py-[2px] text-[9px] leading-none text-muted-foreground tabular-nums">
        <span>{compact(scale.domain[1])}</span>
        <span>{compact(scale.domain[0])}</span>
      </div>
      <div className="min-w-0 flex-1">
        <ResponsiveContainer>
          {kind === "bar" ? (
            <BarChart data={points} margin={{ top: 4, right: 2, bottom: 0, left: 0 }}>
              <XAxis dataKey="label" hide />
              {common}
              <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                {points.map((p, i) => (
                  <Cell key={i} fill={colorFor(p.evaluation)} />
                ))}
              </Bar>
            </BarChart>
          ) : (
            <ComposedChart data={points} margin={{ top: 4, right: 2, bottom: 0, left: 0 }}>
              <XAxis dataKey="label" hide />
              {common}
              {kind === "area" ? (
                <Area dataKey="value" stroke={BLUE} fill={BLUE} fillOpacity={0.18} strokeWidth={2} type="monotone" />
              ) : (
                <Line dataKey="value" stroke={BLUE} strokeWidth={2} dot={false} type="monotone" />
              )}
            </ComposedChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
 * Gráfico detalhado (dialog) — eixos rotulados, meta e faixas críticas
 * ------------------------------------------------------------------ */
export function IndicatorDetailChart({
  indicator,
  collections,
}: {
  indicator: any;
  collections: any[];
}) {
  const points = useMemo(() => toPoints(collections), [collections]);
  const kind = pickChartKind(indicator, points.length);
  const percent = isPercentUnit(indicator?.unit);
  const target = indicator?.target != null ? Number(indicator.target) : null;
  const scale = useMemo(
    () => buildScale(points.map((p) => p.value), { target, percent }),
    [points, target, percent],
  );

  if (!points.length) {
    return (
      <div className="grid h-full place-items-center text-sm text-muted-foreground">
        Sem coletas no período
      </div>
    );
  }

  if (kind === "gauge") {
    const last = points[points.length - 1].value;
    const pct = target ? Math.max(0, Math.min(150, (last / target) * 100)) : 0;
    const fill = pct >= 100 ? OK : pct >= 80 ? WARN : BAD;
    return (
      <div className="relative h-full">
        <ResponsiveContainer>
          <RadialBarChart
            innerRadius="65%"
            outerRadius="95%"
            data={[{ name: indicator.name, value: pct, fill }]}
            startAngle={210}
            endAngle={-30}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
            <RadialBar dataKey="value" cornerRadius={12} background />
          </RadialBarChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="text-center">
            <p className="text-3xl font-bold tabular-nums">{formatValue(last, indicator.unit)}</p>
            <p className="text-xs text-muted-foreground">
              {Math.round(pct)}% da meta ({formatValue(target, indicator.unit)})
            </p>
          </div>
        </div>
      </div>
    );
  }

  const axes = (
    <>
      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
      <XAxis
        dataKey="label"
        fontSize={11}
        tickMargin={8}
        interval="preserveStartEnd"
        minTickGap={12}
      />
      <YAxis
        fontSize={11}
        width={60}
        domain={scale.domain}
        ticks={scale.ticks}
        tickFormatter={(v: any) => compact(Number(v))}
        label={{
          value: indicator.unit ? (isPercentUnit(indicator.unit) ? "%" : indicator.unit) : "valor",
          angle: -90,
          position: "insideLeft",
          style: { fontSize: 11, textAnchor: "middle" },
        }}
      />
      <Tooltip
        formatter={(v: any) => [formatValue(Number(v), indicator.unit), indicator.name]}
        contentStyle={{ fontSize: 12, borderRadius: 8 }}
      />
      <Legend verticalAlign="top" height={28} wrapperStyle={{ fontSize: 12 }} />
      {indicator.critical_min != null && (
        <ReferenceArea
          y1={scale.domain[0]}
          y2={Number(indicator.critical_min)}
          fill={BAD}
          fillOpacity={0.06}
        />
      )}
      {indicator.critical_max != null && (
        <ReferenceArea
          y1={Number(indicator.critical_max)}
          y2={scale.domain[1]}
          fill={BAD}
          fillOpacity={0.06}
        />
      )}
      {target != null && (
        <ReferenceLine
          y={target}
          stroke={OK}
          strokeDasharray="5 4"
          label={{ value: `Meta ${compact(target)}`, position: "right", style: { fontSize: 11, fill: OK } }}
        />
      )}
    </>
  );

  if (kind === "bar") {
    return (
      <ResponsiveContainer>
        <BarChart data={points} margin={{ top: 8, right: 24, bottom: 4, left: 0 }}>
          {axes}
          <Bar dataKey="value" name={indicator.name} radius={[4, 4, 0, 0]} maxBarSize={72}>
            {points.map((p, i) => (
              <Cell key={i} fill={colorFor(p.evaluation)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer>
      <ComposedChart data={points} margin={{ top: 8, right: 24, bottom: 4, left: 0 }}>
        {axes}
        {kind === "area" ? (
          <Area
            dataKey="value"
            name={indicator.name}
            type="monotone"
            stroke={BLUE}
            strokeWidth={2}
            fill={BLUE}
            fillOpacity={0.18}
            dot={{ r: 3 }}
          />
        ) : (
          <Line
            dataKey="value"
            name={indicator.name}
            type="monotone"
            stroke={BLUE}
            strokeWidth={2.5}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function chartKindLabel(kind: ChartKind) {
  return kind === "gauge" ? "Medidor" : kind === "bar" ? "Barras" : kind === "area" ? "Área" : "Linha";
}
