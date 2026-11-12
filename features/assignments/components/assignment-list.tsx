"use client";

import { ArrowRightLeft, MoreHorizontal, Pencil, Plus, UserMinus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { DataTable, type Column } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { applyApiError } from "@/lib/form-errors";
import { formatDate } from "@/lib/format";
import { useAssignmentOptions, useAssignments, useEndAssignment } from "../hooks/use-assignments";
import { PHASE_LABELS, TEAM_ROLE_LABELS, TEAM_ROLES, type Assignment, type AssignmentStatus, type TeamRole } from "../types/assignment.types";
import { AssignmentEditDialog } from "./assignment-edit-dialog";
import { AssignmentFormDialog } from "./assignment-form-dialog";

const ALL = "all";

export function AssignmentList({ clientId }: { clientId?: number }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<AssignmentStatus | typeof ALL>("active");
  const [role, setRole] = useState<TeamRole | typeof ALL>(ALL);
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Assignment | null>(null);
  const [replacing, setReplacing] = useState<Assignment | undefined>();
  const [ending, setEnding] = useState<Assignment | null>(null);
  const end = useEndAssignment();
  const options = useAssignmentOptions(!!clientId);
  const clientName = options.data?.clients.find((c) => c.id === clientId)?.name;

  const query = useAssignments({
    q,
    status: status === ALL ? undefined : status,
    team_role: role === ALL ? undefined : role,
    clientId,
    page,
  });

  async function confirmEnd() {
    if (!ending) return;
    try {
      await end.mutateAsync(ending.id);
      toast.success(`${ending.full_name} no longer has access to ${ending.client_name}`);
      setEnding(null);
    } catch (err) {
      applyApiError(err);
    }
  }

  const columns: Column<Assignment>[] = [
    {
      key: "person",
      header: "Accountant",
      cell: (a) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{a.full_name}</p>
          <p className="text-muted-foreground truncate text-xs">{a.email}</p>
        </div>
      ),
    },
    ...(clientId ? [] : [{ key: "client", header: "Client", cell: (a: Assignment) => <span className="truncate">{a.client_name}</span> }]),
    { key: "role", header: "Team role", cell: (a) => TEAM_ROLE_LABELS[a.team_role] },
    {
      key: "dates",
      header: "Dates",
      hideOnMobile: true,
      cell: (a) => (
        <span className="text-sm whitespace-nowrap tabular-nums">
          {formatDate(a.valid_from)} – {a.valid_to ? formatDate(a.valid_to) : <span className="text-muted-foreground">open</span>}
        </span>
      ),
    },
    {
      key: "access",
      header: "Access",
      cell: (a) => (
        <div>
          <StatusBadge status={a.phase} label={PHASE_LABELS[a.phase]} />
          {a.replaced_by_name && <p className="text-muted-foreground mt-1 text-xs">Handed to {a.replaced_by_name}</p>}
        </div>
      ),
    },
    { key: "journl", header: "JournL", hideOnMobile: true, cell: (a) => (a.journl_access ? "Yes" : <span className="text-muted-foreground">No</span>) },
    {
      key: "actions",
      header: "",
      className: "w-10 text-right",
      cell: (a) =>
        a.status === "active" ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8" aria-label={`Actions for ${a.full_name} on ${a.client_name}`}>
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setEditing(a)}><Pencil className="size-4" /> Edit dates & access</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setReplacing(a)}><ArrowRightLeft className="size-4" /> Hand over to someone else</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => setEnding(a)}><UserMinus className="size-4" /> End assignment</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null,
    },
  ];

  const filtered = q || status !== "active" || role !== ALL;

  return (
    <>
      <PageHeader
        title="Assignments"
        description="Who can work on which client, in what role, and for how long."
        actions={<Button onClick={() => setCreating(true)}><Plus className="size-4" /> New assignment</Button>}
      />
      <div className="bg-card rounded-xl border shadow-xs">
        <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center">
          <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder={clientId ? "Search by name or email" : "Search by client, name or email"} />
          <div className="flex flex-col gap-3 sm:flex-row">
            <Select value={status} onValueChange={(v) => { setStatus(v as AssignmentStatus | typeof ALL); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-36" aria-label="Filter by status"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="ended">Ended</SelectItem>
                <SelectItem value={ALL}>All</SelectItem>
              </SelectContent>
            </Select>
            <Select value={role} onValueChange={(v) => { setRole(v as TeamRole | typeof ALL); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-44" aria-label="Filter by team role"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All roles</SelectItem>
                {TEAM_ROLES.map((r) => <SelectItem key={r} value={r}>{TEAM_ROLE_LABELS[r]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {clientId && (
            <Button variant="secondary" size="sm" className="self-start lg:ml-auto lg:self-center" onClick={() => router.push("/admin/assignments")}>
              Client: {clientName ?? `#${clientId}`} <X className="size-3.5" aria-label="Clear client filter" />
            </Button>
          )}
        </div>
        <DataTable
          columns={columns}
          rows={query.data?.items}
          rowKey={(a) => a.id}
          isLoading={query.isLoading}
          error={query.error}
          onRetry={() => void query.refetch()}
          empty={
            filtered
              ? { title: "No assignments match", description: "Try a different search or filter." }
              : { title: "No one is assigned yet", description: "Assign an accountant to give them access to a client.", action: <Button size="sm" onClick={() => setCreating(true)}>New assignment</Button> }
          }
          pagination={query.data && { ...query.data, onPageChange: setPage }}
        />
      </div>

      <AssignmentFormDialog open={creating} onOpenChange={setCreating} clientId={clientId} />
      <AssignmentFormDialog open={!!replacing} onOpenChange={(open) => !open && setReplacing(undefined)} replacing={replacing} />
      <AssignmentEditDialog assignment={editing} onOpenChange={(open) => !open && setEditing(null)} />

      <Dialog open={!!ending} onOpenChange={(open) => !open && setEnding(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>End assignment?</DialogTitle>
            <DialogDescription>
              {ending && `${ending.full_name} loses access to ${ending.client_name} straight away. This is recorded in the audit log.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEnding(null)}>Cancel</Button>
            <Button variant="destructive" disabled={end.isPending} onClick={() => void confirmEnd()}>End assignment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
