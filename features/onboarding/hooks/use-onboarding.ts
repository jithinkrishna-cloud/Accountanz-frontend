"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import type { AssessmentFormOutput, ProspectFormOutput } from "../schemas/onboarding.schema";
import { onboardingService, type OnboardingListParams, type ServiceRequirementsInput } from "../services/onboarding-service";
import type { OnboardingCase, OnboardingStage } from "../types/onboarding.types";

const KEY = ["admin", "onboarding"] as const;

export const useOnboardingCases = (params: OnboardingListParams) =>
  useQuery({ queryKey: [...KEY, "list", params], queryFn: () => onboardingService.list(params), placeholderData: keepPreviousData });

/** A stage change can touch the client (lead → onboarding) and open an engagement, so refresh those too. */
function afterChange(qc: QueryClient, row: OnboardingCase) {
  qc.setQueryData([...KEY, "detail", row.id], row);
  void qc.invalidateQueries({ queryKey: [...KEY, "list"] });
  void qc.invalidateQueries({ queryKey: ["admin", "clients"] });
  void qc.invalidateQueries({ queryKey: ["admin", "engagements"] });
  void qc.invalidateQueries({ queryKey: ["admin", "dashboard"] });
}

/** Full case, including readiness and service requirements (list rows carry neither). */
export const useOnboardingCase = (id: number) => useQuery({ queryKey: [...KEY, "detail", id], queryFn: () => onboardingService.get(id) });

/** Saving requirements returns only the requirements; refetch the case so readiness reflects the change. */
export function useSaveServiceRequirements(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: ServiceRequirementsInput) => {
      await onboardingService.saveServiceRequirements(id, values);
      return onboardingService.get(id);
    },
    onSuccess: (row) => afterChange(qc, row),
  });
}

export function useCreateProspect() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (values: ProspectFormOutput) => onboardingService.create(values), onSuccess: (row) => afterChange(qc, row) });
}

export function useSaveAssessment(id: number) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (values: AssessmentFormOutput) => onboardingService.saveAssessment(id, values), onSuccess: (row) => afterChange(qc, row) });
}

export function useChangeStage(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ to, reason, overrideReason }: { to: OnboardingStage; reason?: string; overrideReason?: string }) => onboardingService.changeStage(id, to, reason, overrideReason),
    onSuccess: (row) => afterChange(qc, row),
  });
}
