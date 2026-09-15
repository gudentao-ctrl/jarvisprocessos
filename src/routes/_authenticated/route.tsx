import { createFileRoute, Outlet, redirect, Link, useRouter, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Mic, Building2, Clock, CalendarDays, FileBarChart2, Radar, ShieldCheck, Wallet, Handshake,
  LifeBuoy, Menu,
} from "lucide-react";


import { cn } from "@/lib/utils";
import { ActiveCompanyProvider } from "@/lib/active-company";
import { CompanySwitcher } from "@/components/CompanySwitcher";
import { AskAiFab } from "@/components/AskAiFab";
import { getMe } from "@/lib/access.functions";
import { permissionForPath } from "@/lib/access-control";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });

    const { data: profile } = await supabase
      .from("profiles")
      .select("status, is_superadmin")
      .eq("user_id", data.user.id)
      .maybeSingle();

    if (!profile || (profile.status !== "active" && !profile.is_superadmin)) {
      throw redirect({ to: "/acesso-pendente" });
    }
    if (location.pathname.startsWith("/admin") && !profile.is_superadmin) {
      throw redirect({ to: "/acesso-pendente" });
    }
    const requiredPermission = permissionForPath(location.pathname);
    if (requiredPermission && !profile.is_superadmin) {
      const { data: memberships } = await supabase
        .from("company_members")
        .select("permissions")
        .eq("user_id", data.user.id);
      const allowed = location.pathname.startsWith("/fase/")
        ? (memberships ?? []).some((membership: any) =>
            ["gestao", "pop", "indicadores", "horas"].some((key) => membership.permissions?.[key] === true))
        : (memberships ?? []).some((membership: any) => membership.permissions?.[requiredPermission] === true);
      if (!allowed) throw redirect({ to: "/acesso-pendente" });
    }
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

const NAV = [
  { to: "/empresas", icon: Building2, label: "Empresas", permission: "gestao" },
  { to: "/controle", icon: Radar, label: "Controle", permission: "gestao" },
  { to: "/calendario", icon: CalendarDays, label: "Agenda", permission: "gestao" },
  { to: "/horas", icon: Clock, label: "Horas", permission: "horas" },
  { to: "/financeiro", icon: Wallet, label: "Financeiro", permission: "financeiro" },
  { to: "/crm", icon: Handshake, label: "CRM", permission: "crm" },
  { to: "/relatorios", icon: FileBarChart2, label: "Relatórios", permission: "gestao" },
  { to: "/chamados", icon: LifeBuoy, label: "Chamados", permission: "chamados" },
] as const;




function AuthenticatedLayout() {
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const HIDE_COMPANY_SWITCHER = ["/admin", "/calendario", "/crm", "/horas", "/financeiro"];
  const showSwitcher = !HIDE_COMPANY_SWITCHER.some((p) => pathname.startsWith(p));
  const me = useServerFn(getMe);
  const { data: profile } = useQuery({ queryKey: ["me"], queryFn: () => me() });
  const hasPermission = (permission: string) =>
    !!profile?.isSuperadmin ||
    !!profile?.memberships.some((membership) => membership.permissions?.[permission] === true);
  const visibleNav = NAV.filter((item) => hasPermission(item.permission));
  const mobileShortcuts = visibleNav.slice(0, 5);

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
            {visibleNav.map((n) => (
              <SidebarLink key={n.to} {...n} />
            ))}
            {profile?.isSuperadmin && (
              <SidebarLink to="/admin" icon={ShieldCheck} label="SuperAdmin" />
            )}
          </nav>
        </aside>


        {/* Content area */}
        <div className="flex min-w-0 flex-1 flex-col lg:ml-60">
          {/* Topbar with company switcher */}
          <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur">
            <div className="flex items-center gap-2 lg:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <Button size="icon" variant="ghost" aria-label="Abrir menu">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 p-0">
                  <SheetHeader className="border-b px-4 py-4 text-left">
                    <SheetTitle className="flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                        <Mic className="h-4 w-4" />
                      </span>
                      JARVIS
                    </SheetTitle>
                  </SheetHeader>
                  <nav className="space-y-1 p-3">
                    {visibleNav.map((item) => (
                      <SheetClose key={item.to} asChild>
                        <Link
                          to={item.to}
                          className="flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
                          activeProps={{ className: "bg-accent text-primary" }}
                        >
                          <item.icon className="h-5 w-5" />
                          <span>{item.label}</span>
                        </Link>
                      </SheetClose>
                    ))}
                    {profile?.isSuperadmin && (
                      <SheetClose asChild>
                        <Link
                          to="/admin"
                          className="flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
                          activeProps={{ className: "bg-accent text-primary" }}
                        >
                          <ShieldCheck className="h-5 w-5" />
                          <span>SuperAdmin</span>
                        </Link>
                      </SheetClose>
                    )}
                  </nav>
                </SheetContent>
              </Sheet>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Mic className="h-4 w-4" />
              </div>
              <span className="text-base font-bold tracking-tight">JARVIS</span>
            </div>
            {showSwitcher && (
              <div className="ml-auto">
                <CompanySwitcher />
              </div>
            )}
          </header>

          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-6xl px-4 py-4 pb-24 sm:py-6 lg:pb-6">
              <Outlet />
            </div>
          </main>
        </div>

        {/* Bottom nav mobile */}
        <nav
          className="fixed inset-x-0 bottom-0 z-40 flex border-t bg-background/95 backdrop-blur lg:hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          {mobileShortcuts.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="flex min-h-[60px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium text-muted-foreground transition-colors active:bg-secondary"
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
