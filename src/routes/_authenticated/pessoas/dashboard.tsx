import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LIVE_SYNC_EVENT } from "@/lib/live-sync";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserCheck, Mic, Award, AlertCircle, ArrowRight, Users, Plus, Briefcase, Smile, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyFilter } from "@/hooks/useCompanyFilter";
import { getMentoradosList } from "@/lib/mentoria-storage";
import { getCandidaturasFunil } from "@/lib/recrutamento-storage";
import { getPesquisas } from "@/lib/nps-storage";

export const Route = createFileRoute("/_authenticated/pessoas/dashboard")({
  head: () => ({ meta: [
    { title: "Hub de Pessoas | Jarvis Processos" },
    { name: "description", content: "Acompanhe avaliações, recrutamento, mentorias e pesquisas da sua empresa." },
    { property: "og:title", content: "Hub de Pessoas | Jarvis Processos" },
    { property: "og:description", content: "Avaliações, recrutamento, mentorias e pesquisas protegidas por acesso empresarial." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: PessoasDashboard,
});

function PessoasDashboard() {
  const navigate = useNavigate();
  const { companyId, company } = useCompanyFilter();
  const [summary, setSummary] = useState({ colaboradores: 0, recrutamento: 0, mentorias: 0, npsCount: 0, alertas: 1 });
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [liveTick, setLiveTick] = useState(0);

  // Refresh when another device saves changes.
  useEffect(() => {
    const refresh = () => setLiveTick((n) => n + 1);
    window.addEventListener(LIVE_SYNC_EVENT, refresh);
    return () => window.removeEventListener(LIVE_SYNC_EVENT, refresh);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadSummary() {
      if (liveTick === 0) setLoading(true);
      setUnavailable(false);
      let candQuery = supabase.from("candidates").select("id", { count: "exact", head: true });
      if (companyId) candQuery = candQuery.eq("company_id", companyId);
      const [candidates, mentors, applications, surveys] = await Promise.allSettled([
        candQuery,
        getMentoradosList(companyId),
        getCandidaturasFunil(null, companyId),
        getPesquisas(companyId),
      ]);
      if (cancelled) return;
      const candidateOk = candidates.status === "fulfilled" && !candidates.value.error && typeof candidates.value.count === "number";
      setUnavailable(!candidateOk || mentors.status === "rejected" || applications.status === "rejected" || surveys.status === "rejected");
      setSummary({
        colaboradores: candidateOk && candidates.status === "fulfilled" ? candidates.value.count ?? 0 : 0,
        mentorias: mentors.status === "fulfilled" ? mentors.value.filter((m) => m.status === "ativa").length : 0,
        recrutamento: applications.status === "fulfilled" ? applications.value.filter((c) => c.status === "ATIVO").length : 0,
        npsCount: surveys.status === "fulfilled" ? surveys.value.length : 0,
        alertas: 0,
      });
      setLoading(false);
    }
    void loadSummary();
    return () => { cancelled = true; };
  }, [companyId, liveTick]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Hub de Pessoas & Cultura</h1>
        <p className="text-sm text-muted-foreground">
          {company
            ? `Gestão de perfis, recrutamento ATS, mentorias e pesquisas NPS para ${company.name}`
            : "Gestão integrada de perfis comportamentais, funil de recrutamento (ATS), mentorias e pesquisas de satisfação"}
        </p>
      </div>

      {/* Quick‑access cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <Card
          className="p-6 flex flex-col justify-between hover:shadow-md hover:border-primary/50 transition-all cursor-pointer group"
          onClick={() => navigate({ to: "/pessoas/assessment" })}
        >
          <div className="space-y-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center group-hover:scale-105 transition-transform">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-base">Análise de Perfil (Assessment)</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Envio de testes comportamentais via WhatsApp, mapa de radar e dossiês de perfil.
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs font-medium text-primary">
            Acessar assessments{" "}
            <ArrowRight className="h-3.5 w-3.5 ml-1 transition-transform group-hover:translate-x-1" />
          </div>
        </Card>

        <Card
          className="p-6 flex flex-col justify-between hover:shadow-md hover:border-primary/50 transition-all cursor-pointer group"
          onClick={() => navigate({ to: "/pessoas/recrutamento" })}
        >
          <div className="space-y-3">
            <div className="h-10 w-10 rounded-lg bg-sky-500/10 text-sky-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-base">Recrutamento & Seleção (ATS)</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Funil Kanban de 7 etapas, triagem com match automático, split-screen e propostas em PDF.
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs font-medium text-sky-600">
            Acessar funil ATS{" "}
            <ArrowRight className="h-3.5 w-3.5 ml-1 transition-transform group-hover:translate-x-1" />
          </div>
        </Card>

        <Card
          className="p-6 flex flex-col justify-between hover:shadow-md hover:border-primary/50 transition-all cursor-pointer group"
          onClick={() => navigate({ to: "/pessoas/mentorias" })}
        >
          <div className="space-y-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-base">Mentorias & Feedbacks</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Acompanhamento individual de metas, planos de ação e evolução comportamental.
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs font-medium text-emerald-600">
            Ver mentorias{" "}
            <ArrowRight className="h-3.5 w-3.5 ml-1 transition-transform group-hover:translate-x-1" />
          </div>
        </Card>

        <Card
          className="p-6 flex flex-col justify-between hover:shadow-md hover:border-[#3E100C]/50 transition-all cursor-pointer group"
          onClick={() => navigate({ to: "/melhorias/5s" })}
        >
          <div className="space-y-3">
            <div className="h-10 w-10 rounded-lg bg-[#3E100C]/10 text-[#3E100C] dark:text-[#E05A10] flex items-center justify-center group-hover:scale-105 transition-transform">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-base">HUB 5S & Qualidade</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Portal público do colaborador, auditorias digitais, Padrão Ouro, ITs de limpeza e Cartão Vermelho.
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs font-medium text-[#3E100C] dark:text-[#E05A10]">
            Acessar HUB 5S{" "}
            <ArrowRight className="h-3.5 w-3.5 ml-1 transition-transform group-hover:translate-x-1" />
          </div>
        </Card>

        <Card
          className="p-6 flex flex-col justify-between hover:shadow-md hover:border-[#E05A10]/50 transition-all cursor-pointer group"
          onClick={() => navigate({ to: "/pessoas/nps" })}
        >
          <div className="space-y-3">
            <div className="h-10 w-10 rounded-lg bg-[#E05A10]/10 text-[#E05A10] flex items-center justify-center group-hover:scale-105 transition-transform">
              <Smile className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-base">NPS & eNPS</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Pesquisas dinâmicas de satisfação de clientes e colaboradores com relatórios e links públicos.
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center text-xs font-medium text-[#E05A10]">
            Gerenciar pesquisas{" "}
            <ArrowRight className="h-3.5 w-3.5 ml-1 transition-transform group-hover:translate-x-1" />
          </div>
        </Card>
      </div>

      {/* Mini‑resumo / KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card
          className="hover:border-primary/40 transition-all cursor-pointer"
          onClick={() => navigate({ to: "/pessoas/assessment" })}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Colaboradores Mapeados
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading || unavailable ? "—" : summary.colaboradores}</div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Cadastros e avaliações comportamentais
            </p>
          </CardContent>
        </Card>

        <Card
          className="hover:border-primary/40 transition-all cursor-pointer"
          onClick={() => navigate({ to: "/pessoas/recrutamento" })}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Candidaturas no Funil ATS
            </CardTitle>
            <Briefcase className="h-4 w-4 text-sky-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-sky-600">{loading || unavailable ? "—" : summary.recrutamento}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Candidatos ativos em triagem e entrevistas</p>
          </CardContent>
        </Card>

        <Card
          className="hover:border-primary/40 transition-all cursor-pointer"
          onClick={() => navigate({ to: "/pessoas/mentorias" })}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Mentorias & Ciclos
            </CardTitle>
            <Award className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {loading || unavailable ? "—" : summary.mentorias}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Colaboradores em desenvolvimento ativo
            </p>
          </CardContent>
        </Card>

        <Card
          className="hover:border-[#E05A10]/40 transition-all cursor-pointer"
          onClick={() => navigate({ to: "/pessoas/nps" })}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Pesquisas NPS / eNPS
            </CardTitle>
            <Smile className="h-4 w-4 text-[#E05A10]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#E05A10]">
              {loading || unavailable ? "—" : summary.npsCount}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Termômetros ativos de satisfação
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
