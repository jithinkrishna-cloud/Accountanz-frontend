"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { StaffPortal } from "@/types/auth";
import { clientApprovalService, type ApprovalListParams } from "../services/client-approval-service";

const key = (portal: StaffPortal) => [portal, "client-approvals"] as const;

export const useClientApprovals = (portal: StaffPortal, params: ApprovalListParams) =>
  useQuery({ queryKey: [...key(portal), params], queryFn: () => clientApprovalService.list(portal, params), placeholderData: keepPreviousData });

export function useRequestApproval(portal: StaffPortal) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { client_id: number; subject: string; description: string | null }) => clientApprovalService.request(portal, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: key(portal) });
      void qc.invalidateQueries({ queryKey: ["team", "workspace"] });
    },
  });
}
