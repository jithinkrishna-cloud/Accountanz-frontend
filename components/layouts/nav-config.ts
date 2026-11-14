import {
  Bell,
  BookOpen,
  ChartColumn,
  Briefcase,
  Building2,
  CalendarCheck,
  CalendarDays,
  CircleCheck,
  MessageSquare,
  ClipboardList,
  CreditCard,
  ListChecks,
  FileText,
  FolderOpen,
  Handshake,
  Kanban,
  KeyRound,
  LayoutDashboard,
  type LucideIcon,
  Package,
  Plug,
  Receipt,
  ScrollText,
  Settings,
  SquareKanban,
  Stamp,
  UserCog,
  UsersRound,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import type { Portal } from "@/types/auth";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}
export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const PORTAL_LABEL: Record<Portal, string> = {
  admin: "Admin Portal",
  team: "Accountant Workspace",
  app: "Client Portal",
};

export const NAV: Record<Portal, NavGroup[]> = {
  admin: [
    {
      label: "Overview",
      items: [
        { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
        // Switches into the team's project Workspace (its own layout; "Back to Accountanz" returns here).
        { label: "Workspace", href: "/projects", icon: SquareKanban },
      ],
    },
    {
      label: "Business",
      items: [
        { label: "Clients", href: "/admin/clients", icon: Building2 },
        { label: "Onboarding", href: "/admin/onboarding", icon: UserPlus },
        { label: "Services", href: "/admin/services", icon: Briefcase },
        { label: "Packages", href: "/admin/packages", icon: Package },
        { label: "Engagements", href: "/admin/engagements", icon: Handshake },
      ],
    },
    {
      label: "People",
      items: [
        { label: "Accountants", href: "/admin/accountants", icon: UserCog },
        { label: "Employees", href: "/admin/employees", icon: Users },
        { label: "Assignments", href: "/admin/assignments", icon: ClipboardList },
        { label: "Teams", href: "/admin/teams", icon: UsersRound },
      ],
    },
    {
      label: "Operations",
      items: [
        { label: "Task Management", href: "/admin/tasks", icon: ClipboardList },
        { label: "Task Templates", href: "/admin/task-templates", icon: ListChecks },
        { label: "Document Centre", href: "/admin/documents", icon: FolderOpen },
        { label: "Reviews & Approvals", href: "/admin/reviews", icon: CircleCheck },
        { label: "Month-End Closing", href: "/admin/closing", icon: CalendarCheck },
      ],
    },
    {
      label: "Client delivery",
      items: [
        { label: "Reports", href: "/admin/reports", icon: FileText },
        { label: "Client Approvals", href: "/admin/client-approvals", icon: Stamp },
        { label: "Messages", href: "/admin/messages", icon: MessageSquare },
        { label: "Meetings", href: "/admin/meetings", icon: CalendarDays },
      ],
    },
    {
      label: "Finance",
      items: [
        { label: "Service Invoices", href: "/admin/invoices", icon: Receipt },
        { label: "Payments", href: "/admin/payments", icon: CreditCard },
        { label: "Accountant Payouts", href: "/admin/payouts", icon: Wallet },
      ],
    },
    {
      label: "Platform",
      items: [
        { label: "Integrations", href: "/admin/integrations", icon: Plug },
        { label: "JournL Access", href: "/admin/journl-access", icon: KeyRound },
        { label: "Reports & Analytics", href: "/admin/analytics", icon: ChartColumn },
        { label: "Notifications", href: "/admin/notifications", icon: Bell },
        { label: "Knowledge Base", href: "/admin/knowledge-base", icon: BookOpen },
        { label: "Audit Logs", href: "/admin/audit", icon: ScrollText },
        { label: "Settings", href: "/admin/settings", icon: Settings },
      ],
    },
  ],
  team: [
    {
      label: "Overview",
      items: [
        { label: "My Dashboard", href: "/team/dashboard", icon: LayoutDashboard },
        { label: "My Clients", href: "/team/clients", icon: Building2 },
        { label: "Workspace", href: "/projects", icon: SquareKanban },
      ],
    },
    {
      label: "Work",
      items: [
        { label: "Work Queue", href: "/team/queue", icon: Kanban },
        { label: "My Tasks", href: "/team/tasks", icon: ListChecks },
        { label: "Review Queue", href: "/team/reviews", icon: CircleCheck },
        { label: "Documents", href: "/team/documents", icon: FolderOpen },
        { label: "Month-End Closing", href: "/team/closing", icon: CalendarCheck },
        // Opens the JournL area, which has its own module sub-sidebar (read-only, live from JournL).
        { label: "JournL Books", href: "/team/journl", icon: BookOpen },
      ],
    },
    {
      label: "Client delivery",
      items: [
        { label: "Reports", href: "/team/reports", icon: FileText },
        { label: "Client Approvals", href: "/team/approvals", icon: Stamp },
      ],
    },
    {
      label: "Communication",
      items: [
        { label: "Messages", href: "/team/messages", icon: MessageSquare },
        { label: "Meetings", href: "/team/meetings", icon: CalendarDays },
      ],
    },
  ],
  app: [
    // Ordered by how often a client needs it: what's waiting on them, then their books, then contact, then setup.
    { label: "Overview", items: [{ label: "Dashboard", href: "/app/dashboard", icon: LayoutDashboard }] },
    {
      label: "Action needed",
      items: [
        { label: "Approvals", href: "/app/approvals", icon: CircleCheck },
        { label: "Document Requests", href: "/app/requests", icon: FileText },
      ],
    },
    {
      label: "Books & reports",
      items: [
        { label: "Reports", href: "/app/reports", icon: ChartColumn },
        { label: "Tasks & Progress", href: "/app/progress", icon: ListChecks },
        { label: "Document Centre", href: "/app/documents", icon: FolderOpen },
      ],
    },
    {
      label: "Talk to us",
      items: [
        { label: "Messages", href: "/app/messages", icon: MessageSquare },
        { label: "Meetings", href: "/app/meetings", icon: CalendarDays },
      ],
    },
    {
      label: "My company",
      items: [
        { label: "My Business", href: "/app/business", icon: Building2 },
        { label: "My Accounting Team", href: "/app/team", icon: UsersRound },
        { label: "Accounting Software", href: "/app/software", icon: Plug },
      ],
    },
    {
      label: "Account",
      items: [
        { label: "Packages", href: "/app/packages", icon: Package },
        { label: "Service & Billing", href: "/app/billing", icon: CreditCard },
        { label: "Settings", href: "/app/settings", icon: Settings },
      ],
    },
  ],
};
