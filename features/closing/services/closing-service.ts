import { api } from "@/lib/api-client";
import type { ClosingGrid, ClosingStatus } from "../types/closing.types";

export const closingService = {
  grid: () => api<ClosingGrid>("/admin/closing"),
  setStatus: (clientId: number, period: string, status: ClosingStatus, reason?: string) =>
    api<void>(`/admin/closing/${clientId}/${period}`, { method: "PUT", body: { status, reason } }),
};
