import { api, type Paged } from "@/lib/api-client";
import type { StaffPortal } from "@/types/auth";
import type { ClientDocument, DocumentCategory, DocumentRequest, DocumentStatus, RequestStatus } from "../types/document.types";

export interface DocumentListParams {
  q?: string;
  client_id?: string;
  category?: DocumentCategory;
  status?: DocumentStatus;
  page?: number;
}

export interface RequestListParams {
  q?: string;
  client_id?: string;
  status?: RequestStatus;
  page?: number;
}

export interface NewRequest {
  client_id: number;
  description: string;
  period: string | null;
  due_date: string | null;
}

/** Same-origin URL; the browser sends the auth cookie, the API checks access and streams the private file. */
export const documentFileUrl = (portal: StaffPortal, id: number) => `/api/${portal}/documents/${id}/file`;

export const documentService = {
  list: (portal: StaffPortal, params: DocumentListParams) => api<Paged<ClientDocument>>(`/${portal}/documents`, { query: { ...params } }),
  setStatus: (portal: StaffPortal, id: number, status: DocumentStatus) => api<ClientDocument>(`/${portal}/documents/${id}/status`, { method: "PATCH", body: { status } }),
  upload: (portal: StaffPortal, file: File, meta: { client_id: number; category: DocumentCategory; period?: string }) => {
    const body = new FormData();
    body.append("file", file);
    body.append("client_id", String(meta.client_id));
    body.append("category", meta.category);
    if (meta.period) body.append("period", meta.period);
    return api<ClientDocument>(`/${portal}/documents`, { method: "POST", body });
  },
  requests: (portal: StaffPortal, params: RequestListParams) => api<Paged<DocumentRequest>>(`/${portal}/documents/requests`, { query: { ...params } }),
  createRequest: (portal: StaffPortal, body: NewRequest) => api<DocumentRequest>(`/${portal}/documents/requests`, { method: "POST", body }),
  cancelRequest: (portal: StaffPortal, id: number) => api<DocumentRequest>(`/${portal}/documents/requests/${id}/cancel`, { method: "POST" }),
};
