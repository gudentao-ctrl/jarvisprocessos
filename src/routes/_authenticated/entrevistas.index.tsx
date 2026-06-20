import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listInterviews } from "@/lib/interviews.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Mic, Calendar, User, FileText, CheckCircle2, Clock } from "lucide-react";

export const Route = createFileRoute("/_authenticated/entrevistas/")({
  component: InterviewsList,
});

const statusLabels: Record<string, { label: string; color: string }> = {
  draft: { label: "Rascunho", color: "bg-muted text-muted-foreground" },
  transcribing: { label: "Transcrevendo", color: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200" },
  transcribed: { label: "Transcrito", color: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200" },
  analyzed: { label: "Analisado", color: "bg-primary/10 text-primary" },
};

function InterviewsList() {
  const list = useServerFn(listInterviews);
  const { data, isLoading } = useQuery({
    queryKey: ["interviews"],
    queryFn: () => list(),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Entrevistas</h1>
          <p className="text-sm text-muted-foreground">Capture, transcreva e analise</p>
        </div>
      </div>

      <Button asChild className="h-14 w-full text-base font-semibold shadow-sm">
        <Link to="/entrevistas/nova">
          <Plus className="mr-2 h-5 w-5" /> Nova Entrevista
        </Link>
      </Button>

      {isLoading && <p className="py-8 text-center text-sm text-muted-foreground">Carregando...</p>}

      {!isLoading && data?.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-16 text-center">
          <Mic className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 font-semibold">Nenhuma entrevista ainda</h3>
          <p className="mt-1 text-sm text-muted-foreground">Crie a primeira para começar</p>
        </div>
      )}

      <div className="space-y-2">
        {data?.map((it: any) => {
          const status = statusLabels[it.status] ?? statusLabels.draft;
          return (
            <Link
              key={it.id}
              to="/entrevistas/$id"
              params={{ id: it.id }}
              className="block"
            >
              <Card className="p-4 transition-colors hover:border-primary/50">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold">{it.title}</h3>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      {it.companies?.name && (
                        <span className="inline-flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {it.companies.name}
                          {it.sectors?.name ? ` • ${it.sectors.name}` : ""}
                        </span>
                      )}
                      {it.participant && (
                        <span className="inline-flex items-center gap-1">
                          <User className="h-3 w-3" /> {it.participant}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> {it.interview_date}
                      </span>
                    </div>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${status.color}`}>
                    {it.status === "analyzed" ? (
                      <CheckCircle2 className="mr-0.5 inline h-3 w-3" />
                    ) : it.status === "transcribing" ? (
                      <Clock className="mr-0.5 inline h-3 w-3 animate-spin" />
                    ) : null}
                    {status.label}
                  </span>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
