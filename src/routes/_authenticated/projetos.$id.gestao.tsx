import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { ArrowRight, BarChart3, FileText, Clock, CheckCircle2, ListTodo } from "lucide-react";

export const Route = createFileRoute("/_authenticated/projetos/$id/gestao")({
  component: () => {
    const { id } = Route.useParams();
    const items = [
      { label: "Dashboard", description: "Visão executiva consolidada", to: "/dashboard" as const, icon: BarChart3, params: undefined },
      { label: "Diagnóstico executivo", description: "Relatório final gerado pela IA", to: "/diagnostico" as const, icon: FileText, params: undefined },
      { label: "Roadmap", description: "Iniciativas por horizonte", to: "/roadmap" as const, icon: ListTodo, params: undefined },
      { label: "Horas trabalhadas", description: "Em breve", to: "/projetos/$id/gestao" as const, icon: Clock, params: { id } },
      { label: "Encerramento do projeto", description: "Em breve", to: "/projetos/$id/gestao" as const, icon: CheckCircle2, params: { id } },
    ];
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((i) => (
          <Link key={i.label} to={i.to} params={i.params as any}>
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
