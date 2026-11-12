import {
  createFileRoute,
  Outlet,
  redirect,
  Link,
  useRouter,
  useRouterState,
} from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Mic,
  Building2,
  Clock,
  CalendarDays,
  FileBarChart2,
  Radar,
  ShieldCheck,
  Wallet,
  Handshake,
  LifeBuoy,
  Menu,
  User,
  Users,
  Landmark,
  Map,
  Sparkles,
  Globe,
  LogOut,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { ActiveCompanyProvider, useActiveCompany } from "@/lib/active-company";
import { useLiveSync } from "@/lib/live-sync";
import { usePermissions } from "@/hooks/usePermissions";
import { toolsForPath } from "@/lib/permission-catalog";
import { CompanySwitcher } from "@/components/CompanySwitcher";
import { NotificationBell } from "@/components/NotificationBell";
import { signOutIfSessionExpired } from "@/lib/session-guard";
import { AskAiFab } from "@/components/AskAiFab";
import { getMe } from "@/lib/access.functions";
import { permissionForPath } from "@/lib/access-control";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    // Candidate assessment portal is accessible via link without consultant login
    if (location.pathname.startsWith("/pessoas/assessment/portal")) {
      return {};
    }

    if (await signOutIfSessionExpired()) {
      throw redirect({ to: "/auth", search: { redirect: location.href, expirou: true } });
    }
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth", search: { redirect: undefined } });

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
            ["gestao", "pop", "indicadores", "horas"].some(
              (key) => membership.permissions?.[key] === true,
            ),
          )
        : (memberships ?? []).some((membership: any) => {
            const perms = membership.permissions;
            if (perms?.[requiredPermission] === true) return true;
            if (perms?.categories?.[requiredPermission] === true) return true;
            if (requiredPermission === "mapa" && (perms?.gestao === true || perms?.sub_modules?.mapa_estrategico === true)) return true;
            if (requiredPermission === "portal" && (perms?.portal === true || perms?.categories?.portal === true || perms?.sub_modules?.portal_empresa === true || perms?.sub_modules?.portal_resultados === true)) return true;
            if (location.pathname.startsWith("/melhorias/5s") && (perms?.sub_modules?.hub_5s === true || perms?.hub_5s === true)) return true;
            return false;
          });
      if (!allowed) throw redirect({ to: "/acesso-pendente" });
    }
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

const NAV = [
  { to: "/empresas", icon: Building2, label: "Empresas", permission: "gestao" },
  { to: "/mapa", icon: Map, label: "Mapa", permission: "mapa" },
  { to: "/portal", icon: Globe, label: "Portal", permission: "portal" },
  { to: "/controle", icon: Radar, label: "Controle", permission: "gestao" },
  { to: "/calendario", icon: CalendarDays, label: "Agenda", permission: "gestao" },
  { to: "/pessoas/dashboard", icon: Users, label: "Pessoas", permission: "gestao" },
  { to: "/melhorias/5s", icon: Sparkles, label: "HUB 5S", permission: "gestao" },
  { to: "/horas", icon: Clock, label: "Horas", permission: "horas" },
  { to: "/financeiro", icon: Wallet, label: "Financeiro Cliente", permission: "financeiro" },
  { to: "/financeiro-maia", icon: Landmark, label: "Financeiro Maia", permission: "financeiro" },
  { to: "/crm", icon: Handshake, label: "CRM", permission: "crm" },
  { to: "/relatorios", icon: FileBarChart2, label: "Relatórios", permission: "gestao" },
  { to: "/chamados", icon: LifeBuoy, label: "Chamados", permission: "chamados" },
] as const;

function AuthenticatedLayout() {
  return <ActiveCompanyProvider><AuthenticatedShell /></ActiveCompanyProvider>;
}

