import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";

interface AssessmentRadarProps {
  data: { name: string; value: number }[]; // e.g. [{name: "Comunicação", value: 78}, ...]
}

export function AssessmentRadar({ data }: AssessmentRadarProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
        <PolarGrid />
        <PolarAngleAxis dataKey="name" />
        <PolarRadiusAxis domain={[0, 100]} />
        <Radar name="Perfil" dataKey="value" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

export default AssessmentRadar;
