import type { ReactNode } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import type { PermissionAction } from "@/lib/permission-catalog";

export function CanAccess({ module, subModule, action = "read", companyId, children, fallback = null }: {
  module: string; subModule?: string; action?: PermissionAction; companyId?: string | null; children: ReactNode; fallback?: ReactNode;
}) {
  const { hasAccess } = usePermissions();
  return hasAccess(subModule ?? module, action, companyId) ? children : fallback;
}