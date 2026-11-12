"use client";

import { useQuery } from "@tanstack/react-query";
import { dashboardService } from "../services/dashboard-service";

export const useAdminDashboard = () => useQuery({ queryKey: ["admin", "dashboard"], queryFn: dashboardService.admin });
