import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Window event fired after another device saved data; screens without React Query listen to it. */
export const LIVE_SYNC_EVENT = "jarvis:live-sync";

const MAX_COMPANY_TOPICS = 30;
const DEBOUNCE_MS = 700;

/** Topics are data-free doorbells; the database only lets members of each company join them. */
export function liveSyncTopics(companyIds: string[], activeCompanyId: string | null) {
  const unique = Array.from(new Set(companyIds.filter(Boolean)));
  const ordered = activeCompanyId
    ? [activeCompanyId, ...unique.filter((id) => id !== activeCompanyId)]
    : unique;
  return ["app-bell", ...ordered.slice(0, MAX_COMPANY_TOPICS).map((id) => `company-bell:${id}`)];
}

/** Subscribe to the user's company doorbells and refresh visible screens when data changes elsewhere. */
export function useLiveSync(companyIds: string[], activeCompanyId: string | null) {
  const qc = useQueryClient();
  const topicsKey = liveSyncTopics(companyIds, activeCompanyId).join("|");

  useEffect(() => {
    if (typeof window === "undefined") return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let pendingWhileHidden = false;
    let cancelled = false;

    const refresh = () => {
      timer = null;
      if (document.visibilityState !== "visible") {
        pendingWhileHidden = true;
        return;
      }
      // Only screens currently on display refetch; others refresh when reopened.
      void qc.invalidateQueries({ predicate: (q) => q.queryKey[0] !== "me" });
      window.dispatchEvent(new CustomEvent(LIVE_SYNC_EVENT));
    };
    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(refresh, DEBOUNCE_MS);
    };
    const onVisible = () => {
      if (document.visibilityState === "visible" && pendingWhileHidden) {
        pendingWhileHidden = false;
        schedule();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    const channels: ReturnType<typeof supabase.channel>[] = [];
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled || !data.session) return;
      await supabase.realtime.setAuth(data.session.access_token);
      if (cancelled) return;
      for (const topic of topicsKey.split("|")) {
        const channel = supabase
          .channel(topic, { config: { private: true } })
          .on("broadcast", { event: "changed" }, schedule)
          .subscribe();
        channels.push(channel);
      }
    })();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      for (const channel of channels) void supabase.removeChannel(channel);
    };
  }, [qc, topicsKey]);
}
