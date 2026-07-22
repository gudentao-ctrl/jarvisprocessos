import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { listInterviews, listCompanies } from "@/lib/interviews.functions";
import { listEvents, saveEvent, deleteEvent } from "@/lib/calendar-events.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, CalendarClock, Trash2, Pencil, MapPin } from "lucide-react";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/calendario/")({
  component: CalendarioPage,
});

const TYPE_LABEL: Record<string, string> = {
  reuniao: "Reunião", workshop: "Workshop", visita: "Visita",
  entrega: "Entrega", outro: "Outro",
};

const TYPE_COLORS: Record<string, string> = {
  reuniao: "bg-primary/10 text-primary",
  workshop: "bg-amber-100 text-amber-700",
  visita: "bg-emerald-100 text-emerald-700",
  entrega: "bg-blue-100 text-blue-700",
  outro: "bg-slate-100 text-slate-700",
};

const emptyForm = {
  id: undefined as string | undefined,
  title: "", description: "", event_type: "reuniao",
  starts_at: "", ends_at: "", location: "",
  company_id: "", project_id: "",
};

function CalendarioPage() {
  const [filterCompanyId, setFilterCompanyId] = useState<string>("");
  const listEv = useServerFn(listEvents);
  const listI = useServerFn(listInterviews);
  const listC = useServerFn(listCompanies);
  const save = useServerFn(saveEvent);
  const del = useServerFn(deleteEvent);
  const qc = useQueryClient();

  const { data: events = [] } = useQuery({
    queryKey: ["calendar-events", filterCompanyId || "all"],
    queryFn: () => listEv({ data: filterCompanyId ? { company_id: filterCompanyId } : {} }),
  });
  const { data: interviews = [] } = useQuery({
    queryKey: ["interviews", filterCompanyId || "all"],
    queryFn: () => listI({ data: filterCompanyId ? { company_id: filterCompanyId } : {} }),
  });
  const { data: companies = [] } = useQuery({ queryKey: ["companies"], queryFn: () => listC() });

  const [selected, setSelected] = useState<Date | undefined>(new Date());
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);

  const saveMut = useMutation({
    mutationFn: (payload: any) => save({ data: payload }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calendar-events"] });
      setOpen(false);
      setForm(emptyForm);
      toast.success("Compromisso salvo");
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao salvar"),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calendar-events"] });
      toast.success("Compromisso excluído");
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao excluir"),
  });

  const items: any[] = [
    ...(events as any[]).map((e) => ({
      kind: "event", id: e.id, title: e.title,
      date: e.starts_at, iso: (e.starts_at as string).slice(0, 10),
      type: e.event_type, location: e.location,
      subtitle: [e.companies?.name, e.projects?.name].filter(Boolean).join(" · "),
      raw: e,
    })),
    ...(interviews as any[])
      .filter((i) => i.interview_date)
      .map((i) => ({
        kind: "interview", id: i.id, title: i.title,
        date: i.interview_date, iso: (i.interview_date as string).slice(0, 10),
        type: "entrevista", subtitle: [i.meeting_type, i.participant].filter(Boolean).join(" · "),
        raw: i,
      })),
  ];

  const byDay = new Map<string, any[]>();
  for (const it of items) {
    if (!byDay.has(it.iso)) byDay.set(it.iso, []);
    byDay.get(it.iso)!.push(it);
  }
  const marked = Array.from(byDay.keys()).map((d) => new Date(d + "T12:00:00"));
  const selectedISO = selected ? toISO(selected) : undefined;
  const dayItems = (selectedISO ? byDay.get(selectedISO) ?? [] : [])
    .sort((a, b) => a.date.localeCompare(b.date));

  const todayISO = toISO(new Date());
  const upcoming = items
    .filter((i) => i.iso >= todayISO)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 15);

  function openNew(date?: Date) {
    const base = date ?? selected ?? new Date();
    const hhmm = "09:00";
    setForm({ ...emptyForm, starts_at: `${toISO(base)}T${hhmm}` });
    setOpen(true);
  }

  function openEdit(e: any) {
    setForm({
      id: e.id, title: e.title, description: e.description ?? "",
      event_type: e.event_type, starts_at: (e.starts_at as string).slice(0, 16),
      ends_at: e.ends_at ? (e.ends_at as string).slice(0, 16) : "",
      location: e.location ?? "",
      company_id: e.company_id ?? "", project_id: e.project_id ?? "",
    });
    setOpen(true);
  }

  function submit() {
    if (!form.title.trim()) return toast.error("Título obrigatório");
    if (!form.starts_at) return toast.error("Data/hora obrigatória");
    saveMut.mutate({
      id: form.id,
      title: form.title.trim(),
      description: form.description,
      event_type: form.event_type,
      starts_at: new Date(form.starts_at).toISOString(),
      ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
      location: form.location,
      company_id: form.company_id || null,
      project_id: form.project_id || null,
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Agenda</h1>
          <p className="text-xs text-muted-foreground">Compromissos, reuniões e entrevistas</p>
        </div>
        <Button className="min-h-11" onClick={() => openNew()}>
          <Plus className="mr-1 h-4 w-4" /> Novo
        </Button>
      </div>

      <div>
        <Label className="text-xs text-muted-foreground">Filtrar por empresa</Label>
        <Select value={filterCompanyId || "all"} onValueChange={(v) => setFilterCompanyId(v === "all" ? "" : v)}>
          <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as empresas</SelectItem>
            {(companies as any[]).map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
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

      <section>
        <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {selectedISO ? `Eventos em ${new Date(selectedISO + "T12:00:00").toLocaleDateString("pt-BR")}` : "Eventos"}
        </p>
        {dayItems.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            Nenhum compromisso.{" "}
            <button className="text-primary underline" onClick={() => openNew()}>Criar novo</button>
          </Card>
        ) : (
          <div className="grid gap-2">
            {dayItems.map((it) => (
              <EventRow key={`${it.kind}-${it.id}`} it={it}
                onEdit={() => it.kind === "event" && openEdit(it.raw)}
                onDelete={() => it.kind === "event" && confirmDelete(it, delMut.mutate)} />
            ))}
          </div>
        )}
      </section>

      <section>
        <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Próximos</p>
        {upcoming.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">Sem compromissos futuros.</Card>
        ) : (
          <div className="grid gap-2">
            {upcoming.map((it) => (
              <EventRow key={`u-${it.kind}-${it.id}`} it={it}
                onEdit={() => it.kind === "event" && openEdit(it.raw)}
                onDelete={() => it.kind === "event" && confirmDelete(it, delMut.mutate)} />
            ))}
          </div>
        )}
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar compromisso" : "Novo compromisso"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Título *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Tipo</Label>
                <Select value={form.event_type} onValueChange={(v) => setForm({ ...form, event_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_LABEL).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Local</Label>
                <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Sala, endereço, link…" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Início *</Label>
                <Input type="datetime-local" value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
              </div>
              <div>
                <Label>Fim</Label>
                <Input type="datetime-local" value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Empresa</Label>
              <Select value={form.company_id || "none"} onValueChange={(v) => setForm({ ...form, company_id: v === "none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— sem empresa —</SelectItem>
                  {(companies as any[]).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
            </div>
          </div>
          <DialogFooter>
            {form.id && (
              <Button variant="ghost" className="mr-auto text-destructive"
                onClick={() => {
                  if (confirm("Excluir este compromisso?")) {
                    delMut.mutate(form.id!);
                    setOpen(false);
                  }
                }}>
                <Trash2 className="mr-1 h-4 w-4" /> Excluir
              </Button>
            )}
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={submit} disabled={saveMut.isPending}>
              {saveMut.isPending ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function confirmDelete(it: any, run: (id: string) => void) {
  if (confirm(`Excluir "${it.title}"?`)) run(it.id);
}

function toISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function EventRow({ it, onEdit, onDelete }: { it: any; onEdit: () => void; onDelete: () => void }) {
  const time = new Date(it.date).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const isInterview = it.kind === "interview";
  const chipCls = isInterview ? "bg-secondary text-secondary-foreground" : TYPE_COLORS[it.type] ?? "bg-slate-100 text-slate-700";
  const chipLbl = isInterview ? "Entrevista" : TYPE_LABEL[it.type] ?? it.type;
  const body = (
    <Card className="flex min-h-[64px] items-center gap-3 p-3">
      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
        <CalendarClock className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold">{it.title}</p>
          <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${chipCls}`}>{chipLbl}</span>
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {time}
          {it.subtitle && ` · ${it.subtitle}`}
          {it.location && (
            <span className="ml-1 inline-flex items-center gap-0.5"><MapPin className="h-3 w-3" />{it.location}</span>
          )}
        </p>
      </div>
      {!isInterview && (
        <div className="flex shrink-0 items-center gap-1">
          <Button size="icon" variant="ghost" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(); }}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(); }}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      )}
    </Card>
  );
  if (isInterview) {
    return (
      <Link to="/entrevistas/$id" params={{ id: it.id }} className="hover:opacity-90">
        {body}
      </Link>
    );
  }
  return <div>{body}</div>;
}
