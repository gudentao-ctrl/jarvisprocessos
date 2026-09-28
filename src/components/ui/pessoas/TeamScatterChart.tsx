import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Candidate } from "@/lib/assessment-storage";
import { Building2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TeamScatterChartProps {
  candidates: Candidate[];
  vinculoLabel?: string;
}

export function TeamScatterChart({ candidates, vinculoLabel = "Todos os Vínculos" }: TeamScatterChartProps) {
  // Extract or compute coordinates for each candidate based on Big Five or radar values
  const chartData = (candidates ?? []).map((c, idx) => {
    let x = 50; // Relacionamento / Comunicação (Extroversão & Amabilidade)
    let y = 50; // Execução / Conscienciosidade / Foco em Resultados

    const radar = c.profile_data?.radar as Array<{ name: string; factor?: string; value: number }> | undefined;

    if (Array.isArray(radar) && radar.length > 0) {
      // Find Big Five factors or legacy names
      const extItem = radar.find((r) => r.factor === "E" || /extroversão/i.test(r.name));
      const amabItem = radar.find((r) => r.factor === "M" || /amabilidade|relacionamento|comunicação/i.test(r.name));
      const conscItem = radar.find((r) => r.factor === "C" || /conscienciosidade|planejamento|execução/i.test(r.name));
      const stabItem = radar.find((r) => r.factor === "N" || /estabilidade|análise/i.test(r.name));

      const relValues = [extItem?.value, amabItem?.value].filter((v): v is number => typeof v === "number");
      if (relValues.length > 0) {
        x = Math.round(relValues.reduce((a, b) => a + b, 0) / relValues.length);
      }

      const execValues = [conscItem?.value, stabItem?.value].filter((v): v is number => typeof v === "number");
      if (execValues.length > 0) {
        y = Math.round(execValues.reduce((a, b) => a + b, 0) / execValues.length);
      }
    } else {
      // Deterministic spread for visualization if answers not completed yet
      const hash = c.id.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0) + idx * 17;
      x = 35 + (hash % 45);
      y = 35 + ((hash * 3) % 45);
    }

    return {
      id: c.id,
      name: c.full_name,
      role: c.current_role || "Colaborador",
      vinculo: c.external ? "Externo" : c.company_name || "Vinculado",
      status: c.status,
      x,
      y,
      z: 1,
    };
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "concluido":
        return "#10b981"; // Emerald
      case "em_teste":
        return "#f59e0b"; // Amber
      case "aguardando":
        return "#3b82f6"; // Blue
      default:
        return "#6366f1"; // Indigo
    }
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-popover text-popover-foreground p-3 rounded-md shadow-md border text-xs space-y-1.5 min-w-[200px]">
          <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-1">
            <span className="font-semibold text-sm">{data.name}</span>
            <Badge variant="outline" className="text-[10px] py-0">
              {data.status}
            </Badge>
          </div>
          <p className="text-muted-foreground">{data.role}</p>
          <div className="flex items-center gap-1.5 text-[11px] text-primary font-medium">
            <Building2 className="h-3 w-3" />
            <span>Vínculo: {data.vinculo}</span>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[11px]">
            <span>
              Relacionamento (X): <strong>{data.x}%</strong>
            </span>
            <span>
              Execução (Y): <strong>{data.y}%</strong>
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="border shadow-xs">
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-semibold">
                Dispersão Comportamental da Equipe
              </CardTitle>
              <Badge variant="secondary" className="text-xs font-normal">
                {vinculoLabel}
              </Badge>
            </div>
            <CardDescription className="text-xs mt-0.5">
              Mapeamento de quadrantes: Eixo X (Relacionamento / Extroversão / Amabilidade) vs Eixo Y (Execução / Conscienciosidade / Foco em Metas)
            </CardDescription>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block" />
              Concluído
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500 inline-block" />
              Em teste
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-500 inline-block" />
              Aguardando
            </span>
            <span className="text-xs font-medium text-foreground ml-1">
              ({candidates.length} colaboradores no filtro)
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-2">
        {candidates.length === 0 ? (
          <div className="h-[220px] flex flex-col items-center justify-center text-center p-6 text-muted-foreground border border-dashed rounded-lg">
            <Users className="h-8 w-8 text-muted-foreground/50 mb-2" />
            <p className="font-medium text-sm">Nenhum colaborador encontrado para o vínculo selecionado</p>
            <p className="text-xs text-muted-foreground mt-1">
              Selecione outro vínculo ou crie um novo assessment para visualizar a dispersão neste grupo.
            </p>
          </div>
        ) : (
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis
                  type="number"
                  dataKey="x"
                  name="Relacionamento"
                  domain={[0, 100]}
                  unit="%"
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name="Execução"
                  domain={[0, 100]}
                  unit="%"
                  tick={{ fontSize: 11 }}
                />
                <ZAxis type="number" dataKey="z" range={[90, 90]} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine x={50} stroke="#94a3b8" strokeDasharray="2 2" />
                <ReferenceLine y={50} stroke="#94a3b8" strokeDasharray="2 2" />
                <Scatter name="Colaboradores" data={chartData}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={getStatusColor(entry.status)}
                      stroke="#ffffff"
                      strokeWidth={1.5}
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default TeamScatterChart;
