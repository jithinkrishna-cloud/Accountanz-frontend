export const MODULE_POLICIES = ["limited", "configurable", "restricted"] as const;
export type ModulePolicy = (typeof MODULE_POLICIES)[number];

export interface ModuleAction {
  action_key: string;
  label: string;
  journl_action_id: string | null;
  verified: boolean;
}

/** One entry of the JournL module catalogue (database-configured, not code; mapped to JournL's user-permission feature ids). */
export interface CatalogModule {
  module_key: string;
  label: string;
  default_policy: ModulePolicy;
  journl_module_id: string | null;
  verified: boolean;
  actions: ModuleAction[];
}

export interface Catalog {
  /** False in production: unverified modules and actions can't be granted or take effect. */
  allow_unverified: boolean;
  modules: CatalogModule[];
}

export interface ModuleGrant {
  module_key: string;
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

/** Admin overview: per client, the JournL connection/session and each assigned person's module access. */
export interface JournlAccessOverview {
  modules: { key: string; label: string; journl_features: string | null }[];
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
