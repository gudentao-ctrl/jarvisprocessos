import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook to get the currently selected company from the global filter.
 * In the existing app there is a global company filter displayed in the top‑right corner.
 * This placeholder implementation reads the selected company from `supabase` storage
 * (or from a query param) and returns it. Adjust as needed to match the real implementation.
 */
export function useCompanyFilter() {
  const [companyId, setCompanyId] = useState<string | null>(null);

  useEffect(() => {
    // Try to read the selected company from localStorage (used by the app for the filter)
    const stored = localStorage.getItem("selectedCompanyId");
    if (stored) setCompanyId(stored);
    // If not present, you could fetch user profile or default company via supabase
    // This is a simple fallback – real logic may differ.
  }, []);

  return { companyId, setCompanyId };
}
