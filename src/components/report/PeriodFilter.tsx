import { useState } from "react";
import { format, subDays, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PeriodPreset, ReportPeriod } from "@/lib/report-types";

const PRESETS: { key: PeriodPreset; label: string }[] = [
  { key: "today", label: "Hoje" },
  { key: "last7", label: "7 dias" },
  { key: "last15", label: "15 dias" },
  { key: "last30", label: "30 dias" },
  { key: "this_month", label: "Este mês" },
  { key: "last_month", label: "Mês anterior" },
  { key: "quarter", label: "Trimestre" },
  { key: "custom", label: "Personalizado" },
];

export function computePeriod(preset: PeriodPreset, from?: string, to?: string): ReportPeriod {
  const iso = (d: Date) => format(d, "yyyy-MM-dd");
  const now = new Date();
  switch (preset) {
    case "today":      return { preset, from: iso(now), to: iso(now) };
    case "last7":      return { preset, from: iso(subDays(now, 6)), to: iso(now) };
    case "last15":     return { preset, from: iso(subDays(now, 14)), to: iso(now) };
    case "last30":     return { preset, from: iso(subDays(now, 29)), to: iso(now) };
    case "this_month": return { preset, from: iso(startOfMonth(now)), to: iso(endOfMonth(now)) };
    case "last_month": {
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 15);
      return { preset, from: iso(startOfMonth(prev)), to: iso(endOfMonth(prev)) };
    }
    case "quarter":    return { preset, from: iso(startOfQuarter(now)), to: iso(endOfQuarter(now)) };
    case "custom":     return { preset, from: from ?? iso(subDays(now, 29)), to: to ?? iso(now) };
  }
}

export function PeriodFilter({
  value, onChange,
}: {
  value: ReportPeriod;
  onChange: (p: ReportPeriod) => void;
}) {
  const [from, setFrom] = useState(value.from);
  const [to, setTo] = useState(value.to);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <Button
            key={p.key}
            size="sm"
            variant={value.preset === p.key ? "default" : "outline"}
            onClick={() => onChange(computePeriod(p.key, from, to))}
          >
            {p.label}
          </Button>
        ))}
      </div>
      {value.preset === "custom" && (
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <Label>De</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <Label>Até</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <Button size="sm" onClick={() => onChange({ preset: "custom", from, to })}>Aplicar</Button>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Período: <strong>{value.from}</strong> até <strong>{value.to}</strong>
      </p>
    </div>
  );
}
