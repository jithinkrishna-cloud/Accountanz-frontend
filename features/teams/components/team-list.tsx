"use client";

import { AlertTriangle, ChevronLeft, ChevronRight, Pencil, Plus, UserPlus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { TEAM_ROLE_LABELS } from "@/features/assignments/types/assignment.types";
import { applyApiError } from "@/lib/form-errors";
import { formatDate, initials } from "@/lib/format";
import type { Team } from "../services/team-service";
import { useRenameTeam, useTeams } from "../hooks/use-teams";
import { CreateTeamDialog } from "./create-team-dialog";

/** Gaps worth flagging: work needs someone to do it and someone to review it. */
function gaps(team: Team) {
  const roles = new Set(team.members.map((m) => m.team_role));
  const out: string[] = [];
  if (!roles.has("bookkeeper")) out.push("No bookkeeper");
  if (!roles.has("finance_manager") && !roles.has("reviewer") && !roles.has("cfo")) out.push("No reviewer");
  return out;
}

function TeamCard({ team, onRename }: { team: Team; onRename: () => void }) {
  const missing = gaps(team);
  return (
    <article className="bg-card flex flex-col rounded-xl border shadow-xs">
      <header className="flex items-start justify-between gap-3 border-b px-5 py-4">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h2 className="truncate font-medium">{team.team_name}</h2>
            <Button variant="ghost" size="icon" className="size-7 shrink-0" onClick={onRename} aria-label={`Rename ${team.team_name}`}>
              <Pencil className="size-3.5" />
            </Button>
          </div>
          <Link href={`/admin/clients/${team.client_id}`} className="text-muted-foreground text-xs hover:underline">{team.client_name}</Link>
        </div>
        <StatusBadge status={team.client_status} />
      </header>

      <div className="flex-1 px-5 py-4">
        {team.members.length === 0 ? (
          <p className="text-muted-foreground text-sm">No one has access today.</p>
        ) : (
          <ul className="space-y-3">
            {team.members.map((m) => (
              <li key={m.assignment_id} className="flex items-center gap-3">
                <Avatar className="size-8">
                  <AvatarFallback className="bg-accent text-[11px]">{initials(m.full_name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{m.full_name}</p>
                  <p className="text-muted-foreground truncate text-xs">
                    {TEAM_ROLE_LABELS[m.team_role]}
                    {m.journl_access && " · JournL"}
                    {m.valid_to && ` · until ${formatDate(m.valid_to)}`}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
        {missing.length > 0 && (
          <p className="text-warning mt-4 flex items-center gap-1.5 text-xs font-medium">
            <AlertTriangle className="size-3.5" aria-hidden /> {missing.join(" · ")}
          </p>
        )}
        {team.scheduled_count > 0 && (
          <p className="text-muted-foreground mt-2 text-xs">{team.scheduled_count} more starting later</p>
        )}
      </div>

      <footer className="border-t px-5 py-3">
        <Link href={`/admin/assignments?clientId=${team.client_id}`} className="text-primary inline-flex items-center gap-1.5 text-sm font-medium hover:underline">
          <UserPlus className="size-4" aria-hidden /> Manage assignments
        </Link>
      </footer>
    </article>
  );
}

function RenameDialog({ team, onOpenChange }: { team: Team | null; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={!!team} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">{team && <RenameForm key={team.client_id} team={team} onDone={() => onOpenChange(false)} />}</DialogContent>
    </Dialog>
  );
}

function RenameForm({ team, onDone }: { team: Team; onDone: () => void }) {
  const rename = useRenameTeam();
  const [name, setName] = useState(team.team_name);
  const [error, setError] = useState<string>();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = name.trim();
    if (value.length < 2) {
      setError("Enter a team name");
      return;
    }
    try {
      await rename.mutateAsync({ clientId: team.client_id, name: value });
      toast.success("Team renamed");
      onDone();
    } catch (err) {
      setError(applyApiError(err));
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Rename team</DialogTitle>
      </DialogHeader>
      <form id="rename-team-form" className="grid gap-1.5" onSubmit={(e) => void onSubmit(e)}>
        <Label htmlFor="team-name">Team name</Label>
        <Input id="team-name" value={name} maxLength={150} autoFocus aria-invalid={!!error} onChange={(e) => setName(e.target.value)} />
        {error && <p role="alert" className="text-destructive text-xs">{error}</p>}
      </form>
      <DialogFooter>
        <Button variant="outline" onClick={onDone}>Cancel</Button>
        <Button type="submit" form="rename-team-form" disabled={rename.isPending}>Save</Button>
      </DialogFooter>
    </>
  );
}

export function TeamList() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [renaming, setRenaming] = useState<Team | null>(null);
  const [creating, setCreating] = useState(false);
  const query = useTeams({ q, page });
  const data = query.data;

  return (
    <>
      <PageHeader
        title="Teams"
        description="One team per client, built from everyone with an active assignment."
        actions={<Button onClick={() => setCreating(true)}><Plus className="size-4" /> Create team</Button>}
      />
      <div className="mb-4 max-w-md">
        <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search by client, team or person" />
      </div>

      {query.error ? (
        <div className="bg-card rounded-xl border"><ErrorState error={query.error} onRetry={() => void query.refetch()} /></div>
      ) : query.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-56 rounded-xl" />)}
        </div>
      ) : data?.items.length === 0 ? (
        <div className="bg-card rounded-xl border">
          <EmptyState
            title={q ? "No teams match" : "No teams yet"}
            description={q ? "Try a different search." : "Create a team for a client; its members come from that client's assignments."}
            action={!q && <Button size="sm" onClick={() => setCreating(true)}>Create team</Button>}
          />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {data?.items.map((t) => <TeamCard key={t.client_id} team={t} onRename={() => setRenaming(t)} />)}
        </div>
      )}

      {data && data.total > data.pageSize && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {(data.page - 1) * data.pageSize + 1}–{Math.min(data.page * data.pageSize, data.total)} of {data.total}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft className="size-4" /> Previous</Button>
            <Button variant="outline" size="sm" disabled={page * data.pageSize >= data.total} onClick={() => setPage(page + 1)}>Next <ChevronRight className="size-4" /></Button>
          </div>
        </div>
      )}

      <RenameDialog team={renaming} onOpenChange={(open) => !open && setRenaming(null)} />
      <CreateTeamDialog open={creating} onOpenChange={setCreating} />
    </>
  );
}
