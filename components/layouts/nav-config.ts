import {
  Activity,
  BookOpen,
  ChartColumn,
  Briefcase,
  Building2,
  CalendarCheck,
  CalendarDays,
  CircleCheck,
  Compass,
  MessageSquare,
  ClipboardList,
  CreditCard,
  ListChecks,
  FileText,
  FolderOpen,
  Group,
  Kanban,
  LayoutDashboard,
  type LucideIcon,
  Package,
  Receipt,
  ScrollText,
  Settings,
  SquareKanban,
  Stamp,
  UserCog,
  UsersRound,
  UserSearch,
  Users,
  Wallet,
  ListTodo,
  TrendingUp,
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

/**
 * Each portal's sidebar, ordered by how the work flows and how often it's used:
 * admin = see the firm → clients → run the work → deliver → bill → people → setup;
 * team  = my day → my clients' books → review & close → deliver → talk;
 * app   = what's waiting on the client → their books → contact → their company → account.
 */
export const NAV: Record<Portal, NavGroup[]> = {
  admin: [
    {
      label: "Overview",
      items: [
        { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
      ],
    },
    {
      // How the firm is doing: progress by client, by person, and the numbers over time.
      label: "Insights",
      items: [
        { label: "Client Progress", href: "/admin/firm-progress", icon: Activity },
        { label: "Individual Progress", href: "/admin/progress", icon: TrendingUp },
        { label: "Analytics", href: "/admin/analytics", icon: ChartColumn },
      ],
    },
    {
      label: "Clients",
      items: [
        // Clients holds two tabs: Clients and Engagements (packages and services).
        { label: "Clients", href: "/admin/clients", icon: Building2 },
        // Clients asking for a specific accountant from Explore in their portal.
        { label: "Accountant Requests", href: "/admin/accountant-requests", icon: UserSearch },
      ],
    },
    {
      // Daily work, in the order it moves: plan → do → review → close.
      label: "Work",
      items: [
        // Switches into the project Workspace (its own layout; "Back to Accountanz" returns here).
        { label: "Workspace", href: "/projects", icon: SquareKanban },
        { label: "Tasks", href: "/admin/tasks", icon: ListTodo },
        { label: "Documents", href: "/admin/documents", icon: FolderOpen },
        { label: "Reviews", href: "/admin/reviews", icon: CircleCheck },
        { label: "Month-End Closing", href: "/admin/closing", icon: CalendarCheck },
      ],
    },
    {
      // What the client sees and talks to us about.
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
        { label: "Invoices", href: "/admin/invoices", icon: Receipt },
        { label: "Payments", href: "/admin/payments", icon: CreditCard },
        { label: "Accountant Payouts", href: "/admin/payouts", icon: Wallet },
      ],
    },
    {
      // The people first, then who works on what.
      label: "People",
      items: [
        { label: "Accountants", href: "/admin/accountants", icon: UserCog },
        { label: "Employees", href: "/admin/employees", icon: Users },
        { label: "Assignments", href: "/admin/assignments", icon: ClipboardList },
        { label: "Teams", href: "/admin/teams", icon: UsersRound },
        { label: "Groups", href: "/admin/groups", icon: Group },
      ],
    },
    {
      // Configured once, revisited rarely: the catalogue clients buy from, templates and system settings.
      label: "Setup",
      items: [
        { label: "Services", href: "/admin/services", icon: Briefcase },
        { label: "Packages", href: "/admin/packages", icon: Package },
        { label: "Task Templates", href: "/admin/task-templates", icon: ListChecks },
        { label: "Knowledge Base", href: "/admin/knowledge-base", icon: BookOpen },
        { label: "Audit Logs", href: "/admin/audit", icon: ScrollText },
        { label: "Settings", href: "/admin/settings", icon: Settings },
      ],
    },
  ],
  team: [
    {
      // An accountant's day: what's assigned to me, then everything else that's waiting.
      label: "My work",
      items: [
        { label: "My Dashboard", href: "/team/dashboard", icon: LayoutDashboard },
        { label: "My Tasks", href: "/team/tasks", icon: ListChecks },
        { label: "Work Queue", href: "/team/queue", icon: Kanban },
        { label: "Workspace", href: "/projects", icon: SquareKanban },
      ],
    },
    {
      label: "Clients",
      items: [
        { label: "My Clients", href: "/team/clients", icon: Building2 },
        { label: "Documents", href: "/team/documents", icon: FolderOpen },
      ],
    },
    {
      label: "Review & close",
      items: [
        { label: "Review Queue", href: "/team/reviews", icon: CircleCheck },
        { label: "Month-End Closing", href: "/team/closing", icon: CalendarCheck },
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
      // Things only the client can unblock: send what's asked for, then sign off.
      label: "Action needed",
      items: [
        { label: "Document Requests", href: "/app/requests", icon: FileText },
        { label: "Approvals", href: "/app/approvals", icon: CircleCheck },
      ],
    },
    {
      label: "Books & reports",
      items: [
        { label: "Tasks & Progress", href: "/app/progress", icon: ListChecks },
        { label: "Reports", href: "/app/reports", icon: ChartColumn },
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
      ],
    },
    {
      // Browse Accountanz accountants and ask for one to join the team or help with a piece of work.
      label: "Explore",
      items: [{ label: "Accountants", href: "/app/explore", icon: Compass }],
    },
    {
      label: "Account",
      items: [
        { label: "Service & Billing", href: "/app/billing", icon: CreditCard },
        { label: "Packages", href: "/app/packages", icon: Package },
        { label: "Settings", href: "/app/settings", icon: Settings },
      ],
    },
  ],
};
