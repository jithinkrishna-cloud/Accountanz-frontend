export const CLIENT_STATUSES = ["lead", "onboarding", "active", "paused", "exited"] as const;
export type ClientStatus = (typeof CLIENT_STATUSES)[number];
export const ACCOUNTING_SOFTWARE = ["journl", "none"] as const;
export type AccountingSoftware = (typeof ACCOUNTING_SOFTWARE)[number];
export const BUSINESS_TYPES = ["private_limited", "public_limited", "llp", "partnership", "proprietorship", "opc"] as const;
export type BusinessType = (typeof BUSINESS_TYPES)[number];
export const REGISTRATION_STATUSES = ["not_registered", "applied", "registered"] as const;
export type RegistrationStatus = (typeof REGISTRATION_STATUSES)[number];
export const STAKEHOLDER_TYPES = ["director", "partner", "owner", "proprietor"] as const;
export type StakeholderType = (typeof STAKEHOLDER_TYPES)[number];

export interface Client {
  id: number;
  legal_name: string;
  trade_name: string | null;
  business_type: BusinessType | null;
  date_of_establishment: string | null;
  gstin: string | null;
  pan: string | null;
  state: string | null;
  address: string | null;
  primary_contact_name: string | null;
  primary_contact_email: string | null;
  primary_contact_phone: string | null;
  status: ClientStatus;
  accounting_software: AccountingSoftware;
  created_at: string;
  updated_at: string;
  /** Roles the client's package includes that nobody is assigned to (onboarding and active clients). */
  missing_roles?: string[];
}

export interface ClientBranch {
  id: number;
  name: string;
  gstin: string | null;
  external_branch_ref: string | null;
}

export interface CompanyTaxDetails {
  client_id: number;
  pan_number: string | null;
  pan_status: RegistrationStatus | null;
  tan_number: string | null;
  tan_status: RegistrationStatus | null;
  gstin: string | null;
  gstin_status: RegistrationStatus | null;
  cin: string | null;
  cin_status: RegistrationStatus | null;
  llpin: string | null;
  llpin_status: RegistrationStatus | null;
  msme_udyam_number: string | null;
  msme_status: RegistrationStatus | null;
  professional_tax_registration: string | null;
  professional_tax_status: RegistrationStatus | null;
  created_at: string;
  updated_at: string;
}

export interface CompanyStakeholder {
  id: number;
  client_id: number;
  stakeholder_type: StakeholderType;
  full_name: string;
  email: string | null;
  phone: string | null;
  designation: string | null;
  ownership_percentage: number | null;
  pan_number: string | null;
  din_number: string | null;
  address: string | null;
  is_primary: 0 | 1 | boolean;
  created_at: string;
  updated_at: string;
}

export interface CompanyFinancialProfile {
  client_id: number;
  financial_year_start_month: number | null;
  annual_turnover: number | null;
  monthly_transaction_volume: number | null;
  employee_count: number | null;
  monthly_invoice_count: number | null;
  current_accounting_software: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientDetail extends Client {
  branches: ClientBranch[];
  portalUsers: { user_id: number; full_name: string; email: string; role: "owner" | "member"; can_approve: 0 | 1 }[];
  team: { user_id: number; full_name: string; team_role: string; valid_from: string; valid_to: string | null }[];
  /** Roles the client's package includes (null with no open engagement). */
  package_roles: string[] | null;
  package_name: string | null;
  tax_details?: CompanyTaxDetails | null;
  stakeholders?: CompanyStakeholder[];
  financial_profile?: CompanyFinancialProfile | null;
}
