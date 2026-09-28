import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface AssessmentRadarProps {
  data: {
    name: string;
    value: number;
    factor?: string;
    description?: string;
    classification?: string;
  }[];
}

export function AssessmentRadar({ data }: AssessmentRadarProps) {
  // Format short names for radar labels if needed
  const formattedData = (data ?? []).map((d) => {
    let shortName = d.name;
    if (d.name.includes("Abertura")) shortName = "Abertura";
    else if (d.name.includes("Conscienciosidade")) shortName = "Consciência";
    else if (d.name.includes("Extroversão")) shortName = "Extroversão";
    else if (d.name.includes("Amabilidade")) shortName = "Amabilidade";
    else if (d.name.includes("Estabilidade")) shortName = "Estabilidade";

    return {
      ...d,
      displayName: shortName,
      fullTitle: d.name,
    };
  });

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-popover text-popover-foreground p-3 rounded-lg shadow-md border text-xs space-y-1 max-w-[240px]">
          <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-1">
            <span className="font-semibold text-primary">{item.fullTitle}</span>
            <span className="font-bold text-sm">{item.value}%</span>
          </div>
          {item.description && (
            <p className="text-muted-foreground text-[11px] leading-relaxed pt-0.5">
              {item.description}
            </p>
          )}
          {item.classification && (
            <div className="pt-1 text-[10px] text-muted-foreground">
              Nível: <strong className="text-foreground">{item.classification}</strong>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-[320px] flex items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={formattedData}>
          <PolarGrid stroke="#cbd5e1" strokeDasharray="2 2" />
          <PolarAngleAxis
            dataKey="displayName"
            tick={{ fill: "#334155", fontSize: 11, fontWeight: 500 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            stroke="#94a3b8"
            tick={{ fontSize: 9 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Radar
            name="Perfil OCEAN"
            dataKey="value"
            stroke="#2563eb"
            fill="#3b82f6"
            fillOpacity={0.45}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default AssessmentRadar;
