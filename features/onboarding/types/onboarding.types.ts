export const ONBOARDING_STAGES = ["registered", "assessment", "proposal_sent", "accepted", "rejected"] as const;
export type OnboardingStage = (typeof ONBOARDING_STAGES)[number];

export const COMPLEXITIES = ["low", "medium", "high"] as const;
export type Complexity = (typeof COMPLEXITIES)[number];

/** Mirrors STAGE_TRANSITIONS in backend/src/modules/onboarding/onboarding.types.ts. */
export const STAGE_TRANSITIONS: Record<OnboardingStage, OnboardingStage[]> = {
  registered: ["assessment", "rejected"],
  assessment: ["proposal_sent", "rejected"],
  proposal_sent: ["accepted", "assessment", "rejected"],
  accepted: [],
  rejected: ["assessment"],
};

export const STAGE_LABELS: Record<OnboardingStage, string> = {
  registered: "Registered",
  assessment: "Assessment",
  proposal_sent: "Proposal sent",
  accepted: "Accepted",
  rejected: "Rejected",
};

export interface OnboardingCase {
  id: number;
  client_id: number;
  client_name: string;
  legal_name: string;
  client_status: string;
  gstin: string | null;
  state: string | null;
  stage: OnboardingStage;
  monthly_transaction_volume: number | null;
  complexity: Complexity | null;
  notes: string | null;
  assessed_by_name: string | null;
  suggested_package_id: number | null;
  suggested_package_name: string | null;
  suggested_monthly_fee: number | null;
  engagement_id: number | null;
  engagement_status: string | null;
  created_at: string;
  updated_at: string;
}

export type StageCounts = Record<OnboardingStage, number>;
