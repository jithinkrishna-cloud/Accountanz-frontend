"use client";

import { Activity, Users } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { KpiCard } from "@/components/shared/kpi-card";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable, type Column } from "@/components/shared/data-table";
import { cn } from "@/lib/utils";
import { useAdminDashboard } from "@/features/dashboard/hooks/use-admin-dashboard";
import { useStaffGroups } from "@/features/staff-groups/hooks/use-staff-groups";
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

type TaskCountRow = { name: string; members: string; total: number; open: number; overdue: number; approved: number };

function countTasks(rows: { status: string; due_date: string | null }[]) {
  const today = new Date().toISOString().slice(0, 10);
  let open = 0;
  let overdue = 0;
  let approved = 0;
  for (const t of rows) {
    if (t.status === "approved") approved += 1;
    else open += 1;
    if (t.due_date && t.status !== "approved" && t.due_date < today) overdue += 1;
  }
  return { total: rows.length, open, overdue, approved };
}

function AdminTeamProgressTable() {
  const [groupWise, setGroupWise] = useState(true);
  const tasks = useTasks({ q: undefined, status: undefined, source: undefined, page: 1, pageSize: 100 }, "admin");
  const groups = useStaffGroups(groupWise);
  const loading = tasks.isLoading || (groupWise && groups.isLoading);
  const error = tasks.error ?? (groupWise ? groups.error : null);
  const retry = () => { void tasks.refetch(); if (groupWise) void groups.refetch(); };

  const rows = useMemo<TaskCountRow[]>(() => {
    const items = tasks.data?.items ?? [];
    if (!groupWise) {
      const byAssignee = new Map<string, { name: string; items: typeof items }>();
      for (const t of items) {
        const key = t.assignee_email ?? "unassigned";
        const row = byAssignee.get(key) ?? { name: t.assignee_email ?? "Unassigned", items: [] as typeof items };
        row.items.push(t);
        byAssignee.set(key, row);
      }
      return Array.from(byAssignee.values()).map((r) => ({ name: r.name, members: "—", ...countTasks(r.items) })).sort((a, b) => b.total - a.total);
    }

    const groupList = groups.data ?? [];
    const emailToGroups = new Map<string, string[]>();
    for (const g of groupList) for (const m of g.members) {
      const key = m.email.toLowerCase();
      emailToGroups.set(key, [...(emailToGroups.get(key) ?? []), g.name]);
    }
    const byGroup = new Map<string, { name: string; members: string; items: typeof items }>();
    for (const g of groupList) byGroup.set(g.name, { name: g.name, members: g.members.map((m) => m.full_name).join(", ") || "—", items: [] as typeof items });
    const ungrouped: typeof items = [];
    for (const t of items) {
      const names = emailToGroups.get(t.assignee_email?.toLowerCase() ?? "");
      if (!names?.length) { ungrouped.push(t); continue; }
      for (const name of names) byGroup.get(name)?.items.push(t);
    }
    const result = Array.from(byGroup.values()).map((r) => ({ name: r.name, members: r.members, ...countTasks(r.items) }));
    if (ungrouped.length) result.push({ name: "Ungrouped", members: "Assignees not in a staff group", ...countTasks(ungrouped) });
    return result.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
  }, [groupWise, groups.data, tasks.data?.items]);

  const columns: Column<TaskCountRow>[] = [
    { key: "name", header: groupWise ? "Group" : "Accountant", cell: (r) => <span className="font-medium">{r.name}</span> },
    { key: "members", header: groupWise ? "Members" : "Email", hideOnMobile: true, cell: (r) => <span className="text-muted-foreground max-w-[260px] truncate text-xs">{r.members}</span> },
    { key: "total", header: "Total tasks", cell: (r) => <span className="tabular-nums">{r.total}</span> },
    { key: "open", header: "Open", cell: (r) => <span className="tabular-nums">{r.open}</span> },
    { key: "overdue", header: "Overdue", cell: (r) => <span className={cn("tabular-nums", r.overdue > 0 ? "text-destructive font-medium" : "text-muted-foreground")}>{r.overdue}</span> },
    { key: "approved", header: "Approved", cell: (r) => <span className="text-muted-foreground tabular-nums">{r.approved}</span> },
  ];

  return (
    <div>
      <div className="flex items-center gap-2 border-b px-5 py-3">
        <Button size="sm" variant={groupWise ? "secondary" : "outline"} aria-pressed={groupWise} onClick={() => setGroupWise(true)}>Group wise</Button>
        <Button size="sm" variant={!groupWise ? "secondary" : "outline"} aria-pressed={!groupWise} onClick={() => setGroupWise(false)}>By accountant</Button>
      </div>
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.name}
        isLoading={loading}
        error={error}
        onRetry={retry}
        empty={{ title: groupWise ? "No staff groups" : "No accountants", description: groupWise ? "Create staff groups to see group-wise task progress." : "No accountants have tasks assigned." }}
      />
    </div>
  );
}

export default function AdminWorkspacePage() {
  const { data: dashboard, isLoading: loading, error, refetch } = useAdminDashboard();

  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;
  if (loading || !dashboard) {
    return (
      <>
        <PageHeader title="Team Progress" description="All clients and every accountant’s working progress across the firm." />
        <div className="grid gap-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-8 w-48" /><Skeleton className="h-8 w-48" /></div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Team Progress"
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

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="min-w-0">
          <div className="bg-card rounded-xl border shadow-xs">
            <header className="flex items-center justify-between gap-3 border-b px-5 py-4">
              <h2 className="flex items-center gap-2 font-medium">
                <Users className="size-4" aria-hidden /> Team progress
              </h2>
              <Link href="/admin/tasks" className="text-primary text-sm font-medium hover:underline">View all</Link>
            </header>
            <div className="border-t border-muted/50">
              <AdminTeamProgressTable />
            </div>
          </div>
        </div>
        <div className="min-w-0">
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
      </div>
    </>
  );
}
