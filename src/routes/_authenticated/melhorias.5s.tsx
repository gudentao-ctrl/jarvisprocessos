// src/routes/_authenticated/melhorias.5s.tsx
// Rota Autenticada Oficial do HUB 5S (Painel de Gestão e Operação 5S)

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Sparkles,
  ClipboardCheck,
  Calendar,
  Settings,
  FileText,
  Loader2,
  AlertCircle,
  Plus,
  BookOpen,
  Wifi,
  Pencil,
  Trash2,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

import { useCompanyFilter } from "@/hooks/useCompanyFilter";
import { usePermissions } from "@/hooks/usePermissions";
import { getMe } from "@/lib/access.functions";
import { getFivesPortalDataByCompanyId, subscribeFivesRealtime } from "@/lib/fives-storage";
import { importLegacyFivesData, legacyFivesCompanyIds } from "@/lib/fives-legacy-import";
import type { FivesPortalData } from "@/lib/fives-types";

import { PortalColaboradorView } from "@/components/fives/PortalColaboradorView";
import { AuditoriaModal } from "@/components/fives/AuditoriaModal";
import { CronogramaCartaoVermelhoView } from "@/components/fives/CronogramaCartaoVermelhoView";
import { SetoresComiteConfigView } from "@/components/fives/SetoresComiteConfigView";
import { RelatoriosExecutivosView } from "@/components/fives/RelatoriosExecutivosView";
import { BancoQuestoesView } from "@/components/fives/BancoQuestoesView";

export const Route = createFileRoute("/_authenticated/melhorias/5s")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "HUB 5S • Gestão da Qualidade | Jarvis Processos" },
      {
        name: "description",
        content: "Módulo operacional de auditorias, Padrão Ouro, ITs de limpeza e Cartão Vermelho.",
      },
    ],
  }),
  component: Hub5SRouteComponent,
});

