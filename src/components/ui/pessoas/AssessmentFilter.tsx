import { Input } from "@/components/ui/input";
import { Search, Building2, UserCheck, Filter } from "lucide-react";
import { Label } from "@/components/ui/label";

interface AssessmentFilterProps {
  search?: string;
  onSearchChange?: (val: string) => void;
  status?: string;
  onStatusChange?: (val: string) => void;
  vinculo?: string;
  onVinculoChange?: (val: string) => void;
  companies?: Array<{ id: string; name: string }>;
  totalCount?: number;
}

export function AssessmentFilter({
  search = "",
  onSearchChange,
  status = "todos",
  onStatusChange,
  vinculo = "todos",
  onVinculoChange,
  companies = [],
  totalCount,
}: AssessmentFilterProps) {
  const statuses = [
    { id: "todos", label: "Todos os Status" },
    { id: "aguardando", label: "Aguardando" },
    { id: "em_teste", label: "Em Teste" },
    { id: "concluido", label: "Concluído" },
  ];

  return (
    <div className="flex flex-col gap-3 bg-card p-3.5 rounded-lg border shadow-xs">
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar por nome, cargo ou CPF..."
            value={search}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>

        {/* Independent Vínculo Filter */}
        <div className="flex items-center gap-2 min-w-[240px]">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">
            <Building2 className="h-3.5 w-3.5 text-primary" />
            <span>Vínculo:</span>
          </div>
          <select
            value={vinculo}
            onChange={(e) => onVinculoChange?.(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="todos">Todos os Vínculos (Geral)</option>
            <option value="externo">Candidato Externo (Sem Vínculo)</option>
            {companies.length > 0 && (
              <optgroup label="Empresas Cadastradas">
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    Empresa: {c.name}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>
      </div>

      {/* Status Chips & Counter */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/50">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs text-muted-foreground mr-1 flex items-center gap-1">
            <Filter className="h-3 w-3" /> Status:
          </span>
          {statuses.map((s) => {
            const isActive = (status || "todos") === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => onStatusChange?.(s.id)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {s.label}
              </button>
            );
          })}
        </div>

        {typeof totalCount === "number" && (
          <span className="text-xs text-muted-foreground self-center">
            <strong>{totalCount}</strong> teste(s) encontrado(s)
          </span>
        )}
      </div>
    </div>
  );
}

export default AssessmentFilter;
