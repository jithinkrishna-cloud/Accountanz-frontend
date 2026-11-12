import { api, type Paged } from "@/lib/api-client";
import type { ClientFormOutput } from "../schemas/client.schema";
import type { Client, ClientDetail, ClientStatus } from "../types/client.types";

export interface ClientListParams {
  q?: string;
  status?: ClientStatus;
  page?: number;
}

export const clientService = {
  list: (params: ClientListParams) => api<Paged<Client>>("/admin/clients", { query: { ...params } }),
  get: (id: number) => api<ClientDetail>(`/admin/clients/${id}`),
  create: (values: ClientFormOutput) => api<ClientDetail>("/admin/clients", { method: "POST", body: values }),
  update: (id: number, values: Partial<ClientFormOutput>) => api<ClientDetail>(`/admin/clients/${id}`, { method: "PATCH", body: values }),
  /** Gives the client's own person a portal login (invited; they set their password from the emailed link). */
  inviteUser: (id: number, body: { full_name: string; email: string; phone: string | null; role: "owner" | "member"; can_approve: boolean }) =>
    api<{ client: ClientDetail; invite_url: string; email_sent: boolean }>(`/admin/clients/${id}/users`, { method: "POST", body }),
};
