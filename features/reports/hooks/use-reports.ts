"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { StaffPortal } from "@/types/auth";
import { reportService, type NewReport, type ReportListParams } from "../services/report-service";

const key = (portal: StaffPortal) => [portal, "reports"] as const;

export const useReports = (portal: StaffPortal, params: ReportListParams) =>
  useQuery({ queryKey: [...key(portal), params], queryFn: () => reportService.list(portal, params), placeholderData: keepPreviousData });

function useReportMutation<T>(portal: StaffPortal, fn: (v: T) => Promise<unknown>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: key(portal) });
      void qc.invalidateQueries({ queryKey: ["team", "workspace"] });
    },
  });
}

export const useCreateReport = (portal: StaffPortal) => useReportMutation(portal, (r: NewReport) => reportService.create(portal, r));
export const usePublishReport = (portal: StaffPortal) => useReportMutation(portal, (id: number) => reportService.publish(portal, id));
export const useUnpublishReport = (portal: StaffPortal) => useReportMutation(portal, (id: number) => reportService.unpublish(portal, id));
export const useDeleteReport = (portal: StaffPortal) => useReportMutation(portal, (id: number) => reportService.remove(portal, id));
