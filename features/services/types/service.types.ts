export interface Service {
  id: number;
  code: string;
  name: string;
  description: string | null;
}

export const BILLING_CYCLES = ["monthly", "quarterly", "yearly"] as const;
export type BillingCycle = (typeof BILLING_CYCLES)[number];

export interface ServicePackage {
  id: number;
  name: string;
  description: string | null;
  monthly_fee: number;
  billing_cycle: BillingCycle;
  scope_notes: string | null;
  is_active: boolean;
  services: Pick<Service, "id" | "code" | "name">[];
}
