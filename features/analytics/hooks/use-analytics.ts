"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { AnalyticsOverview } from "../types/analytics.types";

export const analyticsService = { overview: () => api<AnalyticsOverview>("/admin/analytics") };

export const useAnalytics = () => useQuery({ queryKey: ["admin", "analytics"], queryFn: analyticsService.overview });
