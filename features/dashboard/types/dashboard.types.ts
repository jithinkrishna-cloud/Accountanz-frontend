import type { AuditLog } from "@/features/audit/types/audit.types";

export interface AdminDashboard {
  period: string;
  clients: { active: number; onboarding: number; paused: number };
  engagements: { active: number; draft: number; sent: number };
  tasks: { overdue: number; approved: number; total: number };
  reviews: { waiting: number; overTwoDays: number };
  revenue: { billed: number; outstanding: number; openInvoices: number };
  behindOnClosing: { client_id: number; client_name: string; approved: number; total: number }[];
  closingCheckActive: boolean;
  latestAudit: AuditLog[];
}
