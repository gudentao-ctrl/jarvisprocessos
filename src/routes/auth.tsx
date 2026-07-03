import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Mic, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/auth")({
  ssr: false,
  component: AuthPage,
});

const ALLOWED_EMAIL = "g_zamboni@hotmail.com";

function isNetworkError(err: unknown): boolean {
  if (!err) return false;
  const msg = (err as { message?: string })?.message ?? String(err);
  return /load failed|failed to fetch|network|networkerror|timeout/i.test(msg);
}

function friendlyAuthError(err: unknown): string {
  const msg = (err as { message?: string })?.message ?? String(err);
  if (isNetworkError(err)) return "Falha de conexão. Verifique sua internet.";
  if (/invalid login credentials/i.test(msg)) return "E-mail ou senha incorretos.";
  if (/email not confirmed/i.test(msg)) return "Confirme seu e-mail antes de entrar.";
  return msg || "Erro ao autenticar";
}

export function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email?.toLowerCase() === ALLOWED_EMAIL) {
        navigate({ to: "/empresas" });
      }
    });
  }, [navigate]);

  async function signInWithRetry() {
    try {
      const res = await supabase.auth.signInWithPassword({ email, password });
      if (res.error && isNetworkError(res.error)) throw res.error;
      return res;
    } catch (err) {
      if (!isNetworkError(err)) throw err;
      await new Promise((r) => setTimeout(r, 800));
      return supabase.auth.signInWithPassword({ email, password });
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (email.trim().toLowerCase() !== ALLOWED_EMAIL) {
      toast.error("Acesso restrito. Apenas o consultor autorizado pode entrar.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await signInWithRetry();
      if (error) throw error;
      navigate({ to: "/empresas" });
    } catch (err) {
      toast.error(friendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <Card className="w-full max-w-md p-8">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <Mic className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight">JARVIS</h1>
          <p className="mt-1 text-sm text-muted-foreground">Consultoria Operacional</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email" type="email" required autoComplete="email"
              value={email} onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 h-12"
            />
          </div>
          <div>
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password" type="password" required minLength={6}
              autoComplete="current-password"
              value={password} onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 h-12"
            />
          </div>
          <Button type="submit" disabled={loading} className="h-12 w-full text-base font-medium">
            {loading ? "Aguarde..." : "Entrar"}
          </Button>
        </form>

        <div className="mt-6 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Sistema privado. Criação de novos usuários bloqueada — apenas o consultor autorizado pode acessar.
          </span>
        </div>
      </Card>
    </div>
  );
}

export default AuthPage;
