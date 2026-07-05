import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import {
  ArrowRight, Mic, FileText, Sparkles, Map, GitBranch, Workflow, Timer,
  Lightbulb, Target, GitCompare, ClipboardList, BarChart3, Inbox,
  Clock, ListTodo, Trophy, FileBarChart2,
} from "lucide-react";
import { PHASES, PHASE_TOOLS, type PhaseSlug } from "@/lib/phases";
import { PhaseMenu } from "@/components/PhaseMenu";

const ICONS: Record<string, any> = {
  Mic, FileText, Sparkles, Map, GitBranch, Workflow, Timer,
  Lightbulb, Target, GitCompare, ClipboardList, BarChart3, Inbox,
  Clock, ListTodo, Trophy, FileBarChart2,
};

export const Route = createFileRoute("/_authenticated/fase/$slug")({
  component: FasePage,
});

function FasePage() {
  const { slug } = Route.useParams();
  const phase = PHASES.find((p) => p.slug === slug);
  if (!phase || slug === "controle") throw notFound();
  const items = PHASE_TOOLS[slug as PhaseSlug] ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Fase</p>
          <h1 className="truncate text-2xl font-bold">{phase.label}</h1>
          {phase.description && (
            <p className="mt-1 text-sm text-muted-foreground">{phase.description}</p>
          )}
        </div>
        <PhaseMenu current={slug as PhaseSlug} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((i) => {
          const Icon = ICONS[i.icon] ?? ArrowRight;
          return (
            <Link key={i.label} to={i.to as any}>
              <Card className="flex items-start gap-3 p-4 transition-colors hover:bg-secondary/50 active:bg-secondary">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{i.label}</p>
                  <p className="text-sm text-muted-foreground">{i.description}</p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
