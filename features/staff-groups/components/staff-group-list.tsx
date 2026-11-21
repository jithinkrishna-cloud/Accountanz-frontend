"use client";

import { AlertTriangle, Pencil, Plus, Trash2, UserPlus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { TEAM_ROLE_LABELS } from "@/features/assignments/types/assignment.types";
import { applyApiError } from "@/lib/form-errors";
import { initials } from "@/lib/format";
import { useDeleteStaffGroup, useStaffGroups } from "../hooks/use-staff-groups";
import type { StaffGroup } from "../services/staff-group-service";
import { AssignGroupDialog } from "./assign-group-dialog";
import { StaffGroupFormDialog } from "./staff-group-form-dialog";

function GroupCard({ group, onEdit, onAssign, onDelete }: { group: StaffGroup; onEdit: () => void; onAssign: () => void; onDelete: () => void }) {
  const blocked = group.members.filter((m) => !m.assignable);
  return (
    <article className="bg-card flex flex-col rounded-xl border shadow-xs">
      <header className="flex items-start justify-between gap-3 border-b px-5 py-4">
        <div className="min-w-0">
          <h2 className="truncate font-medium">{group.name}</h2>
          <p className="text-muted-foreground line-clamp-2 text-xs">{group.description ?? `${group.members.length} ${group.members.length === 1 ? "member" : "members"}`}</p>
        </div>
        <div className="flex shrink-0">
          <Button variant="ghost" size="icon" className="size-8" onClick={onEdit} aria-label={`Edit ${group.name}`}><Pencil className="size-4" /></Button>
          <Button variant="ghost" size="icon" className="size-8" onClick={onDelete} aria-label={`Delete ${group.name}`}><Trash2 className="size-4" /></Button>
        </div>
      </header>

      <div className="flex-1 space-y-4 px-5 py-4">
        <ul className="space-y-3">
          {group.members.map((m) => (
            <li key={`${m.user_id}-${m.team_role}`} className="flex items-center gap-3">
              <Avatar className="size-8">
                <AvatarFallback className="bg-accent text-[11px]">{initials(m.full_name)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{m.full_name}</p>
                <p className="text-muted-foreground truncate text-xs">
                  {TEAM_ROLE_LABELS[m.team_role]}
                  {m.journl_access && " · JournL"}
                </p>
              </div>
            </li>
          ))}
        </ul>
        {blocked.length > 0 && (
          <p className="text-warning flex items-center gap-1.5 text-xs font-medium">
            <AlertTriangle className="size-3.5" aria-hidden /> {blocked.map((m) => m.full_name).join(", ")} can&apos;t be assigned (inactive or not verified)
          </p>
        )}
        <div>
          <p className="text-muted-foreground mb-1.5 text-xs font-medium">Assigned to</p>
          {group.clients.length === 0 ? (
            <p className="text-muted-foreground text-sm">No clients yet</p>
          ) : (
            <ul className="flex flex-wrap gap-1.5">
              {group.clients.map((c) => (
                <li key={c.id}>
                  <Link href={`/admin/assignments?clientId=${c.id}`} className="bg-muted hover:bg-muted/70 inline-block rounded-md px-2 py-0.5 text-xs">{c.name}</Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <footer className="border-t px-5 py-3">
        <Button variant="link" className="h-auto p-0" onClick={onAssign}>
          <UserPlus className="size-4" aria-hidden /> Assign to a client
        </Button>
      </footer>
    </article>
  );
}

export function StaffGroupList() {
  const query = useStaffGroups();
  const del = useDeleteStaffGroup();
  const [editing, setEditing] = useState<StaffGroup | null>(null);
  const [creating, setCreating] = useState(false);
  const [assigning, setAssigning] = useState<StaffGroup | null>(null);
  const [deleting, setDeleting] = useState<StaffGroup | null>(null);

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await del.mutateAsync(deleting.id);
      toast.success(`${deleting.name} deleted. Its assignments stay in place.`);
      setDeleting(null);
    } catch (err) {
      applyApiError(err);
    }
  }

  return (
    <>
      <PageHeader
        title="Groups"
        description="Reusable sets of people and roles. Assign a group to a client to create everyone's assignment in one step."
        actions={<Button onClick={() => setCreating(true)}><Plus className="size-4" /> New group</Button>}
      />

      {query.error ? (
        <div className="bg-card rounded-xl border"><ErrorState error={query.error} onRetry={() => void query.refetch()} /></div>
      ) : query.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
        </div>
      ) : query.data?.length === 0 ? (
        <div className="bg-card rounded-xl border">
          <EmptyState
            title="No groups yet"
            description="For example, Team A: a finance manager and a bookkeeper who usually work together."
            action={<Button size="sm" onClick={() => setCreating(true)}>New group</Button>}
          />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {query.data?.map((g) => (
            <GroupCard key={g.id} group={g} onEdit={() => setEditing(g)} onAssign={() => setAssigning(g)} onDelete={() => setDeleting(g)} />
          ))}
        </div>
      )}

      <StaffGroupFormDialog open={creating} onOpenChange={setCreating} />
      <StaffGroupFormDialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)} group={editing} />
      <AssignGroupDialog open={!!assigning} onOpenChange={(open) => !open && setAssigning(null)} groupId={assigning?.id} />

      <Dialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete {deleting?.name}?</DialogTitle>
            <DialogDescription>
              The group goes away, but nobody loses access: assignments already made from it stay until you end them in Assignments.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => void confirmDelete()} disabled={del.isPending}>Delete group</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
