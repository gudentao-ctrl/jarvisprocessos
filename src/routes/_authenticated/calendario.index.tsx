import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { listInterviews, listCompanies } from "@/lib/interviews.functions";
import {
  listEvents,
  saveEvent,
  deleteEvent,
  listCalendarLocations,
  createCalendarLocation,
} from "@/lib/calendar-events.functions";
import { getGoogleCalendarStatus, buildGoogleCalendarUrl } from "@/lib/google-calendar.functions";
import { getMe } from "@/lib/access.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus,
  CalendarClock,
  Trash2,
  Pencil,
  MapPin,
  Mail,
  X,
  Users,
  Calendar as CalendarIcon,
  ShieldAlert,
  Sparkles,
  Layers,
  Building2,
} from "lucide-react";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/calendario/")({
  component: CalendarioPage,
});

const TYPE_LABEL: Record<string, string> = {
  reuniao: "Reunião",
  alinhamento: "Alinhamento Geral / Supervisão",
  workshop: "Workshop",
  visita: "Visita",
  entrega: "Entrega",
  outro: "Outro",
};

const TYPE_COLORS: Record<string, string> = {
  reuniao: "bg-primary/10 text-primary",
  alinhamento: "bg-destructive text-destructive-foreground",
  workshop: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  visita: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  entrega: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  outro: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

const emptyForm = {
  id: undefined as string | undefined,
  title: "",
  description: "",
  event_type: "reuniao",
  starts_at: "",
  ends_at: "",
  location: "",
  company_id: "",
  project_id: "",
  is_internal_invite: false,
  guest_emails: [] as string[],
  sync_google: true,
};

function CalendarioPage() {
  const [viewMode, setViewMode] = useState<"all" | "company">("all");
  const [filterCompanyId, setFilterCompanyId] = useState<string>("");

  const listEv = useServerFn(listEvents);
  const listI = useServerFn(listInterviews);
  const listC = useServerFn(listCompanies);
  const listLocs = useServerFn(listCalendarLocations);
  const createLocFn = useServerFn(createCalendarLocation);
  const getGoogleStatusFn = useServerFn(getGoogleCalendarStatus);
  const getMeFn = useServerFn(getMe);
  const save = useServerFn(saveEvent);
  const del = useServerFn(deleteEvent);
  const qc = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ["me"],
    queryFn: () => getMeFn(),
  });

  const isSuperadmin = !!profile?.isSuperadmin;
  const isGestor =
    isSuperadmin ||
    (profile?.memberships ?? []).some(
      (m: any) => m.role === "gestor" || m.permissions?.gestao === true,
    );

  const { data: googleStatus } = useQuery({
    queryKey: ["google-calendar-status"],
    queryFn: () => getGoogleStatusFn(),
  });

  const { data: locations = [] } = useQuery({
    queryKey: ["calendar-locations"],
    queryFn: () => listLocs(),
  });

  const { data: events = [] } = useQuery({
    queryKey: ["calendar-events", viewMode, filterCompanyId],
    queryFn: () =>
      listEv({
        data: {
          view: viewMode,
          company_id: viewMode === "company" && filterCompanyId ? filterCompanyId : undefined,
        },
      }),
  });

  const { data: interviews = [] } = useQuery({
    queryKey: ["interviews", viewMode, filterCompanyId],
    queryFn: () =>
      listI({
        data: viewMode === "company" && filterCompanyId ? { company_id: filterCompanyId } : {},
      }),
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["companies"],
    queryFn: () => listC(),
  });

  const [selected, setSelected] = useState<Date | undefined>(new Date());
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);
  const [emailInput, setEmailInput] = useState("");
  const [newLocationOpen, setNewLocationOpen] = useState(false);
  const [newLocationName, setNewLocationName] = useState("");

  const saveMut = useMutation({
    mutationFn: (payload: any) => save({ data: payload }),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ["calendar-events"] });
      const shouldOpenGoogle = form.sync_google;
      const gUrl = res?.googleCalendarUrl || buildGoogleCalendarUrl({
        title: form.title,
        description: form.description,
        location: form.location,
        startsAt: form.starts_at,
        endsAt: form.ends_at,
        guestEmails: form.guest_emails,
      });
      setOpen(false);
      setForm(emptyForm);
      setEmailInput("");
      toast.success("Compromisso salvo com sucesso!");
      if (shouldOpenGoogle && gUrl) {
        window.open(gUrl, "_blank");
        toast.info("Abrindo Google Agenda com dados e convidados preenchidos...");
      }
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao salvar compromisso"),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calendar-events"] });
      toast.success("Compromisso excluído");
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao excluir"),
  });

  const createLocationMut = useMutation({
    mutationFn: (name: string) => createLocFn({ data: { name } }),
    onSuccess: (created: any) => {
      qc.invalidateQueries({ queryKey: ["calendar-locations"] });
      setForm((prev) => ({ ...prev, location: created.name }));
      setNewLocationName("");
      setNewLocationOpen(false);
      toast.success(`Local "${created.name}" cadastrado!`);
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao cadastrar local"),
  });

  const items: any[] = [
    ...(events as any[]).map((e) => ({
      kind: "event",
      id: e.id,
      title: e.title,
      date: e.starts_at,
      iso: (e.starts_at as string).slice(0, 10),
      type: e.event_type,
      location: e.location,
      subtitle: [e.companies?.name, e.projects?.name].filter(Boolean).join(" · "),
      raw: e,
      highlighted: e.is_manager_alignment || e.is_internal_invite,
      isInternalInvite: e.is_internal_invite,
      googleEventId: e.google_event_id,
      googleCalendarUrl:
        e.googleCalendarUrl ||
        buildGoogleCalendarUrl({
          title: e.title,
          description: e.description,
          location: e.location,
          startsAt: e.starts_at,
          endsAt: e.ends_at,
          guestEmails: e.guest_emails,
        }),
      guestEmails: e.guest_emails ?? [],
    })),
    ...(interviews as any[])
      .filter((i) => i.interview_date)
      .map((i) => ({
        kind: "interview",
        id: i.id,
        title: i.title,
        date: i.interview_date,
        iso: (i.interview_date as string).slice(0, 10),
        type: "entrevista",
        subtitle: [i.meeting_type, i.participant].filter(Boolean).join(" · "),
        raw: i,
        highlighted: false,
        isInternalInvite: false,
        googleEventId: null,
        googleCalendarUrl: buildGoogleCalendarUrl({
          title: `Entrevista: ${i.title || "Consultoria"}`,
          description: `Participante: ${i.participant || ""}\nTipo: ${i.meeting_type || ""}`,
          startsAt: i.interview_date,
        }),
        guestEmails: [],
      })),
  ];

  const byDay = new Map<string, any[]>();
  for (const it of items) {
    if (!byDay.has(it.iso)) byDay.set(it.iso, []);
    byDay.get(it.iso)!.push(it);
  }
  const marked = Array.from(byDay.keys()).map((d) => new Date(d + "T12:00:00"));
  const selectedISO = selected ? toISO(selected) : undefined;
  const dayItems = (selectedISO ? byDay.get(selectedISO) ?? [] : []).sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  const todayISO = toISO(new Date());
  const upcoming = items
    .filter((i) => i.iso >= todayISO)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 15);

  function openNew(date?: Date) {
    const base = date ?? selected ?? new Date();
    const hhmm = "09:00";
    setForm({
      ...emptyForm,
      starts_at: `${toISO(base)}T${hhmm}`,
      sync_google: !!googleStatus?.connected,
    });
    setEmailInput("");
    setOpen(true);
  }

  function openEdit(e: any) {
    setForm({
      id: e.id,
      title: e.title,
      description: e.description ?? "",
      event_type: e.event_type,
      starts_at: (e.starts_at as string).slice(0, 16),
      ends_at: e.ends_at ? (e.ends_at as string).slice(0, 16) : "",
      location: e.location ?? "",
      company_id: e.company_id ?? "",
      project_id: e.project_id ?? "",
      is_internal_invite: !!e.is_internal_invite,
      guest_emails: Array.isArray(e.guest_emails) ? e.guest_emails : [],
      sync_google: !!e.google_event_id || !!googleStatus?.connected,
    });
    setEmailInput("");
    setOpen(true);
  }

  function handleAddEmail() {
    const email = emailInput.trim().toLowerCase();
    if (!email) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Formato de e-mail inválido");
      return;
    }
    if (form.guest_emails.includes(email)) {
      toast.error("Este e-mail já foi adicionado");
      return;
    }
    setForm((prev) => ({
      ...prev,
      guest_emails: [...prev.guest_emails, email],
      sync_google: !!googleStatus?.connected ? true : prev.sync_google,
    }));
    setEmailInput("");
  }

  function handleRemoveEmail(index: number) {
    setForm((prev) => ({
      ...prev,
      guest_emails: prev.guest_emails.filter((_, i) => i !== index),
    }));
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
      is_internal_invite: form.is_internal_invite,
      guest_emails: form.guest_emails,
      sync_google: form.sync_google,
    });
  }

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Agenda</h1>
          <p className="text-xs text-muted-foreground">
            Compromissos, reuniões e entrevistas sincronizadas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button className="min-h-10" onClick={() => openNew()}>
            <Plus className="mr-1 h-4 w-4" /> Novo Compromisso
          </Button>
        </div>
      </div>

      {/* Barra de Filtros: Visualização Integral vs Filtrar por Cliente */}
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground">Modo de Visualização:</span>
          <div className="inline-flex rounded-lg border bg-muted/40 p-1">
            <button
              type="button"
              onClick={() => {
                setViewMode("all");
              }}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                viewMode === "all"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Layers className="h-3.5 w-3.5" />
              Visualização Integral
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode("company");
              }}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                viewMode === "company"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Building2 className="h-3.5 w-3.5" />
              Filtrar por Cliente
            </button>
          </div>
        </div>

        {viewMode === "company" && (
          <div className="flex items-center gap-2 sm:w-72">
            <Select
              value={filterCompanyId || "all"}
              onValueChange={(v) => setFilterCompanyId(v === "all" ? "" : v)}
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Selecione um cliente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os clientes</SelectItem>
                {(companies as any[]).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Calendário */}
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

      {/* Lista do dia selecionado */}
      <section>
        <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {selectedISO
            ? `Eventos em ${new Date(selectedISO + "T12:00:00").toLocaleDateString("pt-BR")}`
            : "Eventos"}
        </p>
        {dayItems.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            Nenhum compromisso neste dia.{" "}
            <button className="text-primary underline" onClick={() => openNew()}>
              Criar novo
            </button>
          </Card>
        ) : (
          <div className="grid gap-2">
            {dayItems.map((it) => (
              <EventRow
                key={`${it.kind}-${it.id}`}
                it={it}
                onEdit={() => it.kind === "event" && openEdit(it.raw)}
                onDelete={() => it.kind === "event" && confirmDelete(it, delMut.mutate)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Próximos eventos */}
      <section>
        <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Próximos Compromissos
        </p>
        {upcoming.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            Sem compromissos futuros.
          </Card>
        ) : (
          <div className="grid gap-2">
            {upcoming.map((it) => (
              <EventRow
                key={`u-${it.kind}-${it.id}`}
                it={it}
                onEdit={() => it.kind === "event" && openEdit(it.raw)}
                onDelete={() => it.kind === "event" && confirmDelete(it, delMut.mutate)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Dialog: Criar / Editar Evento */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar compromisso" : "Novo compromisso"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Título *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Ex: Alinhamento de Metas ou Reunião de Processos"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label>Tipo de Evento</Label>
                <Select
                  value={form.event_type}
                  onValueChange={(v) => {
                    setForm({
                      ...form,
                      event_type: v,
                      // Se for Alinhamento e usuário é gestor/superadmin, sugere convite interno
                      is_internal_invite: v === "alinhamento" ? true : form.is_internal_invite,
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_LABEL).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Local com Select de locais pré-salvos + botão adicionar */}
              <div>
                <div className="flex items-center justify-between">
                  <Label>Local</Label>
                  <button
                    type="button"
                    onClick={() => setNewLocationOpen(true)}
                    className="text-[11px] text-primary hover:underline font-medium"
                  >
                    + Adicionar Local
                  </button>
                </div>
                <Select
                  value={form.location || "none"}
                  onValueChange={(v) => setForm({ ...form, location: v === "none" ? "" : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um local..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Não especificado —</SelectItem>
                    {(locations as any[]).map((loc) => (
                      <SelectItem key={loc.id || loc.name} value={loc.name}>
                        {loc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Checkbox de Convite Interno (apenas para Gestores / Superadmins) */}
            {isGestor && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="internal-invite"
                    checked={form.is_internal_invite}
                    onCheckedChange={(checked) =>
                      setForm({ ...form, is_internal_invite: !!checked })
                    }
                  />
                  <div className="grid gap-1 leading-none">
                    <label
                      htmlFor="internal-invite"
                      className="cursor-pointer text-xs font-semibold text-foreground flex items-center gap-1"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                      Convite Interno (Destaque Geral para todos os consultores)
                    </label>
                    <p className="text-[11px] text-muted-foreground">
                      Este evento ficará em destaque na agenda de toda a equipe e consultores.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label>Início *</Label>
                <Input
                  type="datetime-local"
                  value={form.starts_at}
                  onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
                />
              </div>
              <div>
                <Label>Fim</Label>
                <Input
                  type="datetime-local"
                  value={form.ends_at}
                  onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Empresa / Cliente</Label>
              <Select
                value={form.company_id || "none"}
                onValueChange={(v) =>
                  setForm({ ...form, company_id: v === "none" ? "" : v })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Geral / Sem empresa específica —</SelectItem>
                  {(companies as any[]).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* E-mails dos Convidados (Tags/Chips) */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                Convidados por E-mail (Google Calendar)
              </Label>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="ex: participante@empresa.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddEmail();
                    }
                  }}
                />
                <Button type="button" variant="secondary" onClick={handleAddEmail}>
                  Adicionar
                </Button>
              </div>

              {form.guest_emails.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {form.guest_emails.map((email, idx) => (
                    <Badge
                      key={email}
                      variant="secondary"
                      className="flex items-center gap-1 py-1 pl-2 pr-1 text-xs"
                    >
                      <span>{email}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveEmail(idx)}
                        className="rounded-full p-0.5 hover:bg-muted"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              {/* Integração Direta com Google Agenda (Automática, Gratuita e Sem API Complexa) */}
              <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3 text-xs dark:border-blue-900/50 dark:bg-blue-950/20 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    <div>
                      <p className="font-semibold text-foreground">Sincronizar com Google Agenda</p>
                      <p className="text-[11px] text-muted-foreground">
                        Identifica data, horário, pauta, local e convidados automaticamente
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="sync-google"
                      checked={form.sync_google}
                      onCheckedChange={(c) => setForm({ ...form, sync_google: !!c })}
                    />
                    <label htmlFor="sync-google" className="cursor-pointer font-semibold text-primary">
                      {form.sync_google ? "Ativado" : "Desativado"}
                    </label>
                  </div>
                </div>
                <p className="text-[11px] text-blue-950/80 dark:text-blue-200/80">
                  ✨ Integração direta e gratuita: ao salvar, o evento é enviado para a sua conta Google com todos os quesitos preenchidos e convites prontos para disparo.
                </p>
              </div>
            </div>

            <div>
              <Label>Descrição</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                placeholder="Pauta da reunião, detalhes ou instruções..."
              />
            </div>
          </div>
          <DialogFooter>
            {form.id && (
              <Button
                variant="ghost"
                className="mr-auto text-destructive"
                onClick={() => {
                  if (confirm("Excluir este compromisso?")) {
                    delMut.mutate(form.id!);
                    setOpen(false);
                  }
                }}
              >
                <Trash2 className="mr-1 h-4 w-4" /> Excluir
              </Button>
            )}
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={submit} disabled={saveMut.isPending}>
              {saveMut.isPending ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog auxiliar: Adicionar Local Pré-Salvo */}
      <Dialog open={newLocationOpen} onOpenChange={setNewLocationOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Local Pré-salvo</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>Nome do Local *</Label>
            <Input
              value={newLocationName}
              onChange={(e) => setNewLocationName(e.target.value)}
              placeholder="Ex: PO Londrina, Sala de Reunião 2, Google Meet..."
              onKeyDown={(e) => {
                if (e.key === "Enter" && newLocationName.trim()) {
                  e.preventDefault();
                  createLocationMut.mutate(newLocationName.trim());
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewLocationOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={!newLocationName.trim() || createLocationMut.isPending}
              onClick={() => createLocationMut.mutate(newLocationName.trim())}
            >
              {createLocationMut.isPending ? "Salvando..." : "Adicionar Local"}
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

function EventRow({
  it,
  onEdit,
  onDelete,
}: {
  it: any;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const time = new Date(it.date).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const isInterview = it.kind === "interview";
  const chipCls = isInterview
    ? "bg-secondary text-secondary-foreground"
    : TYPE_COLORS[it.type] ?? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  const chipLbl = isInterview ? "Entrevista" : TYPE_LABEL[it.type] ?? it.type;

  const body = (
    <Card
      className={cn(
        "flex min-h-[64px] items-center gap-3 p-3 transition-colors",
        it.highlighted &&
          "border-l-4 border-l-red-500 border-red-200 bg-red-50/40 dark:border-l-red-500 dark:border-red-900/50 dark:bg-red-950/20 shadow-sm",
      )}
    >
      <div
        className={cn(
          "grid h-12 w-12 shrink-0 place-items-center rounded-lg",
          it.highlighted ? "bg-red-100 text-red-600 dark:bg-red-900/50" : "bg-primary/10 text-primary",
        )}
      >
        {it.highlighted ? <Sparkles className="h-5 w-5" /> : <CalendarClock className="h-5 w-5" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold">{it.title}</p>
          <span
            className={cn("shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase", chipCls)}
          >
            {chipLbl}
          </span>
          {it.isInternalInvite && (
            <Badge variant="destructive" className="text-[10px] uppercase font-bold py-0">
              Convite Interno
            </Badge>
          )}
          {it.googleEventId && (
            <Badge variant="outline" className="text-[10px] py-0 text-blue-600 border-blue-300">
              Google Calendar
            </Badge>
          )}
        </div>
        <p className="truncate text-xs text-muted-foreground mt-0.5">
          {time}
          {it.subtitle && ` · ${it.subtitle}`}
          {it.location && (
            <span className="ml-1.5 inline-flex items-center gap-0.5">
              <MapPin className="h-3 w-3 text-muted-foreground" />
              {it.location}
            </span>
          )}
          {it.guestEmails?.length > 0 && (
            <span className="ml-1.5 inline-flex items-center gap-0.5">
              <Users className="h-3 w-3 text-muted-foreground" />
              {it.guestEmails.length}{" "}
              {it.guestEmails.length === 1 ? "convidado" : "convidados"}
            </span>
          )}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {it.googleCalendarUrl && (
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1 px-2 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/40 border-blue-200 dark:border-blue-800"
            title="Adicionar / Abrir no Google Agenda"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              window.open(it.googleCalendarUrl, "_blank");
            }}
          >
            <CalendarIcon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Google Agenda</span>
          </Button>
        )}
        {!isInterview && (
          <>
            <Button
              size="icon"
              variant="ghost"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onEdit();
              }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete();
              }}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </>
        )}
      </div>
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
