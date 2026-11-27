"use client";

import Link from "next/link";
import { Check, Pencil, Trash2, TrendingUp } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ROLE_LABELS } from "@/lib/constants";
import { humanize } from "@/lib/format";
import { ApiError } from "@/lib/api-client";
import { useSession } from "@/features/auth/hooks/use-session";
import { useStaffMember, useUpdateStaff } from "../hooks/use-staff";
import type { StaffType } from "../types/staff.types";
import { DeleteStaffDialog } from "./delete-staff-dialog";
import { EditStaffDialog } from "./edit-staff-dialog";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid gap-1 border-b py-3 last:border-b-0 sm:grid-cols-[180px_1fr] sm:gap-4">
      <p className="text-muted-foreground text-sm">{label}</p>
      <div className="text-sm font-medium break-words">{value}</div>
    </div>
  );
}

export function StaffDetail({ id, staffType }: { id: number; staffType: StaffType }) {
  const { data: session } = useSession();
  const query = useStaffMember(id);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [approving, setApproving] = useState(false);
  const approve = useUpdateStaff(id);

  if (!Number.isInteger(id) || id <= 0) return <ErrorState error={new ApiError(404, "NOT_FOUND", "Person not found")} />;
  if (query.error) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  if (query.isLoading || !query.data) {
    return (
      <>
        <PageHeader title={staffType === "accountant" ? "Accountant" : "Employee"} />
        <Skeleton className="h-64 w-full" />
      </>
    );
  }

  const m = query.data;
  if (m.staff_type !== staffType) return <ErrorState error={new ApiError(404, "NOT_FOUND", "Person not found")} />;
  const base = staffType === "accountant" ? "/admin/accountants" : "/admin/employees";
  const pendingApproval = m.status === "disabled" && m.verification_status === "pending";

  const doApprove = async () => {
    setApproving(true);
    try {
      await approve.mutateAsync({ status: "active", verification_status: "verified" });
      toast.success(`${m.full_name} approved`);
      await query.refetch();
    } catch {
      toast.error("Couldn't approve registration");
    } finally {
      setApproving(false);
    }
  };

  return (
    <>
      <PageHeader
        title={m.full_name}
        description={staffType === "accountant" ? "Accountant details and approval" : "Employee details"}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" asChild><Link href={base}>Back</Link></Button>
            {pendingApproval && (
              <Button onClick={() => void doApprove()} disabled={approving || approve.isPending}>
                <Check className="size-4" /> {approving || approve.isPending ? "Approving..." : "Approve"}
              </Button>
            )}
            <Button variant="outline" asChild><Link href={`/admin/progress/${m.user_id}`}><TrendingUp className="size-4" /> Progress</Link></Button>
            <Button variant="outline" onClick={() => setEditing(true)}><Pencil className="size-4" /> Edit</Button>
            {m.user_id !== session?.id && (
              <Button variant="destructive" onClick={() => setDeleting(true)}><Trash2 className="size-4" /> Delete</Button>
            )}
          </div>
        }
      />

      {pendingApproval && (
        <div className="border-primary/30 bg-primary/5 mb-4 rounded-lg border px-4 py-3 text-sm">
          This registration is pending admin approval. Approve to allow sign-in, or edit to reject/adjust details.
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
          <CardContent>
            <Row label="Name" value={m.full_name} />
            <Row label="Email" value={m.email} />
            <Row label="Phone" value={m.phone || "—"} />
            <Row label="Portal role" value={ROLE_LABELS[m.portal_role]} />
            <Row label="Account status" value={<StatusBadge status={m.status} />} />
            <Row label="Verification" value={<StatusBadge status={m.verification_status} />} />
            <Row label="Active clients" value={<span className="tabular-nums">{m.active_clients}</span>} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Professional & payout details</CardTitle></CardHeader>
          <CardContent>
            <Row label="Expertise" value={(m.expertise ?? []).length ? (
              <div className="flex flex-wrap gap-1">{(m.expertise ?? []).map((e) => <span key={e} className="bg-secondary rounded px-1.5 py-0.5 text-xs font-medium">{e}</span>)}</div>
            ) : "—"} />
            {staffType === "accountant" && (
              <>
                <Row label="Hourly rate" value={m.hourly_rate == null ? "—" : `₹ ${m.hourly_rate}`} />
                <Row label="Bank account name" value={m.bank_account_name || "—"} />
                <Row label="Bank account" value={m.bank_account_last4 ? <span className="font-mono">•••• {m.bank_account_last4}</span> : "—"} />
                <Row label="IFSC" value={m.bank_ifsc ? <span className="font-mono uppercase">{m.bank_ifsc}</span> : "—"} />
              </>
            )}
            {staffType !== "accountant" && <Row label="Type" value={humanize(m.staff_type)} />}
          </CardContent>
        </Card>
      </div>

      <EditStaffDialog member={editing ? m : null} onOpenChange={(o) => { if (!o) { setEditing(false); void query.refetch(); } }} />
      <DeleteStaffDialog
        member={deleting ? m : null}
        onClose={() => setDeleting(false)}
        onDisableInstead={() => { setDeleting(false); setEditing(true); }}
      />
    </>
  );
}
