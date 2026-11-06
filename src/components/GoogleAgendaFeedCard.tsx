import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarCheck2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getMyCalendarFeed, removeMyCalendarFeed, saveMyCalendarFeed } from "@/lib/calendar-feed.functions";

export function GoogleAgendaFeedCard() {
  const qc = useQueryClient();
  const getFn = useServerFn(getMyCalendarFeed);
  const saveFn = useServerFn(saveMyCalendarFeed);
  const removeFn = useServerFn(removeMyCalendarFeed);
  const [url, setUrl] = useState("");
  const { data } = useQuery({ queryKey: ["my-calendar-feed"], queryFn: () => getFn() });

  const save = useMutation({
    mutationFn: () => saveFn({ data: { url } }),
    onSuccess: (r) => {
      setUrl("");
      qc.invalidateQueries({ queryKey: ["my-calendar-feed"] });
      toast.success(`Agenda vinculada. ${r.upcoming} compromisso(s) futuros encontrados.`);
    },
    onError: (e: any) => toast.error(e?.message ?? "Não foi possível vincular a agenda."),
  });
  const remove = useMutation({
    mutationFn: () => removeFn(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-calendar-feed"] });
      toast.success("Agenda desvinculada.");
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <CalendarCheck2 className="h-5 w-5" /> Google Agenda
        </CardTitle>
        <CardDescription>
          Vincule sua agenda para a equipe ver quando você está ocupado ao marcar reuniões. Apenas os horários
          ocupados são usados — títulos e detalhes dos seus compromissos nunca aparecem.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {data?.linked ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-secondary p-3">
            <span>
              Agenda vinculada
              {data.lastRead && ` · lida em ${new Date(data.lastRead).toLocaleString("pt-BR")}`}
            </span>
            <Button size="sm" variant="outline" onClick={() => remove.mutate()} disabled={remove.isPending}>
              Desvincular
            </Button>
          </div>
        ) : null}
        {data?.error && (
          <p className="flex items-start gap-2 text-xs text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {data.error} Cole o link novamente.
          </p>
        )}
        <ol className="list-decimal space-y-1 pl-5 text-xs text-muted-foreground">
          <li>No computador, abra calendar.google.com › engrenagem › Configurações.</li>
          <li>À esquerda, clique na sua agenda (seu nome) › "Integrar agenda".</li>
          <li>Copie o "Endereço secreto no formato iCal" e cole abaixo.</li>
        </ol>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            placeholder="https://calendar.google.com/calendar/ical/.../basic.ics"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <Button onClick={() => save.mutate()} disabled={!url.trim() || save.isPending}>
            {save.isPending ? "Verificando…" : data?.linked ? "Trocar link" : "Vincular"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
