import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { ArrowRight, FileText, Trophy, BarChart3 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/projetos/$id/encerramento")({
  component: () => {
    const items = [
      { label: "Diagnóstico executivo", description: "Consolidação final de dores, causas e ganhos", to: "/diagnostico", icon: FileText },
      { label: "Roadmap concluído", description: "Marcos entregues e pendentes", to: "/roadmap", icon: Trophy },
      { label: "Indicadores finais", description: "Resultado × meta ao fim do projeto", to: "/indicadores", icon: BarChart3 },
    ];
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((i) => (
          <Link key={i.label} to={i.to}>
            <Card className="flex items-start gap-3 p-4 transition-colors hover:bg-secondary/50">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <i.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{i.label}</p>
                <p className="text-sm text-muted-foreground">{i.description}</p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Card>
          </Link>
        ))}
      </div>
    );
  },
});
