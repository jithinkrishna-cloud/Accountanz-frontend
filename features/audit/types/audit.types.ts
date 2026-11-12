export interface AuditLog {
  id: number;
  created_at: string;
  action: string;
  actor_email: string | null;
  actor_role: string | null;
  entity_type: string;
  entity_id: string | null;
  details: string | null;
  client_id: number | null;
  client_name: string | null;
}
