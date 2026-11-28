"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { AnalyticsOverview, AnalyticsRange } from "../types/analytics.types";

export const analyticsService = { overview: (range: AnalyticsRange) => api<AnalyticsOverview>("/admin/analytics", { query: { range } }) };

export const useAnalytics = (range: AnalyticsRange) =>
  useQuery({ queryKey: ["admin", "analytics", range], queryFn: () => analyticsService.overview(range), placeholderData: keepPreviousData });
