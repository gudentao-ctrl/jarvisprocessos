import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listMyTickets,
  saveTicket,
  deleteTicket,
  TICKET_KINDS,
  TICKET_PRIORITIES,
  ticketKindLabel,
  ticketPriorityLabel,
  ticketStatusLabel,
} from "@/lib/tickets.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LifeBuoy, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/chamados/")({
  head: () => ({
    meta: [
      { title: "Chamados internos — JARVIS" },
      { name: "description", content: "Solicitações de melhorias e registro de erros internos no JARVIS." },
      { property: "og:title", content: "Chamados internos — JARVIS" },
      { property: "og:description", content: "Solicitações de melhorias e registro de erros internos no JARVIS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TicketsPage,
});

const empty = { title: "", description: "", kind: "melhoria", priority: "media" };

function TicketsPage() {
  const qc = useQueryClient();
  const list = useServerFn(listMyTickets);
  const save = useServerFn(saveTicket);
  const del = useServerFn(deleteTicket);
  const [form, setForm] = useState<any>(empty);

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["my-tickets"],
    queryFn: () => list(),
  });

  const saveMut = useMutation({
    mutationFn: (v: any) => save({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-tickets"] });
      setForm(empty);
      toast.success("Chamado enviado");
    },
    onError: (e: any) => toast.error(e?.message ?? "Não foi possível enviar"),
  });

  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-tickets"] }),
    onError: (e: any) => toast.error(e?.message),
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold sm:text-2xl">
          <LifeBuoy className="h-5 w-5" /> Chamados internos
        </h1>
        <p className="text-xs text-muted-foreground">
          Solicite melhorias ou reporte erros para o SuperAdmin
        </p>
      </div>

      <Card className="space-y-3 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Título</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Resumo do pedido ou do erro"
            />
          </div>
          <div>
            <Label>Tipo</Label>
            <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TICKET_KINDS.map((k) => (
                  <SelectItem key={k.value} value={k.value}>
                    {k.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Prioridade</Label>
            <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TICKET_PRIORITIES.map((k) => (
                  <SelectItem key={k.value} value={k.value}>
                    {k.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label>Descrição</Label>
            <Textarea
              rows={4}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Descreva o que aconteceu ou o que precisa ser melhorado"
            />
          </div>
        </div>
        <Button
          className="w-full sm:w-auto"
          disabled={saveMut.isPending || form.title.trim().length < 3}
          onClick={() => saveMut.mutate(form)}
        >
          <Plus className="mr-1 h-4 w-4" /> Enviar chamado
        </Button>
      </Card>

      <div className="space-y-2">
        {isLoading && <Card className="p-6 text-center text-sm text-muted-foreground">Carregando…</Card>}
        {!isLoading && tickets.length === 0 && (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            Você ainda não abriu chamados.
          </Card>
        )}
        {tickets.map((t: any) => (
          <Card key={t.id} className="space-y-2 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="min-w-0 flex-1 font-semibold">{t.title}</p>
              <Badge variant="outline" className="text-[10px]">
                {ticketKindLabel(t.kind)}
              </Badge>
              <Badge variant="secondary" className="text-[10px]">
                {ticketPriorityLabel(t.priority)}
              </Badge>
              <Badge className="text-[10px]">{ticketStatusLabel(t.status)}</Badge>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => delMut.mutate(t.id)}
                aria-label="Excluir chamado"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            {t.description && (
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{t.description}</p>
            )}
            {t.response && (
              <div className="rounded-md bg-secondary p-2 text-sm">
                <span className="font-medium">Resposta: </span>
                {t.response}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
