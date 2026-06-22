import { createFileRoute, Outlet, redirect, Link, useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Mic, Building2, LogOut, Menu, X, LayoutDashboard, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
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
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") router.invalidate();
    });
    return () => sub.subscription.unsubscribe();
  }, [router]);

  async function signOut() {
    await supabase.auth.signOut();
    router.navigate({ to: "/auth" });
  }

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex w-60 flex-col fixed inset-y-0 left-0 border-r bg-background z-30">
        <div className="h-14 flex items-center gap-2 px-4 border-b">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Mic className="h-4 w-4" />
          </div>
          <span className="text-base font-bold tracking-tight">JARVIS</span>
        </div>
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
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

      {/* Mobile drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/40" onClick={() => setOpen(false)}>
          <aside
            className="absolute inset-y-0 left-0 w-64 bg-background border-r flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-14 flex items-center justify-between gap-2 px-4 border-b">
              <span className="text-base font-bold">JARVIS</span>
              <button onClick={() => setOpen(false)} className="p-1"><X className="h-4 w-4" /></button>
            </div>
            <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5" onClick={() => setOpen(false)}>
              {NAV.map((n) => <SidebarLink key={n.to} {...n} />)}
            </nav>
            <button onClick={signOut} className="m-2 flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-secondary">
              <LogOut className="h-4 w-4" /> Sair
            </button>
          </aside>
        </div>
      )}

      {/* Content area */}
      <div className="flex-1 flex flex-col lg:ml-60 min-w-0">
        <header className="sticky top-0 z-20 h-14 border-b bg-background/95 backdrop-blur flex items-center px-4 gap-3">
          <button className="lg:hidden p-1.5 -ml-1.5 rounded hover:bg-secondary" onClick={() => setOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <div className="lg:hidden flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Mic className="h-3.5 w-3.5" />
            </div>
            <span className="font-bold tracking-tight">JARVIS</span>
          </div>
          <div className="ml-auto" />
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-6xl px-4 py-6">
            <Outlet />
          </div>
        </main>
      </div>
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
