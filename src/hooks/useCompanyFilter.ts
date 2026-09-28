import { useActiveCompany } from "@/lib/active-company";

/**
 * Hook to get the currently selected company from the global filter.
 * Delegates to the global ActiveCompanyProvider context.
 */
export function useCompanyFilter() {
  const { companyId, company, companies, setCompanyId, loading } = useActiveCompany();

  return {
    companyId,
    selectedCompanyId: companyId,
    company,
    companies: companies ?? [],
    setCompanyId,
    loading,
  };
}