function AuthenticatedShell() {
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // Gate the screen actually rendered by <Outlet />; during a transition it is still the previous page.
  const gatePath = useRouterState({ select: (s) => s.resolvedLocation?.pathname ?? s.location.pathname });
  const HIDE_COMPANY_SWITCHER = [
    "/admin",
    "/calendario",
    "/crm",
    "/horas",
    "/financeiro",
    "/financeiro-maia",
    "/perfil",
    "/google-callback",
  ];
  const showSwitcher = !HIDE_COMPANY_SWITCHER.some((p) => pathname.startsWith(p));
  const me = useServerFn(getMe);
  const { data: profile } = useQuery({ queryKey: ["me"], queryFn: () => me() });
  const { hasAccess, canAccessPath, isPending: permissionsPending } = usePermissions();
  const { companies: liveCompanies, companyId: liveCompanyId } = useActiveCompany();
  useLiveSync(
    liveCompanies.map((c) => c.id),
    liveCompanyId,
  );
  const hasPermission = (permission: string) => hasAccess(permission);
  const isManagerOrAdmin =
    !!profile?.isSuperadmin ||
    !!profile?.memberships.some((m: any) => m.role === "gestor" || m.permissions?.gestao === true);

  const visibleNav = NAV.filter((item) => canAccessPath(item.to));
  const mobileShortcuts = visibleNav.slice(0, 5);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") router.invalidate();
    });
    return () => sub.subscription.unsubscribe();
  }, [router]);

  // Ask for the password again once the sign-in is 24 hours old, even if the app stays open.
  useEffect(() => {
    let busy = false;
    const check = async () => {
      if (busy) return;
      busy = true;
      try {
        if (await signOutIfSessionExpired()) {
          router.navigate({ to: "/auth", search: { expirou: true }, replace: true });
        }
      } finally {
        busy = false;
      }
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    const timer = setInterval(check, 60_000);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router]);

  return (
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
          <div className="border-t p-2 flex items-center justify-between gap-1">
            <div className="min-w-0 flex-1">
              <SidebarLink to="/perfil" icon={User} label="Meu Perfil" />
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
              title="Deslogar do perfil"
              onClick={async () => {
                await supabase.auth.signOut();
                router.navigate({ to: "/auth", replace: true });
              }}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </aside>

        {/* Content area */}
        <div className="flex min-w-0 flex-1 flex-col lg:ml-60">
          {/* Topbar with company switcher */}
          <header
            className="sticky top-0 z-20 flex min-h-14 items-center gap-2 sm:gap-3 border-b bg-background/95 px-3 sm:px-4 backdrop-blur transition-all"
            style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
          >
            <div className="flex items-center gap-2 lg:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-10 w-10 shrink-0 touch-manipulation active:scale-95"
                    aria-label="Abrir menu"
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="left"
                  className="w-[85vw] max-w-xs p-0 sm:max-w-sm flex flex-col h-full"
                  style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
                >
                  <SheetHeader className="border-b px-4 py-4 text-left">
                    <SheetTitle className="flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                        <Mic className="h-4 w-4" />
                      </span>
                      JARVIS
                    </SheetTitle>
                  </SheetHeader>
                  <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
                    {visibleNav.map((item) => (
                      <SheetClose key={item.to} asChild>
                        <Link
                          to={item.to}
                          className="flex min-h-[44px] items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground active:scale-[0.98] active:bg-secondary touch-manipulation"
                          activeProps={{ className: "bg-accent text-primary font-semibold" }}
                        >
                          <item.icon className="h-5 w-5 shrink-0" />
                          <span>{item.label}</span>
                        </Link>
                      </SheetClose>
                    ))}
                    {profile?.isSuperadmin && (
                      <SheetClose asChild>
                        <Link
                          to="/admin"
                          className="flex min-h-[44px] items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground active:scale-[0.98] active:bg-secondary touch-manipulation"
                          activeProps={{ className: "bg-accent text-primary font-semibold" }}
                        >
                          <ShieldCheck className="h-5 w-5 shrink-0" />
                          <span>SuperAdmin</span>
                        </Link>
                      </SheetClose>
                    )}
                    <div className="flex items-center gap-1">
                      <div className="min-w-0 flex-1">
                        <SheetClose asChild>
                          <Link
                            to="/perfil"
                            className="flex min-h-[44px] items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground active:scale-[0.98] active:bg-secondary touch-manipulation"
                            activeProps={{ className: "bg-accent text-primary font-semibold" }}
                          >
                            <User className="h-5 w-5 shrink-0" />
                            <span>Meu Perfil</span>
                          </Link>
                        </SheetClose>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                        title="Deslogar do perfil"
                        onClick={async () => {
                          await supabase.auth.signOut();
                          router.navigate({ to: "/auth", replace: true });
                        }}
                      >
                        <LogOut className="h-5 w-5" />
                      </Button>
                    </div>
                  </nav>
                </SheetContent>
              </Sheet>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Mic className="h-4 w-4" />
              </div>
              <span className="text-base font-bold tracking-tight">JARVIS</span>
            </div>
            <div className="ml-auto flex min-w-0 items-center gap-1">
              {showSwitcher && (
                <div className="min-w-0 max-w-[150px] sm:max-w-none">
                  <CompanySwitcher />
                </div>
              )}
              <NotificationBell />
            </div>
          </header>

          <main className="flex-1 overflow-y-auto overscroll-contain">
            <div className="mx-auto w-full max-w-6xl px-3 py-3 sm:px-4 sm:py-6 pb-28 sm:pb-24 lg:pb-8">
              {permissionsPending ? <p className="py-8 text-muted-foreground">Verificando acessos…</p> : gatePath.startsWith("/admin") ? (profile?.isSuperadmin ? <Outlet /> : <p role="alert">Área exclusiva do SuperAdmin.</p>) : toolsForPath(gatePath).length > 0 && !canAccessPath(gatePath) ? <p role="alert" className="py-8">Acesso não liberado para esta ferramenta na empresa selecionada.</p> : <Outlet />}
            </div>
          </main>
        </div>

        {/* Bottom nav mobile */}
        <nav
          className="fixed inset-x-0 bottom-0 z-40 flex border-t bg-background/95 backdrop-blur lg:hidden shadow-[0_-2px_10px_rgba(0,0,0,0.06)]"
          style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        >
          {mobileShortcuts.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="flex min-h-[58px] min-w-0 flex-1 flex-col items-center justify-center gap-1 py-1.5 text-[11px] font-medium text-muted-foreground transition-all active:scale-95 active:bg-secondary/60 touch-manipulation"
              activeProps={{ className: "text-primary font-semibold" }}
            >
              <n.icon className="h-5 w-5 shrink-0" />
              <span className="truncate max-w-full px-1">{n.label}</span>
            </Link>
          ))}
        </nav>

        <AskAiFab />
      </div>
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
