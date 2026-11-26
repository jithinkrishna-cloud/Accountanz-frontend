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
  UserSearch,
  Users,
  Wallet,
} from "lucide-react";
import { JOURNL_INTEGRATION, JOURNL_INTEGRATION_HREFS } from "@/lib/features";
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
 * admin = see the firm → win & onboard clients → run the work → deliver → bill → people → setup;
 * team  = my day → my clients' books → review & close → deliver → talk;
 * app   = what's waiting on the client → their books → contact → their company → account.
 */
const ALL_NAV: Record<Portal, NavGroup[]> = {
  admin: [
    {
      label: "Overview",
      items: [
        { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
      ],
    },
    {
      // One business record moving through the pipeline: Leads (first contact → accepted proposal) → Engagements
      // (signed agreement → activate) → Clients (served).
      label: "Clients",
      items: [
        // Named "Leads" (not "Onboarding"): matches the client status "lead" and avoids the "onboarding" status.
        { label: "Leads", href: "/admin/onboarding", icon: UserPlus },
        { label: "Engagements", href: "/admin/engagements", icon: Handshake },
        { label: "Clients", href: "/admin/clients", icon: Building2 },
        // Clients asking for a specific accountant from Explore in their portal.
        { label: "Accountant Requests", href: "/admin/accountant-requests", icon: UserSearch },
      ],
    },
    {
      // The catalogue clients buy from: building blocks first (services → packages).
      label: "Configuration",
      items: [
        { label: "Services", href: "/admin/services", icon: Briefcase },
        { label: "Packages", href: "/admin/packages", icon: Package },
      ],
    },
    {
      // Daily operations, in the order work moves: plan → do → review → close.
      label: "Operations",
      items: [
        // Switches into the project Workspace (its own layout; "Back to Accountanz" returns here).
        { label: "Workspace", href: "/projects", icon: SquareKanban },
        { label: "Task Management", href: "/admin/tasks", icon: ClipboardList },
        { label: "Document Centre", href: "/admin/documents", icon: FolderOpen },
        { label: "Reviews & Approvals", href: "/admin/reviews", icon: CircleCheck },
        { label: "Month-End Closing", href: "/admin/closing", icon: CalendarCheck },
        { label: "Team Progress", href: "/admin/workspace", icon: Activity },
        { label: "Reports & Analytics", href: "/admin/analytics", icon: ChartColumn },
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
      // Who works on what first (most used), then the people records.
      label: "People",
      items: [
        { label: "Assignments", href: "/admin/assignments", icon: ClipboardList },
        { label: "Teams", href: "/admin/teams", icon: UsersRound },
        { label: "Groups", href: "/admin/groups", icon: Group },
        { label: "Accountants", href: "/admin/accountants", icon: UserCog },
        { label: "Employees", href: "/admin/employees", icon: Users },
      ],
    },
    {
      // Configured once, revisited rarely.
      label: "Setup",
      items: [
        { label: "Task Templates", href: "/admin/task-templates", icon: ListChecks },
        { label: "JournL Access", href: "/admin/journl-access", icon: KeyRound },
        { label: "Integrations", href: "/admin/integrations", icon: Plug },
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
        // Opens the JournL area, which has its own module sub-sidebar (read-only, live from JournL).
        { label: "JournL Books", href: "/team/journl", icon: BookOpen },
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

/** The sidebars, without the JournL integration links while that integration is off (see lib/features.ts). */
export const NAV: Record<Portal, NavGroup[]> = JOURNL_INTEGRATION
  ? ALL_NAV
  : (Object.fromEntries(
      Object.entries(ALL_NAV).map(([portal, groups]) => [
        portal,
        groups.map((g) => ({ ...g, items: g.items.filter((i) => !JOURNL_INTEGRATION_HREFS.includes(i.href)) })).filter((g) => g.items.length > 0),
      ]),
    ) as Record<Portal, NavGroup[]>);
