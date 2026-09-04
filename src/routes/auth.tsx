import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Mic, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/auth")({
  ssr: false,
  component: AuthPage,
});

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
  if (/already registered|user already/i.test(msg)) return "Este e-mail já possui cadastro.";
  return msg || "Erro ao autenticar";
}

export function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/empresas" });
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

  async function onSignUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: `${window.location.origin}/auth`,
        },
      });
      if (error) throw error;
      toast.success("Cadastro enviado! Aguarde a aprovação do administrador.");
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

        <Tabs defaultValue="entrar">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="entrar">Entrar</TabsTrigger>
            <TabsTrigger value="cadastrar">Solicitar acesso</TabsTrigger>
          </TabsList>

          <TabsContent value="entrar">
            <form onSubmit={onSubmit} className="space-y-4 pt-4">
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
          </TabsContent>

          <TabsContent value="cadastrar">
            <form onSubmit={onSignUp} className="space-y-4 pt-4">
              <div>
                <Label htmlFor="name">Nome completo</Label>
                <Input
                  id="name" required value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-1.5 h-12"
                />
              </div>
              <div>
                <Label htmlFor="email2">E-mail</Label>
                <Input
                  id="email2" type="email" required autoComplete="email"
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  className="mt-1.5 h-12"
                />
              </div>
              <div>
                <Label htmlFor="password2">Senha</Label>
                <Input
                  id="password2" type="password" required minLength={6}
                  autoComplete="new-password"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  className="mt-1.5 h-12"
                />
              </div>
              <Button type="submit" disabled={loading} className="h-12 w-full text-base font-medium">
                {loading ? "Aguarde..." : "Solicitar acesso"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <div className="mt-6 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            O acesso é liberado somente após aprovação do administrador, que define a empresa e as
            ferramentas permitidas.
          </span>
        </div>
      </Card>
    </div>
  );
}

export default AuthPage;
