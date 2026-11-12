import { api, type Paged } from "@/lib/api-client";
import type { ClientDocument, DocumentCategory, DocumentRequest, DocumentStatus } from "../types/document.types";

export interface DocumentListParams {
  q?: string;
  client_id?: string;
  category?: DocumentCategory;
  status?: DocumentStatus;
  page?: number;
}

/** Same-origin URL; the browser sends the auth cookie, the API streams the private file. */
export const documentFileUrl = (id: number) => `/api/admin/documents/${id}/file`;

export const documentService = {
  list: (params: DocumentListParams) => api<Paged<ClientDocument>>("/admin/documents", { query: { ...params } }),
  setStatus: (id: number, status: DocumentStatus) => api<ClientDocument>(`/admin/documents/${id}/status`, { method: "PATCH", body: { status } }),
  openRequests: (params: { q?: string; page?: number }) => api<Paged<DocumentRequest>>("/admin/documents/requests", { query: params }),
};
