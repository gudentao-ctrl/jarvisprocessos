// src/components/fives/SetoresComiteConfigView.tsx
// Gestão de Setores (Zonas), Comitê Organizador 5S e Personalização Whitelabel

import { compressImageFile } from "@/lib/image-compress";
import React, { useState, useEffect } from "react";
import {
  Settings,
  Users,
  Layers,
  Palette,
  Plus,
  Pencil,
  Trash2,
  Sparkles,
  Link as LinkIcon,
  Copy,
  ExternalLink,
  Save,
  CheckCircle2,
  QrCode,
  FileText,
  Upload,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";

import type {
  FivesConfiguracao,
  FivesSetor,
  FivesComiteMembro,
  FivesInstrucaoTrabalho,
  FivesRotinaLimpezaItem,
  FrequenciaLimpeza,
  Senso5S,
} from "@/lib/fives-types";
import {
  saveFivesConfig,
  saveFivesSetor,
  deleteFivesSetor,
  saveFivesIT,
  isUuid,
} from "@/lib/fives-storage";
import { SectorQrModal } from "./SectorQrModal";
import { ITEditorDialog } from "./ITEditorDialog";

interface SetoresComiteConfigViewProps {
  companyId: string;
  companyName: string;
  config: FivesConfiguracao;
  setores: FivesSetor[];
  instrucoesTrabalho: Record<string, FivesInstrucaoTrabalho>;
  canEdit: boolean;
  onRefresh: () => void;
}

export function SetoresComiteConfigView({
  companyId,
  companyName,
  config,
  setores,
  instrucoesTrabalho,
  canEdit,
  onRefresh,
}: SetoresComiteConfigViewProps) {
  const [activeTab, setActiveTab] = useState<"setores" | "comite" | "whitelabel">("setores");

  // Estado das Configurações Whitelabel
  const [primaryColor, setPrimaryColor] = useState(config.primary_color || "#3E100C");
  const [secondaryColor, setSecondaryColor] = useState(config.secondary_color || "#E05A10");
  const [bgColor, setBgColor] = useState(config.bg_color || "#FFF8F5");
  const [slogan, setSlogan] = useState(config.slogan_campanha || "");
  const [logoUrl, setLogoUrl] = useState(config.logo_url || "");
  const [bannerUrl, setBannerUrl] = useState(config.header_banner_url || "");
  const [sensoDestaque, setSensoDestaque] = useState(config.senso_destaque_mes || "Seiso");
  const [savingConfig, setSavingConfig] = useState(false);

  // Sincroniza estado quando a empresa ou config for atualizada
  useEffect(() => {
    setPrimaryColor(config.primary_color || "#3E100C");
    setSecondaryColor(config.secondary_color || "#E05A10");
    setBgColor(config.bg_color || "#FFF8F5");
    setSlogan(config.slogan_campanha || "");
    setLogoUrl(config.logo_url || "");
    setBannerUrl(config.header_banner_url || "");
    setSensoDestaque(config.senso_destaque_mes || "Seiso");
  }, [config, companyId]);

  // Modal Setor
  const [isSetorModalOpen, setIsSetorModalOpen] = useState(false);
  const [editingSetorId, setEditingSetorId] = useState<string | null>(null);
  const [setorNome, setSetorNome] = useState("");
  const [setorGuardiao, setSetorGuardiao] = useState("");
  const [setorAuditor, setSetorAuditor] = useState("");
  const [setorMeta, setSetorMeta] = useState<number>(90);
  const [setorDescricao, setSetorDescricao] = useState("");
  const [savingSetor, setSavingSetor] = useState(false);

  // Modal IT e Padrão Ouro
  const [isItModalOpen, setIsItModalOpen] = useState(false);
  const [itSetorId, setItSetorId] = useState<string | null>(null);

  // Modal Comitê Membro
  const [isComiteModalOpen, setIsComiteModalOpen] = useState(false);
  const [membroNome, setMembroNome] = useState("");
  const [membroCargo, setMembroCargo] = useState("");
  const [membroPapel, setMembroPapel] = useState<FivesComiteMembro["papel_5s"]>("Membro do Comitê");
  const [membroContato, setMembroContato] = useState("");

  // Modal QR Code
  const [qrModalSector, setQrModalSector] = useState<FivesSetor | null>(null);

  // Link Público dinâmico por empresa
  // O link público usa o código aleatório da empresa, nunca o identificador interno.
  const portalHash = config.url_hash || "";
  const publicUrl = typeof window !== "undefined"
    ? `${window.location.origin}/p/5s/${portalHash}`
    : `https://jarvisprocessos.lovable.app/p/5s/${portalHash}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    toast.success("Link público do Portal 5S copiado para a área de transferência!");
  };

  // Salvar Whitelabel
  const handleSaveWhitelabel = async () => {
    try {
      setSavingConfig(true);
      await saveFivesConfig({
        id: config.id,
        company_id: companyId,
        company_name: companyName,
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        bg_color: bgColor,
        slogan_campanha: slogan,
        logo_url: logoUrl || null,
        header_banner_url: bannerUrl || null,
        senso_destaque_mes: sensoDestaque,
      });
      toast.success("Configurações Whitelabel atualizadas com sucesso!");
      onRefresh();
    } catch (err: any) {
      toast.error("Erro ao salvar configurações: " + (err?.message || "Tente novamente"));
    } finally {
      setSavingConfig(false);
    }
  };

  // Upload Imagens Whitelabel
  const handleImageUpload = (
    setter: (val: string) => void,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    compressImageFile(file, 1600)
      .then(setter)
      .catch((err: Error) => toast.error(err.message));
  };

  // Abrir Modal Setor
  const handleOpenSetorModal = (setor?: FivesSetor) => {
    if (setor) {
      setEditingSetorId(setor.id);
      setSetorNome(setor.nome_setor);
      setSetorGuardiao(setor.guardiao_nome || "");
      setSetorAuditor(setor.auditor_nome || "");
      setSetorMeta(setor.meta_nota || 90);
      setSetorDescricao(setor.descricao || "");
    } else {
      setEditingSetorId(null);
      setSetorNome("");
      setSetorGuardiao("");
      setSetorAuditor("");
      setSetorMeta(90);
      setSetorDescricao("");
    }
    setIsSetorModalOpen(true);
  };

  const handleSaveSetor = async () => {
    if (!setorNome.trim()) {
      toast.error("Por favor informe o nome do setor.");
      return;
    }

    try {
      setSavingSetor(true);
      await saveFivesSetor({
        id: editingSetorId || undefined,
        company_id: companyId,
        nome_setor: setorNome,
        guardiao_nome: setorGuardiao,
        auditor_nome: setorAuditor,
        meta_nota: Number(setorMeta) || 90,
        descricao: setorDescricao,
      });

      toast.success(editingSetorId ? "Setor atualizado!" : "Novo setor cadastrado!");
      setIsSetorModalOpen(false);
      onRefresh();
    } catch (err: any) {
      toast.error("Erro ao salvar setor: " + (err?.message || "Tente novamente"));
    } finally {
      setSavingSetor(false);
    }
  };

  const handleDeleteSetor = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este setor e seus dados vinculados?")) return;
    try {
      await deleteFivesSetor(id, companyId);
      toast.success("Setor excluído com sucesso.");
      onRefresh();
    } catch (err: any) {
      toast.error("Erro ao excluir setor: " + err?.message);
    }
  };

  // Modal IT
  const handleOpenItModal = (setorId: string) => {
    setItSetorId(setorId);
    setIsItModalOpen(true);
  };

  // Comitê
  const handleAddComiteMembro = async () => {
    if (!membroNome.trim()) {
      toast.error("Informe o nome do membro do comitê.");
      return;
    }

    const novoMembro: FivesComiteMembro = {
      id: `membro-${Date.now()}`,
      nome: membroNome,
      cargo: membroCargo,
      papel_5s: membroPapel,
      contato: membroContato,
    };

    const updatedMembros = [...(config.comite_membros || []), novoMembro];

    try {
      await saveFivesConfig({
        id: config.id,
        company_id: companyId,
        comite_membros: updatedMembros,
      });
      toast.success("Membro adicionado ao comitê 5S!");
      setIsComiteModalOpen(false);
      setMembroNome("");
      setMembroCargo("");
      setMembroContato("");
      onRefresh();
    } catch (err: any) {
      toast.error("Erro ao adicionar membro: " + err?.message);
    }
  };

  const handleRemoveComiteMembro = async (membroId: string) => {
    if (!confirm("Remover este membro do comitê 5S?")) return;
    const updated = (config.comite_membros || []).filter((m) => m.id !== membroId);
    try {
      await saveFivesConfig({
        id: config.id,
        company_id: companyId,
        comite_membros: updated,
      });
      toast.success("Membro removido do comitê.");
      onRefresh();
    } catch (err: any) {
      toast.error("Erro ao remover: " + err?.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Barra Superior com Link Público Whitelabel */}
      <Card className="border shadow-sm bg-gradient-to-r from-muted/30 to-background">
        <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
              <LinkIcon className="h-3.5 w-3.5" /> Portal Público do Colaborador (Link Whitelabel)
            </span>
            <p className="text-xs text-muted-foreground">
              Acesso 100% público para os funcionários sem necessidade de login. Compatível com QR Codes físicos nos setores.
            </p>
            <div className="font-mono text-xs text-foreground bg-muted/60 px-3 py-1.5 rounded-lg border inline-block select-all max-w-full truncate">
              {publicUrl}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="text-xs font-semibold"
            >
              <Copy className="h-3.5 w-3.5 mr-1.5" /> Copiar Link
            </Button>
            <a href={publicUrl} target="_blank" rel="noopener noreferrer">
              <Button size="sm" className="text-xs font-semibold">
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Abrir Portal
              </Button>
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Tabs de Configurações */}
      <Tabs
        value={activeTab}
        onValueChange={(v: any) => setActiveTab(v)}
        className="w-full"
      >
        <TabsList className="grid grid-cols-3 max-w-lg">
          <TabsTrigger value="setores" className="text-xs font-bold gap-1.5">
            <Layers className="h-3.5 w-3.5" /> Setores & Zonas ({setores.length})
          </TabsTrigger>
          <TabsTrigger value="comite" className="text-xs font-bold gap-1.5">
            <Users className="h-3.5 w-3.5" /> Comitê 5S ({(config.comite_membros || []).length})
          </TabsTrigger>
          <TabsTrigger value="whitelabel" className="text-xs font-bold gap-1.5">
            <Palette className="h-3.5 w-3.5" /> Whitelabel & Marca
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: SETORES & ZONAS */}
        <TabsContent value="setores" className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-foreground">
                Mapeamento de Setores Físicos
              </h3>
              <p className="text-xs text-muted-foreground">
                Cadastre os setores da empresa, definindo seus Guardiões e Auditores Responsáveis.
              </p>
            </div>

            {canEdit && (
              <Button
                onClick={() => handleOpenSetorModal()}
                size="sm"
                className="font-bold text-xs"
              >
                <Plus className="h-4 w-4 mr-1.5" /> Novo Setor
              </Button>
            )}
          </div>

          {setores.length === 0 ? (
            <Card className="p-10 text-center border-dashed">
              <p className="text-xs text-muted-foreground">Nenhum setor cadastrado ainda.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {setores.map((setor) => {
                const it = instrucoesTrabalho[setor.id];

                return (
                  <Card key={setor.id} className="border shadow-sm flex flex-col justify-between">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base font-bold">
                          {setor.nome_setor}
                        </CardTitle>
                        <Badge variant="outline" className="text-xs font-bold">
                          Meta: {setor.meta_nota}%
                        </Badge>
                      </div>
                      <CardDescription className="text-xs">
                        {setor.descricao || "Área operacional"}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-3">
                      <div className="bg-muted/30 p-2.5 rounded-lg border text-xs space-y-1">
                        <div>
                          Guardião: <strong>{setor.guardiao_nome || "Não definido"}</strong>
                        </div>
                        <div>
                          Auditor: <strong>{setor.auditor_nome || "Não definido"}</strong>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1 border-t">
                        <span className="text-muted-foreground">
                          {it ? "IT Cadastrada" : "Sem IT cadastrada"}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setQrModalSector(setor)}
                          className="h-7 text-xs font-semibold text-primary"
                        >
                          <QrCode className="h-3.5 w-3.5 mr-1" /> Etiqueta QR
                        </Button>
                      </div>
                    </CardContent>

                    {canEdit && (
                      <div className="p-3 bg-muted/20 border-t flex items-center justify-between gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenItModal(setor.id)}
                          className="h-8 text-xs font-semibold flex-1"
                        >
                          <FileText className="h-3.5 w-3.5 mr-1" /> IT & Padrão Ouro
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenSetorModal(setor)}
                          className="h-8 w-8 p-0"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteSetor(setor.id)}
                          className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* TAB 2: COMITÊ 5S */}
        <TabsContent value="comite" className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-foreground">
                Comitê & Comissão Organizadora 5S
              </h3>
              <p className="text-xs text-muted-foreground">
                Membros da liderança e facilitadores responsáveis pela manutenção e auditoria do programa.
              </p>
            </div>

            {canEdit && (
              <Button
                onClick={() => setIsComiteModalOpen(true)}
                size="sm"
                className="font-bold text-xs"
              >
                <Plus className="h-4 w-4 mr-1.5" /> Adicionar Membro
              </Button>
            )}
          </div>

          {(config.comite_membros || []).length === 0 ? (
            <Card className="p-10 text-center border-dashed">
              <p className="text-xs text-muted-foreground">Nenhum membro registrado no comitê ainda.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(config.comite_membros || []).map((membro) => (
                <Card key={membro.id} className="border shadow-sm p-4 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-foreground">{membro.nome}</h4>
                      <Badge variant="outline" className="text-[10px] font-bold">
                        {membro.papel_5s}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Cargo: {membro.cargo || "Não informado"}
                    </p>
                    {membro.contato && (
                      <p className="text-[11px] text-muted-foreground">
                        Contato: {membro.contato}
                      </p>
                    )}
                  </div>

                  {canEdit && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRemoveComiteMembro(membro.id)}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* TAB 3: WHITELABEL & MARCA */}
        <TabsContent value="whitelabel" className="space-y-6 pt-2">
          <Card className="border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Palette className="h-4 w-4 text-primary" />
                Personalização Visual Whitelabel da Empresa
              </CardTitle>
              <CardDescription className="text-xs">
                As cores e imagens configuradas abaixo serão aplicadas automaticamente tanto no Portal Público do Colaborador quanto no Painel e nos Relatórios em PDF.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Cores Hex */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs font-semibold">Cor Primária (Hex) *</Label>
                  <div className="flex items-center gap-2 mt-1.5">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      disabled={!canEdit}
                      className="w-10 h-9 p-0.5 rounded border cursor-pointer"
                    />
                    <Input
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      disabled={!canEdit}
                      className="text-xs h-9 font-mono"
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-1 block">
                    Padrão Maia: #3E100C
                  </span>
                </div>

                <div>
                  <Label className="text-xs font-semibold">Cor Secundária / Destaque *</Label>
                  <div className="flex items-center gap-2 mt-1.5">
                    <input
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      disabled={!canEdit}
                      className="w-10 h-9 p-0.5 rounded border cursor-pointer"
                    />
                    <Input
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      disabled={!canEdit}
                      className="text-xs h-9 font-mono"
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-1 block">
                    Padrão Maia: #E05A10
                  </span>
                </div>

                <div>
                  <Label className="text-xs font-semibold">Cor de Fundo Portal</Label>
                  <div className="flex items-center gap-2 mt-1.5">
                    <input
                      type="color"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      disabled={!canEdit}
                      className="w-10 h-9 p-0.5 rounded border cursor-pointer"
                    />
                    <Input
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      disabled={!canEdit}
                      className="text-xs h-9 font-mono"
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-1 block">
                    Padrão: #FFF8F5
                  </span>
                </div>
              </div>

              {/* Slogan & Senso em Destaque */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <Label className="text-xs font-semibold">Slogan Oficial da Campanha 5S</Label>
                  <Input
                    placeholder="Ex: Cuidar do nosso espaço de trabalho é valorizar as pessoas e a excelência..."
                    value={slogan}
                    onChange={(e) => setSlogan(e.target.value)}
                    disabled={!canEdit}
                    className="text-xs mt-1.5 h-9"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold">Senso em Destaque no Mês</Label>
                  <select
                    value={sensoDestaque}
                    onChange={(e) => setSensoDestaque(e.target.value)}
                    disabled={!canEdit}
                    className="w-full mt-1.5 h-9 rounded-md border border-input bg-background px-3 text-xs"
                  >
                    <option value="Seiri">Seiri (Utilização)</option>
                    <option value="Seiton">Seiton (Organização)</option>
                    <option value="Seiso">Seiso (Limpeza)</option>
                    <option value="Seiketsu">Seiketsu (Padronização)</option>
                    <option value="Shitsuke">Shitsuke (Disciplina)</option>
                  </select>
                </div>
              </div>

              {/* Uploads de Logo e Banner */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Logo da Empresa</Label>
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded-xl border bg-muted flex items-center justify-center overflow-hidden shrink-0">
                      {logoUrl ? (
                        <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
                      ) : (
                        <span className="text-xs text-muted-foreground">Sem logo</span>
                      )}
                    </div>
                    {canEdit && (
                      <div className="space-y-1 flex-1">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageUpload(setLogoUrl, e)}
                          className="text-xs h-8 file:mr-2 file:py-0.5 file:px-2 file:rounded-md file:border-0 file:text-[11px] file:font-semibold file:bg-primary file:text-white"
                        />
                        <Input
                          placeholder="Ou insira a URL direta..."
                          value={logoUrl}
                          onChange={(e) => setLogoUrl(e.target.value)}
                          className="text-xs h-7"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Banner de Capa do Header</Label>
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-16 rounded-xl border bg-muted flex items-center justify-center overflow-hidden shrink-0">
                      {bannerUrl ? (
                        <img src={bannerUrl} alt="Banner" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs text-muted-foreground">Gradiente</span>
                      )}
                    </div>
                    {canEdit && (
                      <div className="space-y-1 flex-1">
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageUpload(setBannerUrl, e)}
                          className="text-xs h-8 file:mr-2 file:py-0.5 file:px-2 file:rounded-md file:border-0 file:text-[11px] file:font-semibold file:bg-primary file:text-white"
                        />
                        <Input
                          placeholder="Ou insira a URL direta do banner..."
                          value={bannerUrl}
                          onChange={(e) => setBannerUrl(e.target.value)}
                          className="text-xs h-7"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Botão de Salvar Whitelabel */}
              {canEdit && (
                <div className="pt-3 border-t flex justify-end">
                  <Button
                    onClick={handleSaveWhitelabel}
                    disabled={savingConfig}
                    className="font-bold text-xs"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <Save className="h-4 w-4 mr-1.5" />
                    {savingConfig ? "Salvando..." : "Salvar Configurações Whitelabel"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* MODAL SETOR */}
      <Dialog open={isSetorModalOpen} onOpenChange={setIsSetorModalOpen}>
        <DialogContent className="max-w-md w-full bg-background rounded-2xl shadow-2xl border">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              {editingSetorId ? "Editar Setor 5S" : "Cadastrar Novo Setor"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Mapeie o setor físico, seu guardião responsável e a meta percentual.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-xs font-semibold">Nome do Setor *</Label>
              <Input
                placeholder="Ex: Almoxarifado Central, Usinagem, RH..."
                value={setorNome}
                onChange={(e) => setSetorNome(e.target.value)}
                className="text-xs mt-1 h-9"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Guardião do Setor</Label>
                <Input
                  placeholder="Nome do líder do setor"
                  value={setorGuardiao}
                  onChange={(e) => setSetorGuardiao(e.target.value)}
                  className="text-xs mt-1 h-9"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Auditor Designado</Label>
                <Input
                  placeholder="Nome do auditor"
                  value={setorAuditor}
                  onChange={(e) => setSetorAuditor(e.target.value)}
                  className="text-xs mt-1 h-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Meta de Conformidade (%)</Label>
                <Input
                  type="number"
                  min="50"
                  max="100"
                  value={setorMeta}
                  onChange={(e) => setSetorMeta(Number(e.target.value))}
                  className="text-xs mt-1 h-9"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Descrição / Localização</Label>
              <Textarea
                placeholder="Ex: Galpão 02, próximo à expedição..."
                value={setorDescricao}
                onChange={(e) => setSetorDescricao(e.target.value)}
                className="text-xs mt-1 min-h-[50px]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSetorModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSaveSetor}
              disabled={savingSetor}
              className="bg-primary text-white font-bold"
            >
              {savingSetor ? "Salvando..." : "Salvar Setor"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL IT & PADRÃO OURO */}
      <ITEditorDialog
        open={isItModalOpen}
        onOpenChange={setIsItModalOpen}
        setor={setores.find((s) => s.id === itSetorId) ?? null}
        existing={itSetorId ? instrucoesTrabalho[itSetorId] : null}
        onSaved={onRefresh}
      />

      {/* MODAL MEMBRO COMITÊ */}
      <Dialog open={isComiteModalOpen} onOpenChange={setIsComiteModalOpen}>
        <DialogContent className="max-w-md w-full bg-background rounded-2xl shadow-2xl border">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Adicionar Membro ao Comitê 5S
            </DialogTitle>
            <DialogDescription className="text-xs">
              Integre representantes da gestão e facilitadores do programa.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-xs font-semibold">Nome Completo *</Label>
              <Input
                placeholder="Ex: Carlos Silva"
                value={membroNome}
                onChange={(e) => setMembroNome(e.target.value)}
                className="text-xs mt-1 h-9"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Papel no Programa 5S *</Label>
              <select
                value={membroPapel}
                onChange={(e) => setMembroPapel(e.target.value as any)}
                className="w-full mt-1 h-9 rounded-md border border-input bg-background px-3 text-xs"
              >
                <option value="Coordenador Geral">Coordenador Geral</option>
                <option value="Facilitador">Facilitador</option>
                <option value="Auditor Líder">Auditor Líder</option>
                <option value="Membro do Comitê">Membro do Comitê</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Cargo na Empresa</Label>
                <Input
                  placeholder="Ex: Supervisor Operacional"
                  value={membroCargo}
                  onChange={(e) => setMembroCargo(e.target.value)}
                  className="text-xs mt-1 h-9"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Contato / Ramal</Label>
                <Input
                  placeholder="Ex: ramal 204"
                  value={membroContato}
                  onChange={(e) => setMembroContato(e.target.value)}
                  className="text-xs mt-1 h-9"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsComiteModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleAddComiteMembro}
              className="bg-primary text-white font-bold"
            >
              Adicionar Membro
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal QR Code */}
      <SectorQrModal
        isOpen={!!qrModalSector}
        onClose={() => setQrModalSector(null)}
        setor={qrModalSector}
        config={config}
        companyName={companyName}
      />
    </div>
  );
}