import { api, type Paged } from "@/lib/api-client";
import type { AuditLog } from "../types/audit.types";

export const auditService = {
  list: (params: { q?: string; page?: number }) => api<Paged<AuditLog>>("/admin/audit-logs", { query: params }),
};
