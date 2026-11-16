export const MODULE_POLICIES = ["limited", "configurable", "restricted"] as const;
export type ModulePolicy = (typeof MODULE_POLICIES)[number];

export interface ModuleAction {
  action_key: string;
  label: string;
  journl_action_id: string | null;
  verified: boolean;
}

/** One entry of the JournL module catalogue (database-configured, not code; mapped to JournL's user-permission feature ids). */
/** A JournL feature a module opens (from JournL's FeatureIds). known=false: the id isn't in JournL's list. */
export interface JournlFeature {
  id: number;
  name: string;
  known: boolean;
}

export interface CatalogModule {
  module_key: string;
  label: string;
  default_policy: ModulePolicy;
  journl_module_id: string | null;
  /** What this module opens in JournL, by name. */
  features: JournlFeature[];
  verified: boolean;
  actions: ModuleAction[];
}

export interface Catalog {
  /** False in production: unverified modules and actions can't be granted or take effect. */
  allow_unverified: boolean;
  modules: CatalogModule[];
}

export type GrantSource = "accountanz" | "client";

export interface ModuleGrant {
  module_key: string;
  grant_source: GrantSource;
  allowed_actions: string[];
  status: "active" | "revoked";
  granted_by_name: string | null;
  granted_at: string;
  revoked_at: string | null;
}

/** The Accountanz side of an assignment's state; JournL decides the client's own grant. */
export interface AssignmentGates {
  assignment_id: number;
  client_id: number;
  user_id: number;
  assignment_active: boolean;
  engagement_active: boolean;
  journl_access: boolean;
}

export interface ModuleAccess {
  module_key: string;
  label: string;
  default_policy: ModulePolicy;
  verified: boolean;
  grant: ModuleGrant | null;
  /** The client's own grant for this module (client-set ceiling; JournL enforces this side). */
  client_grant: ModuleGrant | null;
  /** Granted actions that pass every Accountanz gate; JournL still applies the client's grant. */
  effective_actions: string[];
  /** Why granted actions don't take effect, when they don't. */
  blocked_reason: string | null;
}

export interface AssignmentPermissions extends AssignmentGates {
  /** JournL enforces the client's access ceiling; Accountanz doesn't know it, so it's reported as unknown. */
  client_grant: "unknown";
  allow_unverified: boolean;
  modules: ModuleAccess[];
}

/** Client-facing view of one accountant's JournL module permissions on this client. */
export interface ClientModulePermission {
  module_key: string;
  label: string;
  client_granted: boolean;
  client_actions: string[];
  effective: boolean;
  reason: string | null;
}

export interface ClientAssignmentPermission {
  /** Grants are saved against this, not user_id (one person can hold two roles on a company). */
  assignment_id: number;
  user_id: number;
  full_name: string;
  team_role: string;
  modules: ClientModulePermission[];
}

/** Admin overview: per client, the JournL connection/session and each assigned person's module access. */
export interface JournlAccessOverview {
  modules: { key: string; label: string; journl_features: string | null; features: JournlFeature[] }[];
  clients: {
    client_id: number;
    client_name: string;
    client_status: string;
    engagement_active: boolean;
    connection: { status: string; org_id: string | null; org_name: string | null; session_until: string | null; verification_note: string | null } | null;
    people: {
      assignment_id: number;
      user_id: number;
      full_name: string;
      team_role: string;
      journl_access: boolean;
      modules: Record<string, { granted: boolean; effective: boolean; reason: string | null }>;
    }[];
  }[];
}
