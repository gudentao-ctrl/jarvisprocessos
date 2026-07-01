import { createFileRoute, Outlet, redirect, Link, useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Mic, Building2, LogOut, LayoutDashboard, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    let { data } = await supabase.auth.getUser();
    if (!data.user) {
      // Sem login: cria sessão anônima automaticamente
      const { error: anonErr } = await supabase.auth.signInAnonymously();
      if (anonErr) {
        console.error("[auth] anon sign-in failed", anonErr);
        throw redirect({ to: "/auth" });
      }
      ({ data } = await supabase.auth.getUser());
    }
    return { user: data.user };
  },
  component: AuthenticatedLayout,
});

const NAV = [
  { to: "/empresas", icon: Building2, label: "Empresas" },
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/projetos", icon: Briefcase, label: "Projetos" },
] as const;

function AuthenticatedLayout() {
  const router = useRouter();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") router.invalidate();
    });
    return () => sub.subscription.unsubscribe();
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
          {NAV.map((n) => (
            <SidebarLink key={n.to} {...n} />
          ))}
        </nav>
        <button
          onClick={signOut}
          className="m-2 flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <LogOut className="h-4 w-4" /> Sair
        </button>
      </aside>

      {/* Content area */}
      <div className="flex min-w-0 flex-1 flex-col lg:ml-60">
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur">
          <div className="flex items-center gap-2 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Mic className="h-4 w-4" />
            </div>
            <span className="text-base font-bold tracking-tight">JARVIS</span>
          </div>
          <div className="ml-auto" />
          <button
            onClick={signOut}
            className="rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground lg:hidden"
            aria-label="Sair"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-6xl px-4 py-4 pb-24 sm:py-6 lg:pb-6">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Bottom nav mobile */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t bg-background/95 backdrop-blur lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {NAV.map((n) => (
          <Link
            key={n.to}
            to={n.to}
            className="flex min-h-[60px] flex-col items-center justify-center gap-1 py-2 text-xs font-medium text-muted-foreground transition-colors active:bg-secondary"
            activeProps={{ className: "text-primary" }}
          >
            <n.icon className="h-5 w-5" />
            <span>{n.label}</span>
          </Link>
        ))}
      </nav>
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
