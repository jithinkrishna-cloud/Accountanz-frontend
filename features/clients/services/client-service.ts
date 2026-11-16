import { api, type Paged } from "@/lib/api-client";
import type { ClientFormOutput } from "../schemas/client.schema";
import type { Client, ClientDetail, ClientStatus, CompanyFinancialProfile, CompanyStakeholder, CompanyTaxDetails, StakeholderType } from "../types/client.types";

export interface ClientListParams {
  q?: string;
  status?: ClientStatus;
  page?: number;
}

export interface BranchBody {
  name: string;
  gstin: string | null;
  external_branch_ref: string | null;
}

export interface StakeholderBody {
  stakeholder_type: StakeholderType;
  full_name: string;
  email: string | null;
  phone: string | null;
  designation: string | null;
  ownership_percentage: number | null;
  pan_number: string | null;
  din_number: string | null;
  address: string | null;
  is_primary: boolean;
}

export type TaxDetailsBody = Omit<CompanyTaxDetails, "client_id" | "created_at" | "updated_at">;
export type FinancialProfileBody = Omit<CompanyFinancialProfile, "client_id" | "created_at" | "updated_at">;

export const clientService = {
  list: (params: ClientListParams) => api<Paged<Client>>("/admin/clients", { query: { ...params } }),
  get: (id: number) => api<ClientDetail>(`/admin/clients/${id}`),
  create: (values: ClientFormOutput) => api<ClientDetail>("/admin/clients", { method: "POST", body: values }),
  update: (id: number, values: Partial<ClientFormOutput>) => api<ClientDetail>(`/admin/clients/${id}`, { method: "PATCH", body: values }),
  /** Gives the client's own person a portal login (invited; they set their password from the emailed link). */
  inviteUser: (id: number, body: { full_name: string; email: string; phone: string | null; role: "owner" | "member"; can_approve: boolean }) =>
    api<{ client: ClientDetail; invite_url: string; email_sent: boolean }>(`/admin/clients/${id}/users`, { method: "POST", body }),
  addBranch: (id: number, body: BranchBody) => api<ClientDetail>(`/admin/clients/${id}/branches`, { method: "POST", body }),
  updateBranch: (id: number, branchId: number, body: BranchBody) => api<ClientDetail>(`/admin/clients/${id}/branches/${branchId}`, { method: "PATCH", body }),
  removeBranch: (id: number, branchId: number) => api<ClientDetail>(`/admin/clients/${id}/branches/${branchId}`, { method: "DELETE" }),
  getTaxDetails: (id: number) => api<CompanyTaxDetails | null>(`/admin/clients/${id}/tax-details`),
  saveTaxDetails: (id: number, body: TaxDetailsBody) => api<CompanyTaxDetails>(`/admin/clients/${id}/tax-details`, { method: "PUT", body }),
  listStakeholders: (id: number) => api<CompanyStakeholder[]>(`/admin/clients/${id}/stakeholders`),
  saveStakeholders: (id: number, stakeholders: unknown[]) => api<CompanyStakeholder[]>(`/admin/clients/${id}/stakeholders`, { method: "PUT", body: { stakeholders } }),
  addStakeholder: (id: number, body: StakeholderBody) => api<CompanyStakeholder>(`/admin/clients/${id}/stakeholders`, { method: "POST", body }),
  updateStakeholder: (id: number, stakeholderId: number, body: StakeholderBody) =>
    api<CompanyStakeholder>(`/admin/clients/${id}/stakeholders/${stakeholderId}`, { method: "PATCH", body }),
  removeStakeholder: (id: number, stakeholderId: number) => api<void>(`/admin/clients/${id}/stakeholders/${stakeholderId}`, { method: "DELETE" }),
  getFinancialProfile: (id: number) => api<CompanyFinancialProfile | null>(`/admin/clients/${id}/financial-profile`),
  saveFinancialProfile: (id: number, body: FinancialProfileBody) => api<CompanyFinancialProfile>(`/admin/clients/${id}/financial-profile`, { method: "PUT", body }),
};


