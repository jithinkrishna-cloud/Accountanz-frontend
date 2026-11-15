"use client";

import { Activity, Users } from "lucide-react";
import Link from "next/link";
import { KpiCard } from "@/components/shared/kpi-card";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable, type Column } from "@/components/shared/data-table";
import { cn } from "@/lib/utils";
import { useAdminDashboard } from "@/features/dashboard/hooks/use-admin-dashboard";
import { useAdminWorkspaceClients } from "@/features/workspace/hooks/use-workspace";
import { useTasks } from "@/features/tasks/hooks/use-tasks";
import type { MyClient } from "@/features/workspace/types/workspace.types";

function AdminClientsTable() {
  const { data, isLoading, error, refetch } = useAdminWorkspaceClients();
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;
  const rows: MyClient[] = data ?? [];

  const columns: Column<MyClient>[] = [
    { key: "name", header: "Client", cell: (r: MyClient) => <Link href={`/admin/clients/${r.id}`} className="font-medium hover:underline">{r.name}</Link> },
    { key: "legal_name", header: "Legal name", hideOnMobile: true, cell: (r: MyClient) => <span className="text-muted-foreground text-xs truncate max-w-[200px]">{r.legal_name}</span> },
    { key: "status", header: "Status", cell: (r: MyClient) => <StatusBadge status={r.status} /> },
    { key: "roles", header: "Team roles", hideOnMobile: true, cell: (r: MyClient) => <span className="text-muted-foreground text-xs">{r.roles || "—"}</span> },
    { key: "package", header: "Package", hideOnMobile: true, cell: (r: MyClient) => <span className="text-muted-foreground text-xs">{r.package_name || "—"}</span> },
    { key: "open", header: "Open tasks", cell: (r: MyClient) => <span className="tabular-nums">{r.open_tasks}</span> },
    { key: "overdue", header: "Overdue", cell: (r: MyClient) => <span className={cn("tabular-nums", r.overdue_tasks > 0 ? "text-destructive font-medium" : "text-muted-foreground")}>{r.overdue_tasks}</span> },
    { key: "closing", header: "Closing", cell: (r: MyClient) => <StatusBadge status={r.closing_status} /> },
  ];

  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={(r) => r.id}
      isLoading={isLoading}
      error={error}
      onRetry={() => void refetch()}
      empty={{ title: "No clients", description: "There are no clients to display." }}
    />
  );
}

function AdminAccountantsTable() {
  const query = useTasks({ q: undefined, status: undefined, source: undefined, page: 1, pageSize: 100 }, "admin");
  if (query.error) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  const rows = query.data?.items ?? [];

  const byAssignee = new Map<string, { name: string; email: string; total: number; open: number; overdue: number; approved: number }>();
  const today = new Date().toISOString().slice(0, 10);
  for (const t of rows) {
    const key = t.assignee_email ?? "unassigned";
    const existing = byAssignee.get(key) ?? { name: t.assignee_email ?? "Unassigned", email: key, total: 0, open: 0, overdue: 0, approved: 0 };
    existing.total += 1;
    if (t.status !== "approved") existing.open += 1;
    if (t.status === "approved") existing.approved += 1;
    if (t.due_date && t.status !== "approved" && t.due_date < today) existing.overdue += 1;
    byAssignee.set(key, existing);
  }

  const accountants = Array.from(byAssignee.values()).sort((a, b) => b.total - a.total);

  const columns: Column<{
    name: string;
    email: string;
    total: number;
    open: number;
    overdue: number;
    approved: number;
  }>[] = [
    { key: "name", header: "Accountant", cell: (r) => <span className="font-medium">{r.name}</span> },
    { key: "email", header: "Email", hideOnMobile: true, cell: (r) => <span className="text-muted-foreground text-xs truncate">{r.email}</span> },
    { key: "total", header: "Total tasks", cell: (r) => <span className="tabular-nums">{r.total}</span> },
    { key: "open", header: "Open", cell: (r) => <span className="tabular-nums">{r.open}</span> },
    { key: "overdue", header: "Overdue", cell: (r) => <span className={cn("tabular-nums", r.overdue > 0 ? "text-destructive font-medium" : "text-muted-foreground")}>{r.overdue}</span> },
    { key: "approved", header: "Approved", cell: (r) => <span className="tabular-nums text-muted-foreground">{r.approved}</span> },
  ];

  return (
    <DataTable
      columns={columns}
      rows={accountants}
      rowKey={(r) => r.email}
      isLoading={query.isLoading}
      error={query.error}
      onRetry={() => void query.refetch()}
      empty={{ title: "No accountants", description: "No accountants have tasks assigned." }}
    />
  );
}

export default function AdminWorkspacePage() {
  const { data: dashboard, isLoading: loading, error, refetch } = useAdminDashboard();

  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;
  if (loading || !dashboard) {
    return (
      <>
        <PageHeader title="Workspace" description="All clients and every accountant’s working progress across the firm." />
        <div className="grid gap-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-8 w-48" /><Skeleton className="h-8 w-48" /></div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Workspace"
        description="All clients and every accountant’s working progress across the firm."
        actions={
          <div className="flex items-center gap-2">
            <Link href="/admin/clients" className="text-primary text-xs font-medium hover:underline">All clients</Link>
            <Link href="/admin/tasks" className="text-primary text-xs font-medium hover:underline">All tasks</Link>
          </div>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Active clients" value={dashboard.clients.active} loading={loading} />
        <KpiCard label="Open tasks" value={dashboard.tasks.total} loading={loading} details={[{ label: "Overdue", value: dashboard.tasks.overdue }]} />
        <KpiCard label="Waiting for review" value={dashboard.reviews.waiting} loading={loading} details={[{ label: "Over 2 days", value: dashboard.reviews.overTwoDays }]} />
        <KpiCard label="Service revenue" value={dashboard.revenue.billed} loading={loading} details={[{ label: "Outstanding", value: dashboard.revenue.outstanding }]} />
      </div>

      <div className="grid gap-6">
        <div className="lg:col-span-2">
          <div className="bg-card rounded-xl border shadow-xs">
            <header className="flex items-center justify-between gap-3 border-b px-5 py-4">
              <h2 className="flex items-center gap-2 font-medium">
                <Activity className="size-4" aria-hidden /> All clients
              </h2>
              <Link href="/admin/clients" className="text-primary text-sm font-medium hover:underline">View all</Link>
            </header>
            <div className="border-t border-muted/50">
              <AdminClientsTable />
            </div>
          </div>
        </div>
        <div className="lg:col-span-2">
          <div className="bg-card rounded-xl border shadow-xs">
            <header className="flex items-center justify-between gap-3 border-b px-5 py-4">
              <h2 className="flex items-center gap-2 font-medium">
                <Users className="size-4" aria-hidden /> Accountant progress
              </h2>
              <Link href="/admin/tasks" className="text-primary text-sm font-medium hover:underline">View all</Link>
            </header>
            <div className="border-t border-muted/50">
              <AdminAccountantsTable />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
