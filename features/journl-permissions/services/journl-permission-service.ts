import { api } from "@/lib/api-client";
import type { AssignmentPermissions, Catalog, ClientAssignmentPermission, JournlAccessOverview } from "../types/journl-permission.types";

export const journlPermissionService = {
  catalog: () => api<Catalog>("/admin/journl-permissions/catalog"),
  overview: () => api<JournlAccessOverview>("/admin/journl-permissions/overview"),
  forAssignment: (id: number) => api<AssignmentPermissions>(`/admin/journl-permissions/assignments/${id}`),
  setModule: (id: number, moduleKey: string, actions: string[], grantSource: "accountanz" | "client" = "accountanz") =>
    api<AssignmentPermissions>(`/admin/journl-permissions/assignments/${id}/modules/${moduleKey}`, { method: "PUT", body: { actions, grantSource } }),

  // Client-side: /api/app/journl-permissions
  clientCatalog: () => api<Catalog>("/app/journl-permissions/catalog"),
  clientTeam: () => api<{ items: ClientAssignmentPermission[] }>("/app/journl-permissions/team").then((r) => r.items),
  clientSetModule: (assignmentId: number, moduleKey: string, actions: string[]) =>
    api<AssignmentPermissions>(`/app/journl-permissions/assignments/${assignmentId}/modules/${moduleKey}`, { method: "PUT", body: { actions, grantSource: "client" } }),
};
