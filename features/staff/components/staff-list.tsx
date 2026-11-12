"use client";

import { Pencil, Trash2, UserPlus } from "lucide-react";
import { useState } from "react";
import { DataTable, type Column } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS } from "@/lib/constants";
import { useStaff } from "../hooks/use-staff";
import type { StaffMember, StaffType } from "../types/staff.types";
import { useSession } from "@/features/auth/hooks/use-session";
import { DeleteStaffDialog } from "./delete-staff-dialog";
import { EditStaffDialog } from "./edit-staff-dialog";
import { InviteDialog } from "./invite-dialog";

const COPY: Record<StaffType, { title: string; description: string }> = {
  accountant: { title: "Accountants", description: "Bookkeepers, finance managers and CFOs. Bank details are masked to the last four digits." },
  employee: { title: "Employees", description: "Ops staff who run onboarding, billing and the admin portal." },
};

export function StaffList({ staffType }: { staffType: StaffType }) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [inviting, setInviting] = useState(false);
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [deleting, setDeleting] = useState<StaffMember | null>(null);
  const { data: session } = useSession();
  const query = useStaff({ type: staffType, q, page });

  const columns: Column<StaffMember>[] = [
    {
      key: "name",
      header: "Name",
      cell: (m) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{m.full_name}</p>
          <p className="text-muted-foreground truncate text-xs">{m.email}</p>
        </div>
      ),
    },
    { key: "role", header: "Portal role", cell: (m) => ROLE_LABELS[m.portal_role] },
    {
      key: "expertise",
      header: "Expertise",
      hideOnMobile: true,
      cell: (m) => (
        <div className="flex flex-wrap gap-1">
          {(m.expertise ?? []).map((e) => <span key={e} className="bg-secondary rounded px-1.5 py-0.5 text-xs">{e}</span>)}
        </div>
      ),
    },
    { key: "clients", header: "Clients", hideOnMobile: true, cell: (m) => <span className="tabular-nums">{m.active_clients}</span> },
    { key: "verification", header: "Verification", hideOnMobile: true, cell: (m) => <StatusBadge status={m.verification_status} /> },
    ...(staffType === "accountant"
      ? [{ key: "bank", header: "Bank", hideOnMobile: true, cell: (m: StaffMember) => (m.bank_account_last4 ? <span className="font-mono text-xs">••••{m.bank_account_last4}</span> : "—") }]
      : []),
    { key: "status", header: "Account", cell: (m) => <StatusBadge status={m.status} /> },
    {
      key: "actions",
      header: "",
      className: "w-24 text-right",
      cell: (m) => (
        <div className="flex justify-end">
          <Button variant="ghost" size="icon" aria-label={`Edit ${m.full_name}`} onClick={() => setEditing(m)}><Pencil className="size-4" /></Button>
          {m.user_id !== session?.id && (
            <Button variant="ghost" size="icon" aria-label={`Delete ${m.full_name}`} onClick={() => setDeleting(m)}><Trash2 className="size-4" /></Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title={COPY[staffType].title}
        description={COPY[staffType].description}
        actions={<Button onClick={() => setInviting(true)}><UserPlus className="size-4" /> Invite</Button>}
      />
      <div className="bg-card rounded-xl border shadow-xs">
        <div className="border-b p-4">
          <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search people" />
        </div>
        <DataTable
          columns={columns}
          rows={query.data?.items}
          rowKey={(m) => m.user_id}
          isLoading={query.isLoading}
          error={query.error}
          onRetry={() => void query.refetch()}
          empty={{ title: q ? "No one matches" : `No ${COPY[staffType].title.toLowerCase()} yet` }}
          pagination={query.data && { ...query.data, onPageChange: setPage }}
        />
      </div>
      <InviteDialog open={inviting} onOpenChange={setInviting} staffType={staffType} />
      <EditStaffDialog member={editing} onOpenChange={(o) => !o && setEditing(null)} />
      <DeleteStaffDialog member={deleting} onClose={() => setDeleting(null)} onDisableInstead={(m) => setEditing(m)} />
    </>
  );
}
