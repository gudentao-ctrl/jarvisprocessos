// src/components/recrutamento/BancoTalentosDrawer.tsx
// Visualização Global do Banco de Currículos / Talentos com Busca e Reativação para Vagas Ativas

import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FolderArchive,
  Search,
  UserCheck,
  Mail,
  Phone,
  FileText,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { RecrutamentoCandidato, Vaga } from "@/lib/recrutamento-types";
import { getBancoTalentos, reativarCandidatoDoBanco } from "@/lib/recrutamento-storage";

interface BancoTalentosDrawerProps {
  vagas: Vaga[];
  isOpen: boolean;
  onClose: () => void;
  onCandidatoReativado: () => void;
}

export default function BancoTalentosDrawer({
  vagas,
  isOpen,
  onClose,
  onCandidatoReativado,
}: BancoTalentosDrawerProps) {
  const [banco, setBanco] = useState<RecrutamentoCandidato[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedVagaReativar, setSelectedVagaReativar] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      loadBanco();
    }
  }, [isOpen, search]);

  const loadBanco = async () => {
    try {
      setLoading(true);
      const list = await getBancoTalentos(search);
      setBanco(list);
    } catch (err) {
      console.error("Error loading banco de talentos:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleReativar = async (candidatoId: string, candidatoNome: string) => {
    const vagaId = selectedVagaReativar[candidatoId] || vagas[0]?.id;
    if (!vagaId) {
      toast.error("Selecione uma vaga para reativar o candidato.");
      return;
    }

    try {
      await reativarCandidatoDoBanco(candidatoId, vagaId);
      const vagaAlvo = vagas.find((v) => v.id === vagaId);
      toast.success(`${candidatoNome} reativado e inserido na Triagem de ${vagaAlvo?.titulo || "nova vaga"}!`);
      loadBanco();
      onCandidatoReativado();
    } catch (err: any) {
      toast.error(err.message || "Erro ao reativar candidato.");
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="sm:max-w-xl w-full flex flex-col p-0">
        <SheetHeader className="p-4 border-b bg-muted/20">
          <div className="flex items-center gap-2 text-primary">
            <FolderArchive className="h-5 w-5" />
            <div>
              <SheetTitle className="text-base font-bold">Banco Global de Currículos</SheetTitle>
              <SheetDescription className="text-xs">
                Base consolidada de candidatos para reaproveitamento em novos processos seletivos.
              </SheetDescription>
            </div>
          </div>

          {/* Barra de Busca */}
          <div className="pt-2 relative">
            <Search className="h-4 w-4 absolute left-2.5 top-5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, formação, ferramenta..."
              className="text-xs pl-8 bg-background"
            />
          </div>
        </SheetHeader>

        {/* Lista de Talentos */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="text-center py-8 text-xs text-muted-foreground">
              Carregando talentos arquivados...
            </div>
          ) : banco.length === 0 ? (
            <div className="text-center py-12 text-xs text-muted-foreground space-y-1">
              <FolderArchive className="h-8 w-8 mx-auto text-muted-foreground/50" />
              <p className="font-semibold">Nenhum currículo no Banco de Talentos</p>
              <p className="text-[11px]">Candidatos reprovados em processos seletivos aparecerão aqui automaticamente.</p>
            </div>
          ) : (
            banco.map((cand) => (
              <div
                key={cand.id}
                className="p-3 rounded-lg border bg-card hover:border-primary/40 transition-all space-y-2 text-xs"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-foreground">{cand.nome}</h4>
                    <p className="text-[11px] text-muted-foreground">{cand.formacao || "Formação não informada"}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] uppercase font-mono">
                    {cand.status_global}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-1 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3 text-emerald-500" />
                    {cand.telefone || "-"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Mail className="h-3 w-3 text-sky-500" />
                    {cand.email || "-"}
                  </span>
                </div>

                {/* Ferramentas */}
                {cand.ferramentas && cand.ferramentas.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {cand.ferramentas.map((f, i) => (
                      <Badge key={i} variant="secondary" className="text-[9px] py-0">
                        {f}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Experiências */}
                {cand.experiencias && (
                  <p className="text-[11px] text-muted-foreground line-clamp-2 bg-muted/30 p-2 rounded">
                    {cand.experiencias}
                  </p>
                )}

                {/* Ação de Reativação para Vaga Aberta */}
                <div className="pt-2 border-t flex items-center justify-between gap-2">
                  <div className="flex-1">
                    <Select
                      value={selectedVagaReativar[cand.id] || vagas[0]?.id || ""}
                      onValueChange={(val) =>
                        setSelectedVagaReativar({ ...selectedVagaReativar, [cand.id]: val })
                      }
                    >
                      <SelectTrigger className="text-[11px] h-7">
                        <SelectValue placeholder="Selecione a vaga" />
                      </SelectTrigger>
                      <SelectContent>
                        {vagas.map((v) => (
                          <SelectItem key={v.id} value={v.id} className="text-xs">
                            {v.titulo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleReativar(cand.id, cand.nome)}
                    className="h-7 text-xs bg-primary hover:bg-primary/90 text-primary-foreground shrink-0"
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Reativar no Funil
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
