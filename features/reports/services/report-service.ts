import { api, type Paged } from "@/lib/api-client";
import type { StaffPortal } from "@/types/auth";
import type { Report, ReportType } from "../types/report.types";

export interface ReportListParams {
  q?: string;
  client_id?: string;
  state?: "draft" | "published";
  page?: number;
}

export interface NewReport {
  client_id: number;
  period: string;
  report_type: ReportType;
  summary: string;
  file: File | null;
}

export const reportFileUrl = (portal: StaffPortal, id: number) => `/api/${portal}/reports/${id}/file`;

export const reportService = {
  list: (portal: StaffPortal, params: ReportListParams) => api<Paged<Report>>(`/${portal}/reports`, { query: { ...params } }),
  create: (portal: StaffPortal, r: NewReport) => {
    const body = new FormData();
    body.append("client_id", String(r.client_id));
    body.append("period", r.period);
    body.append("report_type", r.report_type);
    if (r.summary) body.append("summary", r.summary);
    if (r.file) body.append("file", r.file);
    return api<Report>(`/${portal}/reports`, { method: "POST", body });
  },
  publish: (portal: StaffPortal, id: number) => api<Report>(`/${portal}/reports/${id}/publish`, { method: "POST" }),
  unpublish: (portal: StaffPortal, id: number) => api<Report>(`/${portal}/reports/${id}/unpublish`, { method: "POST" }),
  remove: (portal: StaffPortal, id: number) => api<void>(`/${portal}/reports/${id}`, { method: "DELETE" }),
};
