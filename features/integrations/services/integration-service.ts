import { api, type Paged } from "@/lib/api-client";
import type { ConnectionFormValues } from "../schemas/integration.schema";
import type { Connection, ConnectionStatus, Provider } from "../types/integration.types";

export const integrationService = {
  list: (params: { q?: string; provider?: Provider; status?: ConnectionStatus; page?: number }) =>
    api<Paged<Connection> & { journlApiAvailable: boolean }>("/admin/integrations", { query: { ...params } }),
  create: (v: ConnectionFormValues) =>
    api<Connection>("/admin/integrations", {
      method: "POST",
      body: { client_id: Number(v.client_id), provider: v.provider, external_org_name: v.external_org_name || null, external_org_id: v.external_org_id || null },
    }),
  verify: ({ id, note }: { id: number; note: string }) => api<Connection>(`/admin/integrations/${id}/verify`, { method: "POST", body: { note } }),
  healthCheck: (id: number) => api<Connection>(`/admin/integrations/${id}/health-check`, { method: "POST" }),
};
