"use client";

import { Check, UserPlus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { FormField } from "@/components/shared/form-field";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSession } from "@/features/auth/hooks/use-session";
import { ROLE_LABELS } from "@/lib/constants";
import { applyApiError } from "@/lib/form-errors";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PortalRole } from "@/types/auth";
import { useAddMembers, useChangeRole, useRemoveMember, useStaffSearch } from "../hooks/use-projects";
import { SPACE_ROLE_LABELS, type SpaceRole, type StaffOption } from "../types/project.types";
import { UserAvatar } from "./project-ui";
import { useSpaceCtx } from "./space-layout";

function AddPeopleDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { space } = useSpaceCtx();
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<StaffOption[]>([]);
  const [role, setRole] = useState<SpaceRole>("member");
  const search = useStaffSearch(space.space_key, q.trim(), open);
  const add = useAddMembers(space.space_key);
  const close = () => (setQ(""), setPicked([]), setRole("member"), onClose());
  const toggle = (s: StaffOption) => setPicked((p) => (p.some((x) => x.id === s.id) ? p.filter((x) => x.id !== s.id) : [...p, s]));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add people to {space.name}</DialogTitle>
          <DialogDescription>Only Accountanz staff can be added. Clients never see the Workspace.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <FormField id="people-search" label="Names or emails *">
            <Input id="people-search" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or email" />
          </FormField>
          {picked.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {picked.map((p) => (
                <span key={p.id} className="bg-muted flex items-center gap-1.5 rounded-full py-0.5 pr-1 pl-1 text-sm">
                  <UserAvatar name={p.full_name} size="xs" /> {p.full_name}
                  <button type="button" onClick={() => toggle(p)} aria-label={`Remove ${p.full_name}`} className="hover:bg-background rounded-full p-0.5"><X className="size-3" /></button>
                </span>
              ))}
            </div>
          )}
          <ul className="max-h-56 divide-y overflow-y-auto rounded-lg border">
            {search.data?.map((s) => {
              const on = picked.some((p) => p.id === s.id);
              return (
                <li key={s.id}>
                  <button type="button" disabled={!!s.in_space} onClick={() => toggle(s)} className={cn("hover:bg-muted/60 flex w-full items-center gap-3 px-3 py-2 text-left text-sm disabled:opacity-50", on && "bg-primary/5")}>
                    <UserAvatar name={s.full_name} size="md" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{s.full_name}</span>
                      <span className="text-muted-foreground block truncate text-xs">{s.email} · {ROLE_LABELS[s.portal_role as PortalRole] ?? s.portal_role}</span>
                    </span>
                    {s.in_space ? <span className="text-muted-foreground text-xs">Already in space</span> : on && <Check className="text-primary size-4" />}
                  </button>
                </li>
              );
            })}
            {search.data?.length === 0 && <li className="text-muted-foreground px-3 py-4 text-center text-sm">No staff found.</li>}
          </ul>
          <FormField id="people-role" label="Role *" hint="Administrators manage the space, its people and sprints. Members work on items.">
            <Select value={role} onValueChange={(v) => setRole(v as SpaceRole)}>
              <SelectTrigger id="people-role" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="admin">Administrator</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={close}>Cancel</Button>
          <SubmitButton
            pending={add.isPending}
            disabled={picked.length === 0}
            onClick={() =>
              void add
                .mutateAsync({ ids: picked.map((p) => p.id), role })
                .then(() => (toast.success(`${picked.length} ${picked.length === 1 ? "person" : "people"} added`), close()))
                .catch((e) => applyApiError(e))
            }
          >
            Add
          </SubmitButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Space settings → Access: who is in the space and their role. Administrators manage it. */
export function AccessSettings() {
  const { space, members, isAdmin } = useSpaceCtx();
  const { data: me } = useSession();
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const changeRole = useChangeRole(space.space_key);
  const remove = useRemoveMember(space.space_key);
  const rows = members.filter((m) => !q || `${m.full_name} ${m.email}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <PageHeader
        title="Access"
        description={isAdmin ? "Add Accountanz staff to this space and choose their role." : "People in this space. Ask an Administrator to add someone."}
        actions={isAdmin && <Button onClick={() => setAdding(true)}><UserPlus className="size-4" /> Add people</Button>}
      />
      <div className="bg-card rounded-xl border shadow-xs">
        <div className="border-b p-4">
          <SearchInput value={q} onChange={setQ} placeholder="Search people" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b">
              <tr className="text-muted-foreground text-left text-xs">
                <th className="px-4 py-2 font-semibold">Name</th>
                <th className="hidden px-4 py-2 font-semibold md:table-cell">Email</th>
                <th className="hidden px-4 py-2 font-semibold md:table-cell">Added</th>
                <th className="px-4 py-2 font-semibold">Role</th>
                {isAdmin && <th className="px-4 py-2" />}
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => (
                <tr key={m.user_id} className="border-b last:border-b-0">
                  <td className="px-4 py-2.5">
                    <span className="flex items-center gap-3">
                      <UserAvatar name={m.full_name} size="md" />
                      <span>
                        <span className="block font-medium">{m.full_name}{m.user_id === me?.id && <span className="text-muted-foreground font-normal"> (you)</span>}</span>
                        <span className="text-muted-foreground block text-xs">{ROLE_LABELS[m.portal_role as PortalRole] ?? m.portal_role}</span>
                      </span>
                    </span>
                  </td>
                  <td className="hidden px-4 py-2.5 md:table-cell">{m.email}</td>
                  <td className="text-muted-foreground hidden px-4 py-2.5 md:table-cell">{formatDate(m.added_at)}</td>
                  <td className="px-4 py-2.5">
                    {isAdmin ? (
                      <Select value={m.role} onValueChange={(v) => void changeRole.mutateAsync({ userId: m.user_id, role: v as SpaceRole }).catch((e) => applyApiError(e))}>
                        <SelectTrigger size="sm" className="w-40" aria-label={`Role of ${m.full_name}`}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Administrator</SelectItem>
                          <SelectItem value="member">Member</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      SPACE_ROLE_LABELS[m.role]
                    )}
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-2.5 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          if (!window.confirm(`Remove ${m.full_name} from ${space.name}? Their work items stay assigned to them.`)) return;
                          void remove.mutateAsync(m.user_id).then(() => toast.success(`${m.full_name} removed`)).catch((e) => applyApiError(e));
                        }}
                      >
                        Remove
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={5} className="text-muted-foreground px-4 py-8 text-center">No people match.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <AddPeopleDialog open={adding} onClose={() => setAdding(false)} />
    </>
  );
}
