export interface Service {
  id: number;
  code: string;
  name: string;
  description: string | null;
}

export const BILLING_CYCLES = ["monthly", "quarterly", "yearly"] as const;
export type BillingCycle = (typeof BILLING_CYCLES)[number];

/** Roles a package can include (a reviewer assignment also covers finance manager). */
export const PACKAGE_ROLES = ["bookkeeper", "finance_manager", "cfo"] as const;
export type PackageRole = (typeof PACKAGE_ROLES)[number];
export const PACKAGE_ROLE_INFO: Record<PackageRole, { label: string; does: string }> = {
  bookkeeper: { label: "Bookkeeper", does: "Day-to-day bookkeeping and document requests" },
  finance_manager: { label: "Finance manager", does: "Reviews each month's work before it's final" },
  cfo: { label: "CFO", does: "Financial review, insights and advice" },
};

export interface ServicePackage {
  id: number;
  name: string;
  description: string | null;
  monthly_fee: number;
  billing_cycle: BillingCycle;
  scope_notes: string | null;
  /** The team the client gets with this package. */
  team_roles: PackageRole[];
  is_active: boolean;
  services: Pick<Service, "id" | "code" | "name">[];
}
