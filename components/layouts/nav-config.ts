import {
  Bell,
  Boxes,
  Landmark,
  Percent,
  ShoppingCart,
  Truck,
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
  LayoutDashboard,
  type LucideIcon,
  Package,
  Plug,
  Receipt,
  ScrollText,
  Settings,
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
    { label: "Overview", items: [{ label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard }] },
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
      ],
    },
    {
      // Live, read-only views of each client's JournL books (the access the bookkeeper is granted).
      label: "Accounting — JournL",
      items: [
        { label: "Sales", href: "/team/journl/sales", icon: Receipt },
        { label: "Purchases", href: "/team/journl/purchases", icon: ShoppingCart },
        { label: "Expenses", href: "/team/journl/expenses", icon: Wallet },
        { label: "Accounting & Ledgers", href: "/team/journl/accounting", icon: BookOpen },
        { label: "Customers", href: "/team/journl/customers", icon: Users },
        { label: "Vendors", href: "/team/journl/vendors", icon: Truck },
        { label: "Banking", href: "/team/journl/banking", icon: Landmark },
        { label: "Inventory", href: "/team/journl/inventory", icon: Boxes },
        { label: "GST & Tax", href: "/team/journl/gst", icon: Percent },
        { label: "Financial Reports", href: "/team/journl/financial_reports", icon: ChartColumn },
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
    { label: "Overview", items: [{ label: "Dashboard", href: "/app/dashboard", icon: LayoutDashboard }] },
    {
      label: "My company",
      items: [
        { label: "My Business", href: "/app/business", icon: Building2 },
        { label: "My Accounting Team", href: "/app/team", icon: UsersRound },
        { label: "Accounting Software", href: "/app/software", icon: Plug },
      ],
    },
    {
      label: "Work",
      items: [
        { label: "Document Centre", href: "/app/documents", icon: FolderOpen },
        { label: "Document Requests", href: "/app/requests", icon: FileText },
        { label: "Tasks & Progress", href: "/app/progress", icon: ListChecks },
        { label: "Reports", href: "/app/reports", icon: ChartColumn },
        { label: "Approvals", href: "/app/approvals", icon: CircleCheck },
      ],
    },
    {
      label: "Contact",
      items: [
        { label: "Messages", href: "/app/messages", icon: MessageSquare },
        { label: "Meetings", href: "/app/meetings", icon: CalendarDays },
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
