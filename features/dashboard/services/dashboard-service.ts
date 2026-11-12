import { api } from "@/lib/api-client";
import type { AdminDashboard } from "../types/dashboard.types";

export const dashboardService = {
  admin: () => api<AdminDashboard>("/admin/dashboard"),
};
