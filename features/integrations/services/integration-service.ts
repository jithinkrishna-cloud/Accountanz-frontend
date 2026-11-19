import { api, type Paged } from "@/lib/api-client";
import type { Connection, ConnectionStatus, JournlOverview, Provider } from "../types/integration.types";

/** Read-only: existing JournL sign-in connections. New connections use Bizpole Books (client portal → Integrations). */
export const integrationService = {
  list: (params: { q?: string; provider?: Provider; status?: ConnectionStatus; page?: number }) =>
    api<Paged<Connection>>("/admin/integrations", { query: { ...params } }),
  journlData: (id: number, period: { from?: string; to?: string }) => api<JournlOverview>(`/admin/integrations/${id}/journl-data`, { query: period }),
};
