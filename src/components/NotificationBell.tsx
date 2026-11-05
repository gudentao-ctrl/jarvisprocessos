import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bell, BellRing, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  getPushPublicKey,
  listMyNotifications,
  markNotificationsRead,
  savePushSubscription,
} from "@/lib/notifications.functions";
import { currentPushState, enablePush, refreshPushLink, type PushState } from "@/lib/push-client";
import { cn } from "@/lib/utils";

const QUERY_KEY = ["my-notifications"];

function timeAgo(iso: string) {
  const diff = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });
  const abs = Math.abs(diff);
  if (abs < 60) return rtf.format(diff, "second");
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  return rtf.format(Math.round(diff / 86400), "day");
}

const PUSH_HINT: Record<Exclude<PushState, "on" | "off">, string> = {
  iframe: "Abra o JARVIS em uma aba própria ou no app instalado para ativar os avisos.",
  unsupported: "Este navegador não permite avisos fora do app.",
  "ios-install":
    "No iPhone, toque em Compartilhar › Adicionar à Tela de Início e abra o JARVIS por esse ícone para ativar os avisos.",
  denied: "Os avisos foram bloqueados neste aparelho. Libere nas configurações do navegador para este site.",
};

export function NotificationBell() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const list = useServerFn(listMyNotifications);
  const markRead = useServerFn(markNotificationsRead);
  const getKey = useServerFn(getPushPublicKey);
  const saveSub = useServerFn(savePushSubscription);
  const [open, setOpen] = useState(false);
  const [pushState, setPushState] = useState<PushState | null>(null);
  const [enabling, setEnabling] = useState(false);
  const seen = useRef<Set<string> | null>(null);

  const { data, refetch } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => list(),
    refetchInterval: 5 * 60 * 1000,
  });
  const items = data?.items ?? [];
  const unread = data?.unread ?? 0;

  // Show an on-screen alert for notifications that arrive while the app is open.
  useEffect(() => {
    if (!data) return;
    if (seen.current === null) {
      seen.current = new Set(data.items.map((n) => n.id));
      return;
    }
    for (const n of data.items) {
      if (seen.current.has(n.id)) continue;
      seen.current.add(n.id);
      if (!n.read_at) {
        toast(n.title, {
          description: n.body || undefined,
          action: { label: "Abrir", onClick: () => openItem(n.id, n.link) },
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // Personal data-free doorbell: refresh the list as soon as something new is stored.
  useEffect(() => {
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    void (async () => {
      const { data: s } = await supabase.auth.getSession();
      if (cancelled || !s.session) return;
      await supabase.realtime.setAuth(s.session.access_token);
      if (cancelled) return;
      channel = supabase
        .channel(`user-bell:${s.session.user.id}`, { config: { private: true } })
        .on("broadcast", { event: "changed" }, () => void refetch())
        .subscribe();
    })();
    const onVisible = () => {
      if (document.visibilityState === "visible") void refetch();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [refetch]);

  // Keep this device linked to the signed-in user when avisos were already allowed.
  useEffect(() => {
    void (async () => {
      try {
        await refreshPushLink(() => getKey(), (sub) => saveSub({ data: sub }));
      } catch (err) {
        console.warn("[push] refresh", (err as Error).message);
      }
      setPushState(await currentPushState());
    })();
  }, [getKey, saveSub]);

  async function openItem(id: string, link: string) {
    setOpen(false);
    await markRead({ data: { ids: [id] } }).catch(() => {});
    void qc.invalidateQueries({ queryKey: QUERY_KEY });
    navigate({ href: link });
  }

  async function markAll() {
    await markRead({ data: {} });
    void qc.invalidateQueries({ queryKey: QUERY_KEY });
  }

  async function turnOn() {
    setEnabling(true);
    try {
      const state = await enablePush(() => getKey(), (sub) => saveSub({ data: sub }));
      setPushState(state);
      if (state === "on") toast.success("Avisos ativados neste aparelho.");
      else if (state !== "off") toast.message(PUSH_HINT[state]);
    } catch (err) {
      toast.error("Não foi possível ativar os avisos: " + ((err as Error).message ?? ""));
    } finally {
      setEnabling(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="relative h-10 w-10 shrink-0 touch-manipulation"
          aria-label={unread ? `Avisos, ${unread} não lidos` : "Avisos"}
        >
          {unread ? <BellRing className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
          {unread > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(92vw,360px)] p-0">
        <div className="flex items-center justify-between border-b px-3 py-2.5">
          <span className="text-sm font-semibold">Avisos</span>
          {unread > 0 && (
            <Button size="sm" variant="ghost" className="h-8 gap-1 text-xs" onClick={markAll}>
              <CheckCheck className="h-3.5 w-3.5" /> Marcar como lidos
            </Button>
          )}
        </div>

        {pushState && pushState !== "on" && (
          <div className="border-b bg-muted/40 px-3 py-2.5 text-xs">
            {pushState === "off" ? (
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Receba avisos mesmo com o app fechado.</span>
                <Button size="sm" className="h-8 shrink-0 text-xs" onClick={turnOn} disabled={enabling}>
                  {enabling ? "Ativando…" : "Ativar"}
                </Button>
              </div>
            ) : (
              <p className="text-muted-foreground">{PUSH_HINT[pushState]}</p>
            )}
          </div>
        )}

        <div className="max-h-[60vh] overflow-y-auto">
          {items.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">Nenhum aviso por enquanto.</p>
          ) : (
            items.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => openItem(n.id, n.link)}
                className={cn(
                  "flex w-full flex-col gap-0.5 border-b px-3 py-2.5 text-left last:border-b-0 hover:bg-secondary",
                  !n.read_at && "bg-accent/40",
                )}
              >
                <span className="flex items-start gap-2 text-sm font-medium">
                  {!n.read_at && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                  <span className="min-w-0 flex-1">{n.title}</span>
                </span>
                {n.body && <span className="text-xs text-muted-foreground">{n.body}</span>}
                <span className="text-[11px] text-muted-foreground">{timeAgo(n.created_at)}</span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
