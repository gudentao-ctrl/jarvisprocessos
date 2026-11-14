import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ArrowLeft, Clock, KeyRound, MailCheck, Mic, ShieldAlert } from "lucide-react";
import { PasswordInput } from "@/components/PasswordInput";
import { signOutIfSessionExpired } from "@/lib/session-guard";

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): { redirect?: string; expirou?: boolean; recovery?: boolean } => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
    expirou: search.expirou === true || search.expirou === "1" || search.expirou === 1 ? true : undefined,
    recovery: search.recovery === true || search.recovery === "1" || search.recovery === "true" ? true : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Entrar | JARVIS" },
      { name: "description", content: "Acesso seguro à plataforma JARVIS." },
      { property: "og:title", content: "Entrar | JARVIS" },
      { property: "og:description", content: "Acesso seguro à plataforma JARVIS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function safeRedirect(value: string | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/empresas";
  return value;
}

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

function AuthPage() {
  const navigate = useNavigate();
  const { redirect, expirou, recovery } = Route.useSearch();
  const destination = safeRedirect(redirect);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [cpf, setCpf] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [loading, setLoading] = useState(false);

  // Estados para redefinição de senha e esqueci minha senha
  const [isRecovery, setIsRecovery] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [tab, setTab] = useState("entrar");
  const [signupDoneEmail, setSignupDoneEmail] = useState<string | null>(null);
  const [forgotSentEmail, setForgotSentEmail] = useState<string | null>(null);

  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    const isRecoveryHash = hash.includes("type=recovery") || (hash.includes("access_token") && hash.includes("type=recovery"));
    const shouldRecover = !!recovery || isRecoveryHash;

    if (shouldRecover) {
      setIsRecovery(true);
    }

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
      }
    });

    void (async () => {
      if (await signOutIfSessionExpired()) return;
      if (!shouldRecover) {
        const { data } = await supabase.auth.getUser();
        if (data.user) {
          navigate({ href: destination });
        }
      }
    })();

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, [destination, navigate, recovery]);

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
      navigate({ href: destination });
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
      const cpfDigits = cpf.replace(/\D/g, "");
      const whatsappDigits = whatsapp.replace(/\D/g, "");
      if (cpfDigits.length !== 11) throw new Error("Informe um CPF válido com 11 números.");
      if (whatsappDigits.length < 10 || whatsappDigits.length > 13)
        throw new Error("Informe um WhatsApp válido.");
      const { data: signUpData, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            cpf: cpfDigits,
            birth_date: birthDate,
            whatsapp: whatsappDigits,
          },
          emailRedirectTo: `${window.location.origin}/auth`,
        },
      });
      if (error) throw error;
      if (signUpData.user && (signUpData.user.identities?.length ?? 0) === 0) {
        throw new Error("Este e-mail já possui cadastro.");
      }
      if (signUpData.session) await supabase.auth.signOut();
      setSignupDoneEmail(email);
      setPassword("");
      setFullName("");
      setCpf("");
      setBirthDate("");
      setWhatsapp("");
      toast.success("Cadastro concluído! Confirme seu e-mail para ativar a conta.");
    } catch (err) {
      toast.error(friendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  async function onResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error("A nova senha deve ter no mínimo 6 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      toast.success("Nova senha cadastrada com sucesso!");
      setIsRecovery(false);
      navigate({ href: destination });
    } catch (err) {
      toast.error(friendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  async function onForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!forgotEmail) {
      toast.error("Informe seu e-mail cadastrado.");
      return;
    }
    setForgotLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/auth?recovery=true`,
      });
      if (error) throw error;
      toast.success("Link para cadastrar nova senha enviado para seu e-mail.");
      setForgotSentEmail(forgotEmail);
    } catch (err) {
      toast.error(friendlyAuthError(err));
    } finally {
      setForgotLoading(false);
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

        {expirou && !isRecovery && (
          <div
            role="status"
            className="mb-4 flex items-start gap-2 rounded-lg border bg-secondary p-3 text-xs text-secondary-foreground"
          >
            <Clock className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Por segurança, sua sessão termina 24 horas após o login. Entre novamente.</span>
          </div>
        )}

        {signupDoneEmail && !isRecovery ? (
          <div role="status" className="space-y-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <MailCheck className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold">Cadastro concluído!</h2>
            <p className="text-sm text-muted-foreground">
              Enviamos um e-mail de confirmação para <strong className="text-foreground">{signupDoneEmail}</strong>.
              Abra a mensagem e clique no link para ativar sua conta. Depois disso, faça seu primeiro acesso pela tela de login.
            </p>
            <p className="text-xs text-muted-foreground">Não encontrou? Verifique também a caixa de spam.</p>
            <Button
              className="h-12 w-full"
              onClick={() => {
                setSignupDoneEmail(null);
                setTab("entrar");
              }}
            >
              Ir para o login
            </Button>
          </div>
        ) : forgotSentEmail && !isRecovery ? (
          <div role="status" className="space-y-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <MailCheck className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold">Verifique seu e-mail</h2>
            <p className="text-sm text-muted-foreground">
              Se <strong className="text-foreground">{forgotSentEmail}</strong> estiver cadastrado, você receberá um link para
              cadastrar uma nova senha. Abra o e-mail e clique no link.
            </p>
            <p className="text-xs text-muted-foreground">Não encontrou? Verifique também a caixa de spam.</p>
            <Button
              className="h-12 w-full"
              onClick={() => {
                setForgotSentEmail(null);
                setShowForgot(false);
                setTab("entrar");
              }}
            >
              Voltar para o login
            </Button>
          </div>
        ) : isRecovery ? (
          <div className="space-y-4">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary mb-2">
                <KeyRound className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-bold">Cadastrar nova senha</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Defina sua nova senha para acessar o JARVIS.
              </p>
            </div>

            <form onSubmit={onResetPassword} className="space-y-4 pt-2">
              <div>
                <Label htmlFor="new-password">Nova senha</Label>
                <PasswordInput
                  id="new-password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="mt-1.5 h-12"
                  placeholder="Mínimo 6 caracteres"
                />
              </div>

              <div>
                <Label htmlFor="confirm-password">Confirme a nova senha</Label>
                <PasswordInput
                  id="confirm-password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1.5 h-12"
                  placeholder="Repita a nova senha"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="h-12 w-full text-base font-medium"
              >
                {loading ? "Salvando nova senha..." : "Salvar nova senha e entrar"}
              </Button>
            </form>
          </div>
        ) : showForgot ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                onClick={() => setShowForgot(false)}
              >
                <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
              </Button>
            </div>
            <div>
              <h2 className="text-lg font-bold">Recuperar senha</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Digite seu e-mail cadastrado para receber o link de redefinição de senha.
              </p>
            </div>

            <form onSubmit={onForgotPassword} className="space-y-4 pt-1">
              <div>
                <Label htmlFor="forgot-email">E-mail</Label>
                <Input
                  id="forgot-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="mt-1.5 h-12"
                  placeholder="seu@email.com"
                />
              </div>

              <Button
                type="submit"
                disabled={forgotLoading}
                className="h-12 w-full text-base font-medium"
              >
                {forgotLoading ? "Enviando..." : "Enviar link de recuperação"}
              </Button>
            </form>
          </div>
        ) : (
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="entrar">Entrar</TabsTrigger>
              <TabsTrigger value="cadastrar">Solicitar acesso</TabsTrigger>
            </TabsList>

            <TabsContent value="entrar">
              <form onSubmit={onSubmit} className="space-y-4 pt-4">
                <div>
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1.5 h-12"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Senha</Label>
                    <button
                      type="button"
                      onClick={() => {
                        setForgotEmail(email);
                        setShowForgot(true);
                      }}
                      className="text-xs text-primary hover:underline"
                    >
                      Esqueceu a senha?
                    </button>
                  </div>
                  <PasswordInput
                    id="password"
                    required
                    minLength={6}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1.5 h-12"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="h-12 w-full text-base font-medium"
                >
                  {loading ? "Aguarde..." : "Entrar"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="cadastrar">
              <form onSubmit={onSignUp} className="space-y-4 pt-4">
                <div>
                  <Label htmlFor="name">Nome completo</Label>
                  <Input
                    id="name"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="mt-1.5 h-12"
                  />
                </div>
                <div>
                  <Label htmlFor="email2">E-mail</Label>
                  <Input
                    id="email2"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1.5 h-12"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="cpf">CPF</Label>
                    <Input
                      id="cpf"
                      required
                      inputMode="numeric"
                      maxLength={14}
                      value={cpf}
                      onChange={(e) => setCpf(e.target.value)}
                      className="mt-1.5 h-12"
                    />
                  </div>
                  <div>
                    <Label htmlFor="birth-date">Data de nascimento</Label>
                    <Input
                      id="birth-date"
                      type="date"
                      required
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="mt-1.5 h-12"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="whatsapp">WhatsApp</Label>
                  <Input
                    id="whatsapp"
                    required
                    inputMode="tel"
                    maxLength={16}
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    className="mt-1.5 h-12"
                  />
                </div>
                <div>
                  <Label htmlFor="password2">Senha</Label>
                  <PasswordInput
                    id="password2"
                    required
                    minLength={6}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1.5 h-12"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="h-12 w-full text-base font-medium"
                >
                  {loading ? "Aguarde..." : "Solicitar acesso"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        )}

        <div className="mt-6 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>Novos acessos são liberados somente após aprovação do administrador.</span>
        </div>
      </Card>
    </div>
  );
}
