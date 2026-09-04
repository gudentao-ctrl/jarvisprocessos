import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Hourglass } from "lucide-react";

export const Route = createFileRoute("/acesso-pendente")({
  ssr: false,
  component: PendingAccessPage,
  head: () => ({
    meta: [
      { title: "Acesso pendente — JARVIS" },
      { name: "description", content: "Sua solicitação de acesso ao JARVIS aguarda aprovação do administrador." },
      { property: "og:title", content: "Acesso pendente — JARVIS" },
      { property: "og:description", content: "Solicitação de acesso ao JARVIS aguardando aprovação." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

function PendingAccessPage() {
  const navigate = useNavigate();
  const [company, setCompany] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) navigate({ to: "/auth" });
      else setEmail(data.user.email ?? null);
    });
  }, [navigate]);

  async function send() {
    setSending(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) throw new Error("Sessão expirada");
      const { error } = await supabase.from("access_requests").insert({
        user_id: user.id,
        email: user.email ?? null,
        full_name: (user.user_metadata as any)?.full_name ?? "",
        requested_company: company,
        message,
      });
      if (error) throw error;
      toast.success("Solicitação enviada. Você será avisado após a aprovação.");
      setCompany("");
      setMessage("");
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao enviar solicitação");
    } finally {
      setSending(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-10">
      <Card className="w-full max-w-md p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary">
            <Hourglass className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-xl font-bold">Acesso aguardando aprovação</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {email ? `${email} · ` : ""}O administrador precisa liberar sua empresa e suas ferramentas.
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <Label>Empresa que você atende</Label>
            <Input className="mt-1.5 h-11" value={company} onChange={(e) => setCompany(e.target.value)} />
          </div>
          <div>
            <Label>Mensagem (opcional)</Label>
            <Textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>
          <Button className="h-11 w-full" onClick={send} disabled={sending}>
            {sending ? "Enviando…" : "Enviar solicitação"}
          </Button>
          <Button variant="ghost" className="w-full" onClick={signOut}>
            Sair
          </Button>
        </div>
      </Card>
    </div>
  );
}
