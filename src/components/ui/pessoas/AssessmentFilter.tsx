import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface AssessmentFilterProps {
  search?: string;
  onSearchChange?: (val: string) => void;
  status?: string;
  onStatusChange?: (val: string) => void;
  totalCount?: number;
}

export function AssessmentFilter({
  search = "",
  onSearchChange,
  status = "todos",
  onStatusChange,
  totalCount,
}: AssessmentFilterProps) {
  const statuses = [
    { id: "todos", label: "Todos" },
    { id: "aguardando", label: "Aguardando" },
    { id: "em_teste", label: "Em Teste" },
    { id: "concluido", label: "Concluído" },
  ];

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-lg border">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Buscar por nome ou CPF..."
          value={search}
          onChange={(e) => onSearchChange?.(e.target.value)}
          className="pl-9 h-9"
        />
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
        {statuses.map((s) => {
          const isActive = (status || "todos") === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onStatusChange?.(s.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {typeof totalCount === "number" && (
        <span className="text-xs text-muted-foreground self-center hidden md:inline">
          {totalCount} registro(s)
        </span>
      )}
    </div>
  );
}

export default AssessmentFilter;
