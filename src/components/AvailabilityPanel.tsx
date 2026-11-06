import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, XCircle, HelpCircle, UserPlus } from "lucide-react";
import { checkAvailability, listAgendaTeam } from "@/lib/calendar-feed.functions";
import { cn } from "@/lib/utils";

type Props = {
  startsAt: string;
  endsAt: string;
  guestEmails: string[];
  allTeam: boolean;
  onAddGuest: (email: string) => void;
};

const hhmm = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

/** Shows team members to invite and whether each is free in the chosen time (from their Google Agenda). */
export function AvailabilityPanel({ startsAt, endsAt, guestEmails, allTeam, onAddGuest }: Props) {
  const listTeam = useServerFn(listAgendaTeam);
  const check = useServerFn(checkAvailability);
  const { data: team = [], error: teamError } = useQuery({ queryKey: ["agenda-team"], queryFn: () => listTeam(), retry: false });
  const [debounced, setDebounced] = useState({ startsAt, endsAt, key: guestEmails.join(","), allTeam });

  useEffect(() => {
    const t = setTimeout(() => setDebounced({ startsAt, endsAt, key: guestEmails.join(","), allTeam }), 500);
    return () => clearTimeout(t);
  }, [startsAt, endsAt, guestEmails, allTeam]);

  const enabled = !!debounced.startsAt && (debounced.allTeam || debounced.key.length > 0) && !teamError;
  const { data: result = [], isFetching } = useQuery({
    queryKey: ["availability", debounced],
    enabled,
    queryFn: () =>
      check({
        data: {
          emails: debounced.key ? debounced.key.split(",") : [],
          all_team: debounced.allTeam,
          start: new Date(debounced.startsAt).toISOString(),
          end: debounced.endsAt ? new Date(debounced.endsAt).toISOString() : null,
        },
      }),
  });

  if (teamError) return null;
  const notInvited = team.filter((t) => !guestEmails.includes(t.email));
  const busyCount = result.filter((r) => r.status === "busy").length;

  return (
    <div className="space-y-2 rounded-md border bg-muted/20 p-2.5 text-xs">
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold">Disponibilidade da equipe</span>
        {isFetching ? (
          <span className="text-muted-foreground">Verificando…</span>
        ) : result.length > 0 ? (
          <span className={busyCount ? "text-destructive font-medium" : "text-primary font-medium"}>
            {busyCount ? `${busyCount} com conflito` : "Todos livres"}
          </span>
        ) : null}
      </div>

      {result.length > 0 && (
        <ul className="space-y-1">
          {result.map((r) => (
            <li key={r.email} className="flex items-start gap-1.5">
              {r.status === "free" ? (
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
              ) : r.status === "busy" ? (
                <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
              ) : (
                <HelpCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              )}
              <span className="min-w-0">
                <span className="font-medium">{r.name}</span>{" "}
                <span className="text-muted-foreground">
                  {r.status === "free" && "livre"}
                  {r.status === "busy" && `ocupado ${r.conflicts.map(([s, e]) => `${hhmm(s)}–${hhmm(e)}`).join(", ")}`}
                  {r.status === "unknown" && "não vinculou a agenda Google"}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}

      {!allTeam && notInvited.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {notInvited.map((t) => (
            <button
              key={t.email}
              type="button"
              onClick={() => onAddGuest(t.email)}
              className={cn("inline-flex items-center gap-1 rounded-full border bg-background px-2 py-0.5 hover:bg-secondary")}
            >
              <UserPlus className="h-3 w-3" /> {t.name.split(" ")[0]}
            </button>
          ))}
        </div>
      )}
      <p className="text-[11px] text-muted-foreground">
        Cada pessoa vincula a própria agenda em{" "}
        <Link to="/perfil" className="text-primary hover:underline">Meu Perfil</Link>. O Google pode levar alguns minutos para atualizar.
      </p>
    </div>
  );
}
