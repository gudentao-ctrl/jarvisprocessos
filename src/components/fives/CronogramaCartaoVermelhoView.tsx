// src/components/fives/CronogramaCartaoVermelhoView.tsx
// Gestão do Cartão Vermelho (Seiri/Descartes) e Calendário de Eventos / Dias D

import React, { useState } from "react";
import {
  Calendar as CalendarIcon,
  Tag,
  AlertOctagon,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  MapPin,
  Camera,
  Archive,
  RefreshCw,
  Gift,
  Gavel,
  Check,
  Filter,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

import type {
  FivesDescarteCartaoVermelho,
  FivesEvento,
  FivesSetor,
  DestinacaoCartaoVermelho,
} from "@/lib/fives-types";
import {
  saveFivesDescarte,
  updateStatusDescarte,
  deleteFivesDescarte,
  archivarDescarte,
  saveFivesEvento,
  deleteFivesEvento,
} from "@/lib/fives-storage";

interface CronogramaCartaoVermelhoViewProps {
  companyId: string;
  setores: FivesSetor[];
  descartes: FivesDescarteCartaoVermelho[];
  eventos: FivesEvento[];
  canEdit: boolean;
  onRefresh: () => void;
}

const STATUS_DESTINACAO_LABELS: Record<
  DestinacaoCartaoVermelho,
  { label: string; cor: string; icon: any }
> = {
  PENDENTE: { label: "Em Quarentena (Pendente)", cor: "bg-amber-100 text-amber-800 border-amber-300", icon: Clock },
  DOACAO: { label: "Doação Institucional", cor: "bg-blue-100 text-blue-800 border-blue-300", icon: Gift },
  SUCATA: { label: "Sucata / Reciclagem", cor: "bg-slate-100 text-slate-800 border-slate-300", icon: Archive },
  RETORNO: { label: "Retorno ao Uso", cor: "bg-emerald-100 text-emerald-800 border-emerald-300", icon: RefreshCw },
  LEILAO: { label: "Leilão Interno", cor: "bg-purple-100 text-purple-800 border-purple-300", icon: Gavel },
  EM_ANDAMENTO: { label: "Em Andamento", cor: "bg-sky-100 text-sky-800 border-sky-300", icon: RefreshCw },
  CONCLUIDO: { label: "Concluído / Arquivado", cor: "bg-green-100 text-green-800 border-green-300", icon: CheckCircle2 },
};

export function CronogramaCartaoVermelhoView({
  companyId,
  setores,
  descartes,
  eventos,
  canEdit,
  onRefresh,
}: CronogramaCartaoVermelhoViewProps) {
  const [activeTab, setActiveTab] = useState<"cartao-vermelho" | "eventos">("cartao-vermelho");

  // Filtros Cartão Vermelho
  const [statusFilter, setStatusFilter] = useState<string>("TODOS");
  const [showArquivados, setShowArquivados] = useState(false);

  // Modais
  const [isNovoCartaoOpen, setIsNovoCartaoOpen] = useState(false);
  const [isNovoEventoOpen, setIsNovoEventoOpen] = useState(false);

  // Form Novo Cartão Vermelho
  const [novoSetorId, setNovoSetorId] = useState(setores[0]?.id || "");
  const [novoItemDesc, setNovoItemDesc] = useState("");
  const [novoLocalizacao, setNovoLocalizacao] = useState("");
  const [novoDataLimite, setNovoDataLimite] = useState(
    new Date(Date.now() + 15 * 86400000).toISOString().split("T")[0]
  );
  const [novoFotoUrl, setNovoFotoUrl] = useState("");
  const [novoDestinacao, setNovoDestinacao] = useState<DestinacaoCartaoVermelho>("PENDENTE");

  // Form Novo Evento
  const [novoEventoTitulo, setNovoEventoTitulo] = useState("");
  const [novoEventoTipo, setNovoEventoTipo] = useState<FivesEvento["tipo"]>("DIA_D");
  const [novoEventoData, setNovoEventoData] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0]
  );
  const [novoEventoHorario, setNovoEventoHorario] = useState("08:00 - 12:00");
  const [novoEventoSetorId, setNovoEventoSetorId] = useState("");
  const [novoEventoResponsavel, setNovoEventoResponsavel] = useState("");
  const [novoEventoDescricao, setNovoEventoDescricao] = useState("");

  const [saving, setSaving] = useState(false);

  // Upload Foto Cartão Vermelho
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) {
      toast.error("Imagem muito pesada (máx 4MB).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setNovoFotoUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSalvarCartaoVermelho = async () => {
    if (!novoItemDesc.trim()) {
      toast.error("Por favor descreva o item etiquetado com Cartão Vermelho.");
      return;
    }
    if (!novoSetorId) {
      toast.error("Por favor selecione o setor de origem.");
      return;
    }

    try {
      setSaving(true);
      await saveFivesDescarte({
        setor_id: novoSetorId,
        item_descricao: novoItemDesc,
        localizacao: novoLocalizacao || "Área de Quarentena",
        data_limite: novoDataLimite,
        foto_url: novoFotoUrl || null,
        destinacao_status: novoDestinacao,
      });

      toast.success("Item com Cartão Vermelho registrado com sucesso!");
      setIsNovoCartaoOpen(false);
      setNovoItemDesc("");
      setNovoLocalizacao("");
      setNovoFotoUrl("");
      onRefresh();
    } catch (err: any) {
      toast.error("Erro ao salvar cartão vermelho: " + (err?.message || "Tente novamente"));
    } finally {
      setSaving(false);
    }
  };

  const handleMudarStatusCartao = async (
    id: string,
    novoStatus: DestinacaoCartaoVermelho
  ) => {
    try {
      await updateStatusDescarte(id, novoStatus);
      toast.success("Destinação do Cartão Vermelho atualizada!");
      onRefresh();
    } catch (err: any) {
      toast.error("Erro ao atualizar: " + err?.message);
    }
  };

  const handleDeleteCartao = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este registro de Cartão Vermelho?")) return;
    try {
      await deleteFivesDescarte(id);
      toast.success("Registro removido.");
      onRefresh();
    } catch (err: any) {
      toast.error("Erro ao remover: " + err?.message);
    }
  };

  const handleArquivarCartao = async (id: string) => {
    if (!confirm("Marcar como Concluído e arquivar este item? Ele será movido para o Histórico.")) return;
    try {
      await archivarDescarte(id);
      toast.success("Item arquivado no Histórico de Descartes.");
      onRefresh();
    } catch (err: any) {
      toast.error("Erro ao arquivar: " + err?.message);
    }
  };

  const handleSalvarEvento = async () => {
    if (!novoEventoTitulo.trim()) {
      toast.error("Por favor informe o título do evento.");
      return;
    }

    try {
      setSaving(true);
      await saveFivesEvento({
        company_id: companyId,
        setor_id: novoEventoSetorId || null,
        titulo: novoEventoTitulo,
        tipo: novoEventoTipo,
        data_evento: novoEventoData,
        horario: novoEventoHorario,
        responsavel: novoEventoResponsavel,
        descricao: novoEventoDescricao,
        concluido: false,
      });

      toast.success("Evento agendado com sucesso!");
      setIsNovoEventoOpen(false);
      setNovoEventoTitulo("");
      setNovoEventoDescricao("");
      onRefresh();
    } catch (err: any) {
      toast.error("Erro ao salvar evento: " + (err?.message || "Tente novamente"));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleEventoConcluido = async (evento: FivesEvento) => {
    try {
      await saveFivesEvento({
        ...evento,
        concluido: !evento.concluido,
      });
      toast.success(
        evento.concluido ? "Evento reaberto!" : "Evento marcado como concluído!"
      );
      onRefresh();
    } catch (err: any) {
      toast.error("Erro ao atualizar: " + err?.message);
    }
  };

  const handleDeleteEvento = async (id: string) => {
    if (!confirm("Deseja cancelar e remover este evento?")) return;
    try {
      await deleteFivesEvento(id, companyId);
      toast.success("Evento removido com sucesso.");
      onRefresh();
    } catch (err: any) {
      toast.error("Erro ao remover evento: " + err?.message);
    }
  };

  // Filtragem dos descartes
  const descartesAtivos = descartes.filter((d) => !d.arquivado);
  const descartesArquivados = descartes.filter((d) => d.arquivado);
  const listaBase = showArquivados ? descartesArquivados : descartesAtivos;
  const descartesFiltrados = listaBase.filter((d) => {
    if (statusFilter === "TODOS") return true;
    return d.destinacao_status === statusFilter;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            Cronograma, Dias D & Área do Cartão Vermelho
          </h2>
          <p className="text-xs text-muted-foreground">
            Gestão da quarentena de descarte provisório (Seiri) e agenda de mutirões e auditorias cruzadas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === "cartao-vermelho" && canEdit && (
            <Button
              onClick={() => setIsNovoCartaoOpen(true)}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md"
            >
              <AlertOctagon className="h-4 w-4 mr-1.5" /> + Novo Cartão Vermelho
            </Button>
          )}

          {activeTab === "eventos" && canEdit && (
            <Button
              onClick={() => setIsNovoEventoOpen(true)}
              className="bg-primary hover:bg-primary/90 text-white font-bold text-xs shadow-md"
            >
              <Plus className="h-4 w-4 mr-1.5" /> + Agendar Evento / Dia D
            </Button>
          )}
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(v: any) => setActiveTab(v)}
        className="w-full"
      >
        <TabsList className="grid grid-cols-2 max-w-md">
          <TabsTrigger value="cartao-vermelho" className="text-xs font-bold gap-1.5">
            <AlertOctagon className="h-3.5 w-3.5 text-rose-600" />
            Cartão Vermelho ({descartes.length})
          </TabsTrigger>
          <TabsTrigger value="eventos" className="text-xs font-bold gap-1.5">
            <CalendarIcon className="h-3.5 w-3.5 text-primary" />
            Cronograma & Dias D ({eventos.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: CARTÃO VERMELHO (SEIRI) */}
        <TabsContent value="cartao-vermelho" className="space-y-4 pt-2">
          {/* Barra de Filtros */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/20 p-3 rounded-xl border">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-semibold text-muted-foreground">Filtro de Status:</span>
              <div className="flex flex-wrap gap-1">
                {["TODOS", "PENDENTE", "DOACAO", "SUCATA", "RETORNO", "LEILAO", "EM_ANDAMENTO"].map((st) => (
                  <Button
                    key={st}
                    size="sm"
                    variant={statusFilter === st ? "default" : "outline"}
                    onClick={() => setStatusFilter(st)}
                    className="h-7 text-[11px] px-2.5 rounded-full"
                  >
                    {st === "TODOS" ? "Todos" : STATUS_DESTINACAO_LABELS[st as DestinacaoCartaoVermelho]?.label.split(" ")[0]}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                size="sm"
                variant={showArquivados ? "default" : "outline"}
                onClick={() => { setShowArquivados(!showArquivados); setStatusFilter("TODOS"); }}
                className="h-7 text-[11px] px-3 gap-1.5 rounded-full"
              >
                <Archive className="h-3.5 w-3.5" />
                {showArquivados ? `Ativos (${descartesAtivos.length})` : `Histórico (${descartesArquivados.length})`}
              </Button>
              <div className="text-xs text-muted-foreground">
                {showArquivados ? (
                  <span>Histórico arquivado: <strong className="text-green-700">{descartesArquivados.length} itens</strong></span>
                ) : (
                  <span>Em quarentena: <strong className="text-rose-600">{descartesAtivos.filter(d => d.destinacao_status === "PENDENTE").length} itens</strong></span>
                )}
              </div>
            </div>
          </div>

          {/* Listagem dos Cartões Vermelhos */}
          {descartesFiltrados.length === 0 ? (
            <Card className="p-12 text-center border-dashed">
              <AlertOctagon className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm font-semibold text-muted-foreground">
                Nenhum item com Cartão Vermelho encontrado para o filtro selecionado.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Utilize o Cartão Vermelho para retirar itens sem uso imediato das áreas produtivas e dar destinação correta.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {descartesFiltrados.map((item) => {
                const statusInfo = STATUS_DESTINACAO_LABELS[item.destinacao_status] || STATUS_DESTINACAO_LABELS.PENDENTE;
                const StatusIcon = statusInfo.icon;
                const isVencido = item.data_limite && new Date(item.data_limite) < new Date() && item.destinacao_status === "PENDENTE";

                return (
                  <Card
                    key={item.id}
                    className={`border shadow-sm flex flex-col justify-between overflow-hidden ${
                      isVencido ? "border-rose-400 bg-rose-50/20" : ""
                    }`}
                  >
                    <div>
                      {/* Foto ou Placeholder com Tag */}
                      <div className="h-40 bg-muted relative overflow-hidden border-b">
                        {item.foto_url ? (
                          <img
                            src={item.foto_url}
                            alt={item.item_descricao}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                            <AlertOctagon className="h-8 w-8 text-rose-500/50 mb-1" />
                            <span className="text-[11px]">Sem foto anexada</span>
                          </div>
                        )}

                        <Badge className="absolute top-2 left-2 bg-rose-600 text-white font-bold text-[10px]">
                          CARTÃO VERMELHO
                        </Badge>

                        {isVencido && (
                          <Badge className="absolute top-2 right-2 bg-red-800 text-white font-bold text-[10px] animate-pulse">
                            PRAZO EXPIRADO
                          </Badge>
                        )}
                      </div>

                      <CardContent className="p-4 space-y-3">
                        <div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span className="font-bold text-foreground">
                              {item.setor_nome || "Setor Não Especificado"}
                            </span>
                            <span>Prazo: {item.data_limite || "Indefinido"}</span>
                          </div>
                          <h4 className="font-bold text-sm text-foreground mt-1">
                            {item.item_descricao}
                          </h4>
                          {item.localizacao && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                              <MapPin className="h-3 w-3 text-primary" />
                              Local: {item.localizacao}
                            </p>
                          )}
                        </div>

                        <div>
                          <Badge variant="outline" className={`text-xs font-semibold ${statusInfo.cor}`}>
                            <StatusIcon className="h-3.5 w-3.5 mr-1" />
                            {statusInfo.label}
                          </Badge>
                        </div>
                      </CardContent>
                    </div>

                    {/* Ações de Gestão (Se canEdit) */}
                    {canEdit && (
                      <div className="p-3 bg-muted/30 border-t flex flex-wrap items-center justify-between gap-2">
                        <select
                          value={item.destinacao_status}
                          onChange={(e) =>
                            handleMudarStatusCartao(
                              item.id,
                              e.target.value as DestinacaoCartaoVermelho
                            )
                          }
                          className="h-8 text-xs rounded border border-input bg-background px-2"
                        >
                          <option value="PENDENTE">Quarentena (Pendente)</option>
                          <option value="EM_ANDAMENTO">Em Andamento</option>
                          <option value="DOACAO">Doação</option>
                          <option value="SUCATA">Sucata / Reciclar</option>
                          <option value="RETORNO">Retorno ao Setor</option>
                          <option value="LEILAO">Leilão Interno</option>
                          <option value="CONCLUIDO">Concluído / Arquivado</option>
                        </select>

                        <div className="flex items-center gap-1">
                          {!item.arquivado && item.destinacao_status !== "CONCLUIDO" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleArquivarCartao(item.id)}
                              className="h-8 text-xs px-2 gap-1 border-emerald-300 text-emerald-800 hover:bg-emerald-50"
                              title="Marcar como Concluído e Arquivar"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                              Arquivar
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteCartao(item.id)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-600"
                            title="Excluir Registro"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* TAB 2: CRONOGRAMA & DIAS D */}
        <TabsContent value="eventos" className="space-y-4 pt-2">
          {eventos.length === 0 ? (
            <Card className="p-12 text-center border-dashed">
              <CalendarIcon className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm font-semibold text-muted-foreground">
                Nenhum evento agendado no cronograma do 5S.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Agende o "Dia D da Limpeza", workshops ou as próximas auditorias cruzadas.
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {eventos.map((ev) => (
                <Card
                  key={ev.id}
                  className={`p-4 border transition-all ${
                    ev.concluido
                      ? "bg-muted/30 opacity-70 border-muted"
                      : "bg-card hover:bg-muted/20 shadow-sm"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        disabled={!canEdit}
                        onClick={() => handleToggleEventoConcluido(ev)}
                        className={`w-6 h-6 rounded-md border mt-0.5 flex items-center justify-center transition-all ${
                          ev.concluido
                            ? "bg-emerald-600 border-emerald-600 text-white"
                            : "border-input bg-background hover:border-primary"
                        }`}
                      >
                        {ev.concluido && <Check className="h-4 w-4 stroke-[3]" />}
                      </button>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4
                            className={`font-bold text-sm text-foreground ${
                              ev.concluido ? "line-through text-muted-foreground" : ""
                            }`}
                          >
                            {ev.titulo}
                          </h4>
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-bold ${
                              ev.tipo === "DIA_D"
                                ? "bg-amber-50 text-amber-800 border-amber-300"
                                : ev.tipo === "AUDITORIA_CRUZADA"
                                ? "bg-purple-50 text-purple-800 border-purple-300"
                                : ev.tipo === "TREINAMENTO"
                                ? "bg-blue-50 text-blue-800 border-blue-300"
                                : "bg-slate-100 text-slate-800 border-slate-300"
                            }`}
                          >
                            {ev.tipo === "DIA_D"
                              ? "Dia D da Limpeza"
                              : ev.tipo === "AUDITORIA_CRUZADA"
                              ? "Auditoria Cruzada"
                              : ev.tipo === "TREINAMENTO"
                              ? "Capacitação"
                              : "Comitê 5S"}
                          </Badge>
                          {ev.setor_nome && (
                            <Badge variant="secondary" className="text-[10px]">
                              {ev.setor_nome}
                            </Badge>
                          )}
                        </div>

                        {ev.descricao && (
                          <p className="text-xs text-muted-foreground">
                            {ev.descricao}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1">
                          <span className="flex items-center gap-1 font-medium">
                            <CalendarIcon className="h-3 w-3 text-primary" />
                            Data: <strong>{ev.data_evento}</strong>
                          </span>
                          {ev.horario && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" /> Horário: {ev.horario}
                            </span>
                          )}
                          {ev.responsavel && (
                            <span>Responsável: <strong>{ev.responsavel}</strong></span>
                          )}
                        </div>
                      </div>
                    </div>

                    {canEdit && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteEvento(ev.id)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-600 self-end sm:self-center"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* MODAL NOVO CARTÃO VERMELHO */}
      <Dialog open={isNovoCartaoOpen} onOpenChange={setIsNovoCartaoOpen}>
        <DialogContent className="max-w-md w-full bg-background rounded-2xl shadow-2xl border">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <AlertOctagon className="h-5 w-5 text-rose-600" />
              Etiquetar Item com Cartão Vermelho
            </DialogTitle>
            <DialogDescription className="text-xs">
              Registre o descarte provisório de um item para avaliação na área de quarentena (Seiri).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-xs font-semibold">Setor de Origem *</Label>
              <select
                value={novoSetorId}
                onChange={(e) => setNovoSetorId(e.target.value)}
                className="w-full mt-1 h-9 rounded-md border border-input bg-background px-3 text-xs"
              >
                {setores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nome_setor}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold">Descrição do Item *</Label>
              <Input
                placeholder="Ex: Cadeira quebrada, 12 caixas de arquivo morto 2018..."
                value={novoItemDesc}
                onChange={(e) => setNovoItemDesc(e.target.value)}
                className="text-xs mt-1 h-9"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Local de Quarentena</Label>
                <Input
                  placeholder="Ex: Galpão B, Caixa 04"
                  value={novoLocalizacao}
                  onChange={(e) => setNovoLocalizacao(e.target.value)}
                  className="text-xs mt-1 h-9"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Data Limite Decisão *</Label>
                <Input
                  type="date"
                  value={novoDataLimite}
                  onChange={(e) => setNovoDataLimite(e.target.value)}
                  className="text-xs mt-1 h-9"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Destinação Inicial Prevista</Label>
              <select
                value={novoDestinacao}
                onChange={(e) => setNovoDestinacao(e.target.value as DestinacaoCartaoVermelho)}
                className="w-full mt-1 h-9 rounded-md border border-input bg-background px-3 text-xs"
              >
                <option value="PENDENTE">Aguardando Decisão (Quarentena)</option>
                <option value="DOACAO">Doação</option>
                <option value="SUCATA">Sucata / Reciclagem</option>
                <option value="RETORNO">Retorno ao Setor</option>
                <option value="LEILAO">Leilão Interno</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Foto do Item (Opcional)</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="text-xs h-9 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-white"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsNovoCartaoOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSalvarCartaoVermelho}
              disabled={saving}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
            >
              {saving ? "Salvando..." : "Registrar Cartão Vermelho"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL NOVO EVENTO */}
      <Dialog open={isNovoEventoOpen} onOpenChange={setIsNovoEventoOpen}>
        <DialogContent className="max-w-md w-full bg-background rounded-2xl shadow-2xl border">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <CalendarIcon className="h-5 w-5 text-primary" />
              Agendar Evento do Programa 5S
            </DialogTitle>
            <DialogDescription className="text-xs">
              Defina mutirões de Dia D, auditorias cruzadas ou capacitações.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-xs font-semibold">Título do Evento *</Label>
              <Input
                placeholder="Ex: Grande Mutirão de Limpeza - Dia D Seiso"
                value={novoEventoTitulo}
                onChange={(e) => setNovoEventoTitulo(e.target.value)}
                className="text-xs mt-1 h-9"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Tipo de Evento</Label>
                <select
                  value={novoEventoTipo}
                  onChange={(e) => setNovoEventoTipo(e.target.value as any)}
                  className="w-full mt-1 h-9 rounded-md border border-input bg-background px-3 text-xs"
                >
                  <option value="DIA_D">Dia D da Limpeza</option>
                  <option value="AUDITORIA_CRUZADA">Auditoria Cruzada</option>
                  <option value="TREINAMENTO">Capacitação / Workshop</option>
                  <option value="COMITE">Reunião de Comitê</option>
                </select>
              </div>

              <div>
                <Label className="text-xs font-semibold">Data do Evento *</Label>
                <Input
                  type="date"
                  value={novoEventoData}
                  onChange={(e) => setNovoEventoData(e.target.value)}
                  className="text-xs mt-1 h-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Horário Previsto</Label>
                <Input
                  placeholder="Ex: 08:30 às 11:30"
                  value={novoEventoHorario}
                  onChange={(e) => setNovoEventoHorario(e.target.value)}
                  className="text-xs mt-1 h-9"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Responsável</Label>
                <Input
                  placeholder="Ex: Coordenador do 5S"
                  value={novoEventoResponsavel}
                  onChange={(e) => setNovoEventoResponsavel(e.target.value)}
                  className="text-xs mt-1 h-9"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Setor Específico (Opcional)</Label>
              <select
                value={novoEventoSetorId}
                onChange={(e) => setNovoEventoSetorId(e.target.value)}
                className="w-full mt-1 h-9 rounded-md border border-input bg-background px-3 text-xs"
              >
                <option value="">Todos os Setores (Geral da Empresa)</option>
                {setores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nome_setor}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold">Orientações aos Colaboradores</Label>
              <Textarea
                placeholder="Instruções de segurança, EPIs necessários, descarte..."
                value={novoEventoDescricao}
                onChange={(e) => setNovoEventoDescricao(e.target.value)}
                className="text-xs mt-1 min-h-[60px]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsNovoEventoOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSalvarEvento}
              disabled={saving}
              className="bg-primary text-white font-bold"
            >
              {saving ? "Agendando..." : "Confirmar Agendamento"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}