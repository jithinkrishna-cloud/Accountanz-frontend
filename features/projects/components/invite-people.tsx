"use client";

import { Check, UserPlus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { FormField } from "@/components/shared/form-field";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ROLE_LABELS } from "@/lib/constants";
import { applyApiError } from "@/lib/form-errors";
import { cn } from "@/lib/utils";
import type { PortalRole } from "@/types/auth";
import { useAddMembers, useStaffSearch } from "../hooks/use-projects";
import type { SpaceRole, StaffOption } from "../types/project.types";
import { UserAvatar } from "./project-ui";
import { useSpaceCtx } from "./space-layout";

export function AddPeopleDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
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

/** Round "+" button shown after the avatar filter: Administrators invite staff to the space from any view. */
export function InvitePeopleButton() {
  const { isAdmin } = useSpaceCtx();
  const [open, setOpen] = useState(false);
  if (!isAdmin) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Invite people"
        title="Invite people"
        className="text-muted-foreground hover:bg-muted hover:text-foreground flex size-8 shrink-0 items-center justify-center rounded-full border border-dashed transition-colors"
      >
        <UserPlus className="size-4" aria-hidden />
      </button>
      <AddPeopleDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
