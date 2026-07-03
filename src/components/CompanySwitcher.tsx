import { Building2, ChevronsUpDown, Check } from "lucide-react";
import { useState } from "react";
import { useActiveCompany } from "@/lib/active-company";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export function CompanySwitcher() {
  const { company, companies, setCompanyId } = useActiveCompany();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 max-w-[220px] gap-2 truncate"
        >
          <Building2 className="h-4 w-4 shrink-0 text-primary" />
          <span className="truncate text-sm font-medium">
            {company?.name ?? "Selecionar empresa"}
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[260px] p-1">
        {companies.length === 0 ? (
          <p className="p-3 text-xs text-muted-foreground">
            Cadastre uma empresa primeiro em Empresas.
          </p>
        ) : (
          <div className="max-h-[300px] overflow-y-auto">
            {companies.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setCompanyId(c.id);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-accent",
                  company?.id === c.id && "bg-accent",
                )}
              >
                <Check
                  className={cn(
                    "h-4 w-4 shrink-0",
                    company?.id === c.id ? "text-primary" : "opacity-0",
                  )}
                />
                <span className="truncate">{c.name}</span>
              </button>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
