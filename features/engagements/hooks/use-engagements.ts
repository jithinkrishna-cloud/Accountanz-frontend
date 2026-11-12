"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import type { EngagementFormOutput } from "../schemas/engagement.schema";
import { engagementService, type EngagementListParams } from "../services/engagement-service";
import type { Engagement, EngagementStatus } from "../types/engagement.types";

const KEY = ["admin", "engagements"] as const;

export const useEngagements = (params: EngagementListParams) =>
  useQuery({ queryKey: [...KEY, "list", params], queryFn: () => engagementService.list(params), placeholderData: keepPreviousData });

export const useEngagement = (id: number | null) =>
  useQuery({ queryKey: [...KEY, "detail", id], queryFn: () => engagementService.get(id!), enabled: id != null });

export const useEngagementClientOptions = (enabled: boolean) =>
  useQuery({ queryKey: [...KEY, "client-options"], queryFn: engagementService.clientOptions, enabled });

/** Engagement changes can move the client's status, open onboarding links and issue invoices. */
function afterChange(qc: QueryClient, row: Engagement) {
  qc.setQueryData([...KEY, "detail", row.id], row);
  void qc.invalidateQueries({ queryKey: [...KEY, "list"] });
  void qc.invalidateQueries({ queryKey: ["admin", "clients"] });
  void qc.invalidateQueries({ queryKey: ["admin", "onboarding"] });
  void qc.invalidateQueries({ queryKey: ["admin", "dashboard"] });
}

export function useSaveEngagement(id?: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (values: EngagementFormOutput) => {
      if (!id) return engagementService.create(values);
      return engagementService.update(id, { package_id: values.package_id, start_date: values.start_date, renewal_date: values.renewal_date });
    },
    onSuccess: (row) => afterChange(qc, row),
  });
}

export function useChangeEngagementStatus(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (to: EngagementStatus) => engagementService.changeStatus(id, to),
    onSuccess: ({ engagement }) => afterChange(qc, engagement),
  });
}

export function useUploadAgreement(id: number) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (file: File) => engagementService.uploadAgreement(id, file), onSuccess: (row) => afterChange(qc, row) });
}
