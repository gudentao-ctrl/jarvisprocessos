import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { listInterviews } from "@/lib/interviews.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Plus, CalendarClock, ChevronRight } from "lucide-react";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/calendario/")({
  component: CalendarioPage,
});

function CalendarioPage() {
  const list = useServerFn(listInterviews);
  const { data: interviews = [] } = useQuery({ queryKey: ["interviews"], queryFn: () => list() });
  const [selected, setSelected] = useState<Date | undefined>(new Date());

  const byDay = new Map<string, any[]>();
  for (const i of interviews as any[]) {
    if (!i.interview_date) continue;
    const d = i.interview_date.slice(0, 10);
    if (!byDay.has(d)) byDay.set(d, []);
    byDay.get(d)!.push(i);
  }

  const marked = Array.from(byDay.keys()).map((d) => new Date(d + "T12:00:00"));
  const selectedISO = selected?.toISOString().slice(0, 10);
  const dayEvents = selectedISO ? byDay.get(selectedISO) ?? [] : [];

  const upcoming = (interviews as any[])
    .filter((i) => i.interview_date && i.interview_date >= new Date().toISOString().slice(0, 10))
    .sort((a, b) => (a.interview_date ?? "").localeCompare(b.interview_date ?? ""))
    .slice(0, 20);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold sm:text-2xl">Calendário</h1>
        <Link to="/entrevistas/nova">
          <Button className="min-h-11"><Plus className="mr-1 h-4 w-4" /> Agendar</Button>
        </Link>
      </div>

      <Card className="p-2 sm:p-4">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={setSelected}
          locale={ptBR}
          modifiers={{ hasEvent: marked }}
          modifiersClassNames={{ hasEvent: "font-bold text-primary underline underline-offset-4" }}
          className="pointer-events-auto mx-auto"
        />
      </Card>

      <div>
        <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {selectedISO ? `Eventos em ${new Date(selectedISO + "T12:00:00").toLocaleDateString("pt-BR")}` : "Eventos"}
        </p>
        {dayEvents.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">Nenhum evento neste dia.</Card>
        ) : (
          <div className="grid gap-2">
            {dayEvents.map((e: any) => <EventRow key={e.id} e={e} />)}
          </div>
        )}
      </div>

      <div>
        <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Próximos</p>
        {upcoming.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">Sem eventos futuros.</Card>
        ) : (
          <div className="grid gap-2">
            {upcoming.map((e: any) => <EventRow key={e.id} e={e} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function EventRow({ e }: { e: any }) {
  return (
    <Link to="/entrevistas/$id" params={{ id: e.id }}>
      <Card className="flex min-h-[64px] items-center gap-3 p-3 hover:bg-secondary/50 active:bg-secondary">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <CalendarClock className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{e.title}</p>
          <p className="truncate text-xs text-muted-foreground">
            {new Date(e.interview_date).toLocaleDateString("pt-BR")}
            {e.meeting_type && ` · ${e.meeting_type}`}
            {e.participant && ` · ${e.participant}`}
          </p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </Card>
    </Link>
  );
}
