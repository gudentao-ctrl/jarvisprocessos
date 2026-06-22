import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { ArrowRight, ClipboardList, BarChart3, Inbox } from "lucide-react";

export const Route = createFileRoute("/_authenticated/projetos/$id/execucao")({
  component: () => {
    const items = [
      { label: "Planos de ação", description: "Ações em andamento e atrasadas", to: "/planos-acao", icon: ClipboardList },
      { label: "Indicadores", description: "Indicadores e metas", to: "/indicadores", icon: BarChart3 },
      { label: "Coletas", description: "Pendências e envios recentes", to: "/indicadores", icon: Inbox },
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
