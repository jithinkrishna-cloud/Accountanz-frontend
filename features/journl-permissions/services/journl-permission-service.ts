import { api } from "@/lib/api-client";
import type { AssignmentPermissions, Catalog, JournlAccessOverview } from "../types/journl-permission.types";

export const journlPermissionService = {
  catalog: () => api<Catalog>("/admin/journl-permissions/catalog"),
  overview: () => api<JournlAccessOverview>("/admin/journl-permissions/overview"),
  forAssignment: (id: number) => api<AssignmentPermissions>(`/admin/journl-permissions/assignments/${id}`),
  setModule: (id: number, moduleKey: string, actions: string[]) =>
    api<AssignmentPermissions>(`/admin/journl-permissions/assignments/${id}/modules/${moduleKey}`, { method: "PUT", body: { actions } }),
};
