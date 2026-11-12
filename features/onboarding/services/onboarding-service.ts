import { api, type Paged } from "@/lib/api-client";
import type { AssessmentFormOutput, ProspectFormOutput } from "../schemas/onboarding.schema";
import type { OnboardingCase, OnboardingStage, StageCounts } from "../types/onboarding.types";

export interface OnboardingListParams {
  q?: string;
  stage?: OnboardingStage;
  page?: number;
}

export const onboardingService = {
  list: (params: OnboardingListParams) => api<Paged<OnboardingCase> & { counts: StageCounts }>("/admin/onboarding", { query: { ...params } }),
  get: (id: number) => api<OnboardingCase>(`/admin/onboarding/${id}`),
  create: (values: ProspectFormOutput) => api<OnboardingCase>("/admin/onboarding", { method: "POST", body: values }),
  saveAssessment: (id: number, values: AssessmentFormOutput) => api<OnboardingCase>(`/admin/onboarding/${id}/assessment`, { method: "PUT", body: values }),
  changeStage: (id: number, to: OnboardingStage, reason?: string) =>
    api<OnboardingCase>(`/admin/onboarding/${id}/stage`, { method: "POST", body: { to, reason: reason || null } }),
};
