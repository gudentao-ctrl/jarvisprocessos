import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listCompanies } from "@/lib/interviews.functions";

const KEY = "jarvis:active_company_id";

type Ctx = {
  companyId: string | null;
  company: { id: string; name: string } | null;
  companies: Array<{ id: string; name: string }>;
  setCompanyId: (id: string | null) => void;
  loading: boolean;
};

const CompanyCtx = createContext<Ctx>({
  companyId: null,
  company: null,
  companies: [],
  setCompanyId: () => {},
  loading: false,
});

export function ActiveCompanyProvider({ children }: { children: ReactNode }) {
  const list = useServerFn(listCompanies);
  const qc = useQueryClient();
  const { data: companies = [], isLoading } = useQuery({
    queryKey: ["companies"],
    queryFn: () => list(),
  });

  const [companyId, setCompanyIdState] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(KEY);
  });

  // Auto-pick when only one company exists and none selected
  useEffect(() => {
    if (!companyId && companies.length === 1) {
      setCompanyId(companies[0].id);
    }
    // If saved id no longer exists, clear it
    if (companyId && companies.length > 0 && !companies.find((c: any) => c.id === companyId)) {
      setCompanyId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companies]);

  function setCompanyId(id: string | null) {
    setCompanyIdState(id);
    if (typeof window !== "undefined") {
      if (id) window.localStorage.setItem(KEY, id);
      else window.localStorage.removeItem(KEY);
    }
    // Refetch everything scoped to a company
    qc.invalidateQueries();
  }

  const company = useMemo(
    () => companies.find((c: any) => c.id === companyId) ?? null,
    [companies, companyId],
  );

  const value: Ctx = {
    companyId,
    company,
    companies,
    setCompanyId,
    loading: isLoading,
  };
  return <CompanyCtx.Provider value={value}>{children}</CompanyCtx.Provider>;
}

export function useActiveCompany() {
  return useContext(CompanyCtx);
}
