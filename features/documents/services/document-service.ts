import { api, type Paged } from "@/lib/api-client";
import type { StaffPortal } from "@/types/auth";
import type { ClientDocument, DocumentCategory, DocumentRequest, DocumentStatus, RequestStatus, StaffFolder } from "../types/document.types";

export interface DocumentListParams {
  q?: string;
  client_id?: string;
  category?: DocumentCategory;
  status?: DocumentStatus;
  /** One folder ("root" = top level); omitted = every folder. */
  folder_id?: number | "root";
  page?: number;
  pageSize?: number;
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
  /** The task this request is for (optional); the client sees it on the request. */
  task_id?: number | null;
}

/** Same-origin URL; the browser sends the auth cookie, the API checks access and streams the private file. */
export const documentFileUrl = {
  download: (portal: StaffPortal, id: number) => `/api/${portal}/documents/${id}/file`,
  view: (portal: StaffPortal, id: number) => `/api/${portal}/documents/${id}/file?view=1`,
};

export const documentService = {
  list: (portal: StaffPortal, params: DocumentListParams) => api<Paged<ClientDocument>>(`/${portal}/documents`, { query: { ...params } }),
  setStatus: (portal: StaffPortal, id: number, status: DocumentStatus) => api<ClientDocument>(`/${portal}/documents/${id}/status`, { method: "PATCH", body: { status } }),
  upload: (portal: StaffPortal, file: File, meta: { client_id: number; category: DocumentCategory; period?: string; folder_id?: number | null }) => {
    const body = new FormData();
    body.append("file", file);
    body.append("client_id", String(meta.client_id));
    body.append("category", meta.category);
    if (meta.period) body.append("period", meta.period);
    if (meta.folder_id) body.append("folder_id", String(meta.folder_id));
    return api<ClientDocument>(`/${portal}/documents`, { method: "POST", body });
  },
  requests: (portal: StaffPortal, params: RequestListParams) => api<Paged<DocumentRequest>>(`/${portal}/documents/requests`, { query: { ...params } }),
  createRequest: (portal: StaffPortal, body: NewRequest) => api<DocumentRequest>(`/${portal}/documents/requests`, { method: "POST", body }),
  cancelRequest: (portal: StaffPortal, id: number) => api<DocumentRequest>(`/${portal}/documents/requests/${id}/cancel`, { method: "POST" }),
  folders: (portal: StaffPortal, clientId: number) => api<{ items: StaffFolder[] }>(`/${portal}/documents/folders`, { query: { client_id: clientId } }).then((r) => r.items),
  createFolder: (portal: StaffPortal, body: { client_id: number; parent_id: number | null; name: string }) => api<StaffFolder>(`/${portal}/documents/folders`, { method: "POST", body }),
  renameFolder: (portal: StaffPortal, id: number, name: string) => api<StaffFolder>(`/${portal}/documents/folders/${id}`, { method: "PATCH", body: { name } }),
  deleteFolder: (portal: StaffPortal, id: number) => api<void>(`/${portal}/documents/folders/${id}`, { method: "DELETE" }),
  moveDocument: (portal: StaffPortal, id: number, folderId: number | null) => api<ClientDocument>(`/${portal}/documents/${id}/folder`, { method: "PATCH", body: { folder_id: folderId } }),
};
