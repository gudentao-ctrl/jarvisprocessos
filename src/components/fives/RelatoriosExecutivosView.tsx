// src/components/fives/RelatoriosExecutivosView.tsx
// Geração e Download dos Relatórios Executivos e Certificados de Setores em PDF

import React, { useState } from "react";
import {
  FileText,
  Award,
  Download,
  Sparkles,
  Printer,
  CheckCircle2,
  Building2,
  Calendar,
  Layers,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

import type { FivesPortalData, FivesSetor } from "@/lib/fives-types";
import {
  generateCertificadoSetorPdf,
  generateRelatorioExecutivo5SPdf,
} from "@/lib/fives-pdf";

interface RelatoriosExecutivosViewProps {
  portalData: FivesPortalData;
}

export function RelatoriosExecutivosView({ portalData }: RelatoriosExecutivosViewProps) {
  const { config, company, setores, kpis } = portalData;

  const [selectedSetorId, setSelectedSetorId] = useState<string>(
    setores[0]?.id || ""
  );
  const [generatingCert, setGeneratingCert] = useState(false);
  const [generatingRel, setGeneratingRel] = useState(false);

  const selectedSetor = setores.find((s) => s.id === selectedSetorId) || setores[0];

  const handleDownloadCertificado = async (setor?: FivesSetor) => {
    const target = setor || selectedSetor;
    if (!target) {
      toast.error("Nenhum setor disponível para gerar certificado.");
      return;
    }

    try {
      setGeneratingCert(true);
      toast.info(`Gerando Certificado 5S para o setor ${target.nome_setor}...`);

      const nota = target.ultima_nota || target.meta_nota || 90;
      const selo = nota >= 90 ? "Ouro" : nota >= 80 ? "Prata" : "Atencao";

      await generateCertificadoSetorPdf({
        setor: target,
        companyName: company.name,
        logoClienteUrl: config.logo_url || company.logo_url || null,
        primaryColor: config.primary_color || "#3E100C",
        secondaryColor: config.secondary_color || "#E05A10",
      });

      toast.success("Certificado gerado e baixado com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao gerar certificado: " + (err?.message || "Tente novamente"));
    } finally {
      setGeneratingCert(false);
    }
  };

  const handleDownloadRelatorioExecutivo = async () => {
    try {
      setGeneratingRel(true);
      toast.info("Compilando Relatório Executivo Geral 5S em PDF...");
      await generateRelatorioExecutivo5SPdf(portalData);
      toast.success("Relatório Executivo baixado com sucesso!");
    } catch (err: any) {
      toast.error("Erro ao gerar relatório executivo: " + (err?.message || "Tente novamente"));
    } finally {
      setGeneratingRel(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Relatórios Executivos & Certificações 5S (PDF Whitelabel)
        </h2>
        <p className="text-xs text-muted-foreground">
          Emita certificados ornamentais para impressão e afixação nos murais dos setores e relatórios executivos com cabeçalho duplo (Cliente + Maia Consultoria).
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CARD 1: CERTIFICADO DE SETOR */}
        <Card className="border shadow-sm flex flex-col justify-between">
          <CardHeader className="pb-3 border-b bg-muted/20">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Award className="h-5 w-5 text-amber-500" />
                Certificado Oficial de Setor (A4 Paisagem)
              </CardTitle>
              <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-bold text-xs">
                Mural Físico
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Diploma ornamental com moldura nobre, insígnias de Selo Ouro/Prata e assinaturas do Guardião e Auditor Líder.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-5 space-y-4">
            {/* Seletor de Setor */}
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Selecione o Setor para Emissão:
              </label>
              <select
                value={selectedSetorId}
                onChange={(e) => setSelectedSetorId(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs font-semibold"
              >
                {setores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nome_setor} — Nota: {s.ultima_nota ? `${s.ultima_nota.toFixed(1)}%` : "Pendente"} ({s.selo || "Atenção"})
                  </option>
                ))}
              </select>
            </div>

            {/* Pré-visualização do Certificado */}
            {selectedSetor && (
              <div
                className="p-5 rounded-xl border-2 text-center space-y-3 relative overflow-hidden shadow-inner"
                style={{
                  borderColor: config.primary_color || "#3E100C",
                  backgroundColor: "#FFFFFF",
                }}
              >
                <div className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                  PROGRAMA 5S • CERTIFICADO DE CONFORMIDADE
                </div>
                <h3
                  className="text-xl font-black"
                  style={{ color: config.secondary_color || "#E05A10" }}
                >
                  {selectedSetor.nome_setor}
                </h3>
                <div className="flex items-center justify-center gap-3">
                  <Badge
                    className={`font-bold text-xs px-3 py-1 ${
                      selectedSetor.selo === "Ouro"
                        ? "bg-amber-100 text-amber-800 border-amber-300"
                        : selectedSetor.selo === "Prata"
                        ? "bg-slate-100 text-slate-800 border-slate-300"
                        : "bg-rose-100 text-rose-800 border-rose-300"
                    }`}
                  >
                    <Sparkles className="h-3.5 w-3.5 mr-1" />
                    Selo {selectedSetor.selo || "Em Avaliação"} (
                    {selectedSetor.ultima_nota
                      ? `${selectedSetor.ultima_nota.toFixed(1)}%`
                      : "Pendente"}
                    )
                  </Badge>
                </div>
                <div className="text-[11px] text-muted-foreground pt-1">
                  Empresa: <strong>{company.name}</strong> • Guardião: <strong>{selectedSetor.guardiao_nome || "Comitê"}</strong>
                </div>
              </div>
            )}

            <Button
              onClick={() => handleDownloadCertificado()}
              disabled={generatingCert || !selectedSetor}
              className="w-full font-bold text-xs h-10 shadow-md text-white"
              style={{ backgroundColor: config.primary_color || "#3E100C" }}
            >
              <Download className="h-4 w-4 mr-2" />
              {generatingCert ? "Gerando Certificado..." : "Baixar Certificado em PDF (A4 Paisagem)"}
            </Button>
          </CardContent>
        </Card>

        {/* CARD 2: RELATÓRIO EXECUTIVO GERAL */}
        <Card className="border shadow-sm flex flex-col justify-between">
          <CardHeader className="pb-3 border-b bg-muted/20">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Relatório Executivo 5S & DRE de Qualidade (PDF)
              </CardTitle>
              <Badge className="bg-primary/10 text-primary border-primary/20 font-bold text-xs">
                Diretoria & Comitê
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Dossiê completo contendo cabeçalho duplo (Cliente e Maia Consultoria), radar dos sensos, ranking geral e plano de ação.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-5 space-y-4">
            <div className="bg-muted/30 p-4 rounded-xl border text-xs space-y-2">
              <div className="font-bold text-foreground flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Conteúdo do Relatório Executivo:
              </div>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground pl-1">
                <li>Cabeçalho Whitelabel com Logo da {company.name} e da Maia Consultoria</li>
                <li>Painel com Big Numbers Globais e Setor Campeão ({kpis.setorCampeao?.nome_setor || "N/A"})</li>
                <li>Tabela de Desempenho detalhado nos 5 Sensos (Seiri, Seiton, Seiso, Seiketsu, Shitsuke)</li>
                <li>Leaderboard consolidado de todos os {setores.length} setores</li>
                <li>Acompanhamento dos descartes do Cartão Vermelho e Planos de Ação</li>
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-3 text-center text-xs">
              <div className="p-2.5 rounded-lg border bg-card">
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">
                  Média Atual
                </span>
                <span className="text-xl font-black text-foreground">
                  {kpis.notaMediaGlobal.toFixed(1)}%
                </span>
              </div>
              <div className="p-2.5 rounded-lg border bg-card">
                <span className="text-muted-foreground block text-[10px] uppercase font-bold">
                  Total de Setores
                </span>
                <span className="text-xl font-black text-foreground">
                  {setores.length}
                </span>
              </div>
            </div>

            <Button
              onClick={handleDownloadRelatorioExecutivo}
              disabled={generatingRel}
              className="w-full font-bold text-xs h-10 shadow-md text-white"
              style={{ backgroundColor: config.secondary_color || "#E05A10" }}
            >
              <Download className="h-4 w-4 mr-2" />
              {generatingRel ? "Gerando Relatório..." : "Baixar Relatório Executivo 5S (PDF)"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Tabela Rápida de Certificação por Setor */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-3 border-b bg-muted/20">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            Quadro de Certificação Rápida de Todos os Setores
          </CardTitle>
          <CardDescription className="text-xs">
            Gere e imprima os certificados individuais de cada setor com um clique.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b bg-muted/40 font-semibold text-muted-foreground">
                  <th className="p-3">Posição</th>
                  <th className="p-3">Setor</th>
                  <th className="p-3">Guardião</th>
                  <th className="p-3">Nota Atual</th>
                  <th className="p-3">Selo Conquistado</th>
                  <th className="p-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {setores.map((setor, idx) => (
                  <tr key={setor.id} className="hover:bg-muted/20 transition-colors">
                    <td className="p-3 font-bold text-muted-foreground">
                      {idx + 1}º
                    </td>
                    <td className="p-3 font-bold text-foreground">
                      {setor.nome_setor}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {setor.guardiao_nome || "Comitê 5S"}
                    </td>
                    <td className="p-3 font-black text-foreground">
                      {setor.ultima_nota ? `${setor.ultima_nota.toFixed(1)}%` : "Pendente"}
                    </td>
                    <td className="p-3">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-bold ${
                          setor.selo === "Ouro"
                            ? "bg-amber-100 text-amber-800 border-amber-300"
                            : setor.selo === "Prata"
                            ? "bg-slate-100 text-slate-800 border-slate-300"
                            : "bg-rose-100 text-rose-800 border-rose-300"
                        }`}
                      >
                        Selo {setor.selo || "Atenção"}
                      </Badge>
                    </td>
                    <td className="p-3 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownloadCertificado(setor)}
                        className="h-7 text-xs font-semibold"
                      >
                        <Download className="h-3 w-3 mr-1" /> Certificado
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}