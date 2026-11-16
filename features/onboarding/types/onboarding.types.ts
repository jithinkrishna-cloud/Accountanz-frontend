export const ONBOARDING_STAGES = ["registered", "assessment", "proposal_sent", "accepted", "rejected"] as const;
export type OnboardingStage = (typeof ONBOARDING_STAGES)[number];

export const COMPLEXITIES = ["low", "medium", "high"] as const;
export type Complexity = (typeof COMPLEXITIES)[number];
export const BUSINESS_TYPES = ["private_limited", "public_limited", "llp", "partnership", "proprietorship", "opc"] as const;
export type BusinessType = (typeof BUSINESS_TYPES)[number];
export const ACCOUNTING_SOFTWARE = ["journl", "none"] as const;
export type AccountingSoftware = (typeof ACCOUNTING_SOFTWARE)[number];

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
  business_type: BusinessType | null;
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
  /** Shown to the client with the proposal (notes stay internal). */
  proposal_message: string | null;
  proposal_sent_at: string | null;
  accepted_at: string | null;
  accepted_by_name: string | null;
  accepted_via: "client" | "team" | null;
  /** Active owner logins; without one the client can't see or accept the proposal online. */
  owner_logins: number;
  engagement_id: number | null;
  engagement_status: string | null;
  created_at: string;
  updated_at: string;
  service_requirements?: OnboardingServiceRequirements | null;
  readiness?: OnboardingReadiness | null;
}

export interface OnboardingServiceRequirements {
  case_id: number;
  bookkeeping: boolean | 0 | 1;
  gst_filing: boolean | 0 | 1;
  income_tax_filing: boolean | 0 | 1;
  payroll: boolean | 0 | 1;
  audit_support: boolean | 0 | 1;
  other_services: string | null;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface OnboardingReadiness {
  complete: boolean;
  missing: string[];
  sections: {
    company_profile: boolean;
    primary_contact: boolean;
    tax_details: boolean;
    stakeholders: boolean;
    financial_profile: boolean;
    service_requirements: boolean;
    assessment: boolean;
  };
}

export type StageCounts = Record<OnboardingStage, number>;
