import { createFileRoute, Outlet, redirect, Link, useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import {
  Mic, Building2, Clock, CalendarDays, FileBarChart2, Radar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ActiveCompanyProvider } from "@/lib/active-company";
import { CompanySwitcher } from "@/components/CompanySwitcher";
import { AskAiFab } from "@/components/AskAiFab";

const ALLOWED_EMAIL = "g_zamboni@hotmail.com";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    if ((data.user.email ?? "").toLowerCase() !== ALLOWED_EMAIL) {
      await supabase.auth.signOut();
      throw redirect({ to: "/auth" });
    }
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

const NAV = [
  { to: "/empresas", icon: Building2, label: "Empresas" },
  { to: "/controle", icon: Radar, label: "Controle" },
  { to: "/calendario", icon: CalendarDays, label: "Agenda" },
  { to: "/horas", icon: Clock, label: "Horas" },
  { to: "/relatorios", icon: FileBarChart2, label: "Relatórios" },
] as const;

const MOBILE_NAV = NAV;

function AuthenticatedLayout() {
  const router = useRouter();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") router.invalidate();
    });
    return () => sub.subscription.unsubscribe();
  }, [router]);

  return (
    <ActiveCompanyProvider>
      <div className="flex min-h-screen bg-muted/30">
        {/* Sidebar desktop */}
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r bg-background lg:flex">
          <div className="flex h-14 items-center gap-2 border-b px-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Mic className="h-4 w-4" />
            </div>
            <span className="text-base font-bold tracking-tight">JARVIS</span>
          </div>
          <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
            {NAV.map((n) => (
              <SidebarLink key={n.to} {...n} />
            ))}
          </nav>
        </aside>

        {/* Content area */}
        <div className="flex min-w-0 flex-1 flex-col lg:ml-60">
          {/* Topbar with company switcher */}
          <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur">
            <div className="flex items-center gap-2 lg:hidden">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Mic className="h-4 w-4" />
              </div>
              <span className="text-base font-bold tracking-tight">JARVIS</span>
            </div>
            <div className="ml-auto">
              <CompanySwitcher />
            </div>
          </header>

          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-6xl px-4 py-4 pb-24 sm:py-6 lg:pb-6">
              <Outlet />
            </div>
          </main>
        </div>

        {/* Bottom nav mobile */}
        <nav
          className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t bg-background/95 backdrop-blur lg:hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          {MOBILE_NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="flex min-h-[60px] flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium text-muted-foreground transition-colors active:bg-secondary"
              activeProps={{ className: "text-primary" }}
            >
              <n.icon className="h-5 w-5" />
              <span>{n.label}</span>
            </Link>
          ))}
        </nav>

        <AskAiFab />
      </div>
    </ActiveCompanyProvider>
  );
}

function SidebarLink({ to, icon: Icon, label }: { to: string; icon: typeof Mic; label: string }) {
  return (
    <Link
      to={to}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors",
        "hover:bg-secondary hover:text-foreground",
      )}
      activeProps={{ className: "bg-accent text-primary" }}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </Link>
  );
}
