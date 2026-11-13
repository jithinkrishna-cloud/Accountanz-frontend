import { api } from "@/lib/api-client";
import type { JournlOverview } from "@/features/integrations/types/integration.types";
import type { JournlViewQuery, JournlViewResult, JournlWorkspace } from "../types/journl-workspace.types";

/** Read-only JournL access for the accountant workspace (GET only; JournL stays the source of truth). */
export const journlWorkspaceService = {
  workspace: () => api<JournlWorkspace>("/team/workspace/journl"),
  view: (clientId: number, view: string, q: JournlViewQuery) => api<JournlViewResult>(`/team/workspace/clients/${clientId}/journl/${view}`, { query: { ...q } }),
  overview: (clientId: number, period: { from?: string; to?: string }) => api<JournlOverview>(`/team/workspace/clients/${clientId}/journl-data`, { query: period }),
};