export default function Hub5SRouteComponent() {
  const { companyId, company, companies, setCompanyId } = useCompanyFilter();
  const getMeFn = useServerFn(getMe);
  const { data: profile } = useQuery({
    queryKey: ["me"],
    queryFn: () => getMeFn(),
  });
  const { hasAccess } = usePermissions();

  // Permissões: as mesmas regras que o banco aplica (ferramenta HUB 5S da empresa ativa).
  const isSuperadmin = !!profile?.isSuperadmin;
  const canEdit = isSuperadmin || hasAccess("hub_5s", "update");

  const [activeTab, setActiveTab] = useState<string>("portal");
  const [portalData, setPortalData] = useState<FivesPortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal de Auditoria
  const [isAuditoriaModalOpen, setIsAuditoriaModalOpen] = useState(false);
  const [targetSetorId, setTargetSetorId] = useState<string | undefined>(undefined);

  // Carregar dados do HUB 5S para a empresa selecionada
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const targetCompanyId = companyId || "default-company";
      const targetCompanyName = company?.name || "Empresa Cliente";

      const data = await getFivesPortalDataByCompanyId(targetCompanyId, targetCompanyName);
      setPortalData(data);
    } catch (err: any) {
      setError(err?.message || "Erro ao carregar dados do HUB 5S.");
    } finally {
      setLoading(false);
    }
  }, [companyId, company?.name]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Recupera, uma única vez, dados 5S que a versão antiga guardou só neste computador.
  const importRan = useRef(false);
  useEffect(() => {
    if (importRan.current || !profile || !companies?.length) return;
    const pending = legacyFivesCompanyIds().filter((id) => companies.some((c: any) => c.id === id));
    if (pending.length === 0) return;
    importRan.current = true;
    void (async () => {
      let total = 0;
      for (const id of pending) {
        if (!isSuperadmin && !hasAccess("hub_5s", "create", id)) continue;
        try {
          total += (await importLegacyFivesData(id)).imported;
        } catch (err: any) {
          toast.error("Não foi possível enviar os dados 5S deste computador: " + (err?.message || "tente novamente."));
        }
      }
      if (total > 0) {
        toast.success(`${total} registro(s) do 5S salvos neste computador foram enviados e já aparecem no celular.`);
        void loadData();
      }
    })();
  }, [profile, companies, isSuperadmin, hasAccess, loadData]);

  // Realtime: Subscrição Supabase para atualizar o painel automaticamente
  useEffect(() => {
    const targetCompanyId = companyId || portalData?.company.id;
    if (!targetCompanyId) return;

    let unsubscribe: (() => void) | null = null;
    try {
      unsubscribe = subscribeFivesRealtime(targetCompanyId, () => {
        void loadData();
      });
    } catch (e) {
      console.warn("Realtime 5S não disponível:", e);
    }

    const handleLocalUpdate = (e: Event) => {
      const ev = e as CustomEvent;
      if (!ev.detail?.companyId || ev.detail.companyId === targetCompanyId) {
        void loadData();
      }
    };
    window.addEventListener("jarvis_5s_data_updated", handleLocalUpdate);

    return () => {
      unsubscribe?.();
      window.removeEventListener("jarvis_5s_data_updated", handleLocalUpdate);
    };
  }, [companyId, portalData?.company.id, loadData]);

  const handleOpenAuditoria = (setorId?: string) => {
    if (!canEdit) return;
    setTargetSetorId(setorId);
    setIsAuditoriaModalOpen(true);
  };

  const handleDeleteAuditoria = async (audId: string) => {
    if (!canEdit) return;
    if (!confirm("Tem certeza que deseja excluir esta auditoria? Os itens e planos de ação serão apagados permanentemente.")) return;
    try {
      const { deleteFivesAuditoria } = await import("@/lib/fives-storage");
      await deleteFivesAuditoria(audId, portalData?.company.id);
      toast.success("Auditoria excluída e scores recalculados.");
      void loadData();
    } catch (err: any) {
      toast.error("Erro ao excluir auditoria: " + err?.message);
    }
  };

  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-semibold text-muted-foreground">
          Carregando módulo HUB 5S...
        </p>
      </div>
    );
  }

  if (error || !portalData) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 mx-auto">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-bold">Falha ao abrir HUB 5S</h2>
        <p className="text-xs text-muted-foreground">{error}</p>
        <Button onClick={loadData} variant="outline" size="sm">
          Tentar Novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Título & Alçadas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              HUB 5S • Excelência & Padrões Operacionais
            </h1>
            {!canEdit && (
              <Badge variant="outline" className="bg-muted text-muted-foreground font-semibold text-xs">
                Modo Leitura (Cliente)
              </Badge>
            )}
            {isSuperadmin && (
              <Badge className="bg-primary text-white font-bold text-xs">
                Superadmin
              </Badge>
            )}
          </div>

          {/* Seletor de Empresa Ativa */}
          {companies && companies.length > 1 ? (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs font-semibold text-muted-foreground">Cliente Ativo:</span>
              <select
                value={companyId || portalData.company.id}
                onChange={(e) => setCompanyId(e.target.value)}
                className="h-8 rounded-lg border border-input bg-background px-2.5 text-xs font-bold text-foreground focus:ring-1 focus:ring-primary shadow-sm"
              >
                {companies.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground mt-0.5">
              {company?.name ? `Gestão ativa para ${company.name}` : "Gestão da qualidade e padrões 5S"}
            </p>
          )}
        </div>

        {canEdit && (
          <Button
            onClick={() => handleOpenAuditoria()}
            className="font-bold text-xs shadow-md"
            style={{ backgroundColor: portalData.config.secondary_color || "#E05A10" }}
          >
            <ClipboardCheck className="h-4 w-4 mr-1.5" /> + Nova Auditoria 5S
          </Button>
        )}
      </div>

      {/* Tabs Principais do Módulo */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full space-y-6"
      >
        <TabsList className="grid grid-cols-2 sm:grid-cols-6 w-full bg-muted/60 p-1 rounded-xl">
          <TabsTrigger value="portal" className="text-xs font-bold gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /> Portal 5S
          </TabsTrigger>
          <TabsTrigger value="auditorias" className="text-xs font-bold gap-1.5">
            <ClipboardCheck className="h-3.5 w-3.5" /> Auditorias ({portalData.auditoriasRecentes.length})
          </TabsTrigger>
          <TabsTrigger value="cronograma" className="text-xs font-bold gap-1.5">
            <Calendar className="h-3.5 w-3.5" /> Cronograma & Cartão Vermelho
          </TabsTrigger>
          <TabsTrigger value="setores" className="text-xs font-bold gap-1.5">
            <Settings className="h-3.5 w-3.5" /> Zonas, Comitê & Marca
          </TabsTrigger>
          <TabsTrigger value="relatorios" className="text-xs font-bold gap-1.5">
            <FileText className="h-3.5 w-3.5" /> Relatórios & PDFs
          </TabsTrigger>
          <TabsTrigger value="questoes" className="text-xs font-bold gap-1.5">
            <BookOpen className="h-3.5 w-3.5" /> Banco de Questões
          </TabsTrigger>
        </TabsList>

        {/* SEÇÃO 1: PORTAL DO COLABORADOR */}
        <TabsContent value="portal" className="space-y-6">
          <PortalColaboradorView
            portalData={portalData}
            isPublic={false}
            onOpenAuditoria={handleOpenAuditoria}
          />
        </TabsContent>

        {/* SEÇÃO 2: FORMULÁRIO DE AUDITORIA & HISTÓRICO */}
        <TabsContent value="auditorias" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-primary" />
                Histórico de Auditorias 5S Realizadas
              </h2>
              <p className="text-xs text-muted-foreground">
                Consulte as notas aplicadas aos 5 sensos e os planos de ação gerados nas auditorias.
              </p>
            </div>

            {canEdit && (
              <Button
                onClick={() => handleOpenAuditoria()}
                size="sm"
                className="font-bold text-xs"
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" /> Realizar Auditoria Agora
              </Button>
            )}
          </div>

          {portalData.auditoriasRecentes.length === 0 ? (
            <Card className="p-12 text-center border-dashed">
              <ClipboardCheck className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm font-semibold text-muted-foreground">
                Nenhuma auditoria registrada até o momento.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Realize a primeira auditoria para atualizar o radar e o ranking gamificado dos setores.
              </p>
              {canEdit && (
                <Button
                  onClick={() => handleOpenAuditoria()}
                  size="sm"
                  className="mt-4 text-xs font-bold"
                >
                  Iniciar Primeira Auditoria
                </Button>
              )}
            </Card>
          ) : (
            <div className="space-y-3">
              {portalData.auditoriasRecentes.map((aud) => (
                <Card key={aud.id} className="p-4 border shadow-sm hover:bg-muted/20 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-base text-foreground">
                          {aud.setor?.nome_setor || "Setor Auditado"}
                        </h4>
                        <Badge
                          className={`font-bold text-xs ${
                            aud.nota_final_percent >= 90
                              ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                              : aud.nota_final_percent >= 80
                              ? "bg-amber-100 text-amber-800 border-amber-300"
                              : "bg-rose-100 text-rose-800 border-rose-300"
                          }`}
                        >
                          {aud.nota_final_percent.toFixed(1)}% de Conformidade
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Data: <strong>{aud.data_auditoria}</strong> • Auditor: <strong>{aud.auditor_nome || "Comitê 5S"}</strong>
                      </p>
                      {aud.observacoes_gerais && (
                        <p className="text-xs text-muted-foreground italic mt-1 max-w-2xl">
                          "{aud.observacoes_gerais}"
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <Badge variant="outline" className="text-xs">
                        {aud.itens?.length || 0} Itens Inspecionados
                      </Badge>
                      {aud.itens?.some((i) => i.nota < 4) && (
                        <Badge variant="outline" className="text-xs border-amber-300 text-amber-800 bg-amber-50">
                          {aud.itens.filter((i) => i.nota < 4).length} Planos de Ação
                        </Badge>
                      )}
                      {canEdit && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => { e.stopPropagation(); void handleDeleteAuditoria(aud.id); }}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-600"
                          title="Excluir Auditoria"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* SEÇÃO 3: CRONOGRAMA & CARTÃO VERMELHO */}
        <TabsContent value="cronograma">
          <CronogramaCartaoVermelhoView
            companyId={portalData.company.id}
            setores={portalData.setores}
            descartes={portalData.cartoesVermelhos}
            eventos={portalData.eventos}
            cronogramaProjeto={portalData.cronogramaProjeto}
            canEdit={canEdit}
            onRefresh={loadData}
          />
        </TabsContent>

        {/* SEÇÃO 4: COMITÊ, ZONAS & CONFIGURAÇÕES WHITELABEL */}
        <TabsContent value="setores">
          <SetoresComiteConfigView
            companyId={portalData.company.id}
            companyName={portalData.company.name}
            config={portalData.config}
            setores={portalData.setores}
            instrucoesTrabalho={portalData.instrucoesTrabalho}
            canEdit={canEdit}
            onRefresh={loadData}
          />
        </TabsContent>

        {/* SEÇÃO 5: RELATÓRIOS EXECUTIVOS & DRE 5S */}
        <TabsContent value="relatorios">
          <RelatoriosExecutivosView portalData={portalData} />
        </TabsContent>

        {/* SEÇÃO 6: BANCO DE QUESTÕES CUSTOMIZADAS */}
        <TabsContent value="questoes">
          <BancoQuestoesView
            companyId={portalData.company.id}
            canEdit={canEdit}
          />
        </TabsContent>
      </Tabs>

      {/* MODAL AUDITORIA */}
      <AuditoriaModal
        isOpen={isAuditoriaModalOpen}
        onClose={() => setIsAuditoriaModalOpen(false)}
        companyId={portalData.company.id}
        setores={portalData.setores}
        initialSetorId={targetSetorId}
        defaultAuditorNome={profile?.fullName || "Consultor Especialista"}
        onSuccess={loadData}
      />
    </div>
  );
}