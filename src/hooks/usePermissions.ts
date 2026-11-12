import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMe } from "@/lib/access.functions";
import { useActiveCompany } from "@/lib/active-company";
import { ALL_PERMISSION_TOOLS, canUsePermission, toolsForPath, type PermissionAction } from "@/lib/permission-catalog";

export function usePermissions() {
  const { companyId, companies, loading: companiesLoading } = useActiveCompany();
  const getProfile = useServerFn(getMe);
  const { data: profile, isPending, error } = useQuery({ queryKey: ["me"], queryFn: () => getProfile(), staleTime: 60_000 });
  // Until the company list resolves, a saved company id may be stale; keep access closed meanwhile.
  const companyResolving = companiesLoading || (!!companyId && companies.length > 0 && !companies.some((c) => c.id === companyId));
  const pending = isPending || (!profile?.isSuperadmin && companyResolving);
  const membership = profile?.memberships.find((item) => item.company_id === companyId);
  const hasAccess = (tool: string, action: PermissionAction = "read", explicitCompany?: string | null) => {
    if (profile?.isSuperadmin) return true;
    if (pending && explicitCompany === undefined) return false;
    if (profile?.status !== "active") return false;
    const scope = explicitCompany === undefined ? companyId : explicitCompany;
    const members = scope ? profile.memberships.filter((item) => item.company_id === scope) : profile.memberships;
    const keys = ALL_PERMISSION_TOOLS.some((item) => item.key === tool) ? [tool] : ALL_PERMISSION_TOOLS.filter((item) => item.category === tool).map((item) => item.key);
    return members.some((item) => keys.some((key) => canUsePermission(item.granularPermissions ?? item.permissions, key, action)));
  };
  return {
    companyId, profile, isPending: pending, error, isSuperadmin: profile?.isSuperadmin === true,
    role: profile?.isSuperadmin ? "SUPERADMIN" : membership?.accessRole,
    hasAccess, canDelete: (tool: string) => hasAccess(tool, "delete"),
    canAccessPath: (path: string) => toolsForPath(path).some((key) => hasAccess(key)),
  };
}