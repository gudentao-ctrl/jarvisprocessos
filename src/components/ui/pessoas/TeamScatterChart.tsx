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

interface Candidate {
  id: string;
  full_name: string;
  cpf: string;
  birth_date?: string;
  status: string;
  company_id?: string;
  current_role?: string;
  profile_data?: any;
}

interface TeamScatterChartProps {
  candidates: Candidate[];
}

export function TeamScatterChart({ candidates }: TeamScatterChartProps) {
  // Extract or compute coordinates for each candidate
  const chartData = (candidates ?? []).map((c, idx) => {
    let x = 50;
    let y = 50;
    const radar = c.profile_data?.radar as Array<{ name: string; value: number }> | undefined;

    if (Array.isArray(radar) && radar.length > 0) {
      const relItem = radar.find((r) =>
        /comunicação|influência|relacionamento|pessoas/i.test(r.name),
      );
      const execItem = radar.find((r) => /execução|dominância|resultado|foco/i.test(r.name));
      if (relItem) x = relItem.value;
      if (execItem) y = execItem.value;
    } else {
      // Deterministic spread for visualization if profile_data is not completed yet
      const hash = c.id.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0) + idx * 17;
      x = 30 + (hash % 55);
      y = 25 + ((hash * 3) % 60);
    }

    return {
      id: c.id,
      name: c.full_name,
      role: c.current_role || "Colaborador",
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
        <div className="bg-popover text-popover-foreground p-3 rounded-md shadow-md border text-xs space-y-1">
          <p className="font-semibold text-sm">{data.name}</p>
          <p className="text-muted-foreground">{data.role}</p>
          <div className="flex items-center gap-2 pt-1 border-t border-border/50">
            <span>
              Relacionamento (X): <strong>{data.x}%</strong>
            </span>
            <span>·</span>
            <span>
              Execução (Y): <strong>{data.y}%</strong>
            </span>
          </div>
          <p className="capitalize text-[10px] text-muted-foreground">
            Status: <span className="font-medium">{data.status}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  if (!candidates || candidates.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Mapeamento da Equipe</CardTitle>
          <CardDescription>
            Nenhum colaborador avaliado para compor o mapa de dispersão comportamental.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base font-semibold">
              Dispersão Comportamental da Equipe
            </CardTitle>
            <CardDescription className="text-xs">
              Mapeamento de perfil: Eixo X (Relacionamento/Comunicação) vs Eixo Y
              (Execução/Resultados)
            </CardDescription>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
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
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
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
              <ZAxis type="number" dataKey="z" range={[80, 80]} />
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
      </CardContent>
    </Card>
  );
}

export default TeamScatterChart;
