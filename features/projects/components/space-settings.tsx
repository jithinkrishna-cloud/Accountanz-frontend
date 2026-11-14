"use client";

import { ArrowDown, ArrowUp, Plus, Trash2, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { FormField } from "@/components/shared/form-field";
import { PageHeader } from "@/components/shared/page-header";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { applyApiError } from "@/lib/form-errors";
import { useClientOptions, useCreateStatus, useDeleteSpace, useDeleteStatus, useReorderStatuses, useUpdateSpace, useUpdateStatus } from "../hooks/use-projects";
import { CATEGORY_LABELS, type Status, type StatusCategory } from "../types/project.types";
import { useSpaceCtx } from "./space-layout";

const CATEGORIES: StatusCategory[] = ["todo", "in_progress", "done"];

function Details() {
  const { space } = useSpaceCtx();
  const clients = useClientOptions();
  const update = useUpdateSpace(space.space_key);
  const [name, setName] = useState(space.name);
  const [clientId, setClientId] = useState(space.client_id ? String(space.client_id) : "none");
  const [description, setDescription] = useState(space.description ?? "");
  return (
    <section className="bg-card grid gap-4 rounded-xl border p-5 shadow-xs">
      <h2 className="font-semibold">Details</h2>
      <FormField id="space-name" label="Name *">
        <Input id="space-name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
      </FormField>
      <FormField id="space-key" label="Key" hint="The key is fixed after creation.">
        <Input id="space-key" value={space.space_key} disabled className="max-w-40 font-mono" />
      </FormField>
      <FormField id="space-client" label="Client" hint="New work items take this client by default.">
        <Select value={clientId} onValueChange={setClientId}>
          <SelectTrigger id="space-client" className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No client</SelectItem>
            {clients.data?.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </FormField>
      <FormField id="space-description" label="Description">
        <Textarea id="space-description" rows={3} maxLength={1000} value={description} onChange={(e) => setDescription(e.target.value)} />
      </FormField>
      <div>
        <SubmitButton
          pending={update.isPending}
          disabled={name.trim().length < 2}
          onClick={() =>
            void update
              .mutateAsync({ name: name.trim(), client_id: clientId === "none" ? null : Number(clientId), description: description.trim() || null })
              .then(() => toast.success("Space updated"))
              .catch((e) => applyApiError(e))
          }
        >
          Save details
        </SubmitButton>
      </div>
    </section>
  );
}

function DeleteStatusDialog({ status, onClose }: { status: Status | null; onClose: () => void }) {
  const { space } = useSpaceCtx();
  const del = useDeleteStatus(space.space_key);
  const others = space.statuses.filter((s) => s.id !== status?.id);
  const [target, setTarget] = useState<string>("");
  return (
    <Dialog open={!!status} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        {status && (
          <>
            <DialogHeader>
              <DialogTitle>Delete “{status.name}”?</DialogTitle>
              <DialogDescription>{status.item_count} work item{status.item_count === 1 ? "" : "s"} will move to the status you pick.</DialogDescription>
            </DialogHeader>
            <FormField id="move-status" label="Move its work items to *">
              <Select value={target} onValueChange={setTarget}>
                <SelectTrigger id="move-status" className="w-full"><SelectValue placeholder="Pick a status" /></SelectTrigger>
                <SelectContent>{others.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </FormField>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <SubmitButton
                variant="destructive"
                disabled={!target}
                pending={del.isPending}
                onClick={() => void del.mutateAsync({ id: status.id, moveTo: Number(target) }).then(() => (toast.success("Status deleted"), setTarget(""), onClose())).catch((e) => applyApiError(e))}
              >
                Delete status
              </SubmitButton>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Statuses() {
  const { space } = useSpaceCtx();
  const create = useCreateStatus(space.space_key);
  const update = useUpdateStatus(space.space_key);
  const reorder = useReorderStatuses(space.space_key);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<StatusCategory>("in_progress");
  const [deleting, setDeleting] = useState<Status | null>(null);
  const list = space.statuses;
  const swap = (i: number, j: number) => {
    const ids = list.map((s) => s.id);
    [ids[i], ids[j]] = [ids[j], ids[i]];
    void reorder.mutateAsync(ids).catch((e) => applyApiError(e));
  };
  return (
    <section className="bg-card grid gap-4 rounded-xl border p-5 shadow-xs">
      <div>
        <h2 className="font-semibold">Statuses</h2>
        <p className="text-muted-foreground text-sm">Board columns, left to right. The type decides what counts as done in Summary and sprints.</p>
      </div>
      <ul className="divide-y rounded-lg border">
        {list.map((s, i) => (
          <li key={s.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
            <Input
              defaultValue={s.name}
              maxLength={40}
              aria-label={`Name of ${s.name}`}
              className="h-8 max-w-56"
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v && v !== s.name) void update.mutateAsync({ id: s.id, name: v }).catch((err) => (applyApiError(err), (e.target.value = s.name)));
              }}
            />
            <Select value={s.category} onValueChange={(v) => void update.mutateAsync({ id: s.id, category: v as StatusCategory }).catch((e) => applyApiError(e))}>
              <SelectTrigger size="sm" className="w-36" aria-label={`Type of ${s.name}`}><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>)}</SelectContent>
            </Select>
            <span className="text-muted-foreground text-xs">{s.item_count} item{s.item_count === 1 ? "" : "s"}</span>
            <span className="ml-auto flex gap-1">
              <Button size="icon" variant="ghost" className="size-8" disabled={i === 0} onClick={() => swap(i, i - 1)} aria-label={`Move ${s.name} left`}><ArrowUp className="size-4" /></Button>
              <Button size="icon" variant="ghost" className="size-8" disabled={i === list.length - 1} onClick={() => swap(i, i + 1)} aria-label={`Move ${s.name} right`}><ArrowDown className="size-4" /></Button>
              <Button size="icon" variant="ghost" className="size-8" disabled={list.length <= 1} onClick={() => setDeleting(s)} aria-label={`Delete ${s.name}`}><Trash2 className="size-4" /></Button>
            </span>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-end gap-2">
        <FormField id="new-status" label="New status">
          <Input id="new-status" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder="e.g. On hold" className="w-56" />
        </FormField>
        <Select value={category} onValueChange={(v) => setCategory(v as StatusCategory)}>
          <SelectTrigger className="w-36" aria-label="Type of new status"><SelectValue /></SelectTrigger>
          <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>)}</SelectContent>
        </Select>
        <SubmitButton variant="outline" pending={create.isPending} disabled={!name.trim()} onClick={() => void create.mutateAsync({ name: name.trim(), category }).then(() => setName("")).catch((e) => applyApiError(e))}>
          <Plus className="size-4" /> Add status
        </SubmitButton>
      </div>
      <DeleteStatusDialog status={deleting} onClose={() => setDeleting(null)} />
    </section>
  );
}

/** Permanently deleting the space. The Administrator has to type the space key, as the server also checks. */
function DeleteSpace() {
  const { space } = useSpaceCtx();
  const router = useRouter();
  const remove = useDeleteSpace(space.space_key);
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const matches = typed.trim().toUpperCase() === space.space_key;
  const close = () => {
    setOpen(false);
    setTyped("");
  };
  const confirm = async () => {
    try {
      await remove.mutateAsync(typed.trim());
      toast.success(`${space.name} was deleted`);
      router.replace("/projects");
    } catch (err) {
      applyApiError(err);
    }
  };
  return (
    <section className="bg-card grid gap-3 rounded-xl border border-red-200 p-5 shadow-xs dark:border-red-900" aria-labelledby="delete-space-heading">
      <div>
        <h2 id="delete-space-heading" className="font-semibold text-red-700 dark:text-red-400">Delete space</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Permanently deletes this space and everything in it: all work items, subtasks, sprints, comments, history and attachment files. This can&apos;t be undone.
        </p>
      </div>
      <div>
        <Button variant="destructive" onClick={() => setOpen(true)}><Trash2 className="size-4" /> Delete space</Button>
      </div>
      <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : close())}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><TriangleAlert className="size-5 text-red-600" aria-hidden /> Delete {space.name}?</DialogTitle>
            <DialogDescription>
              All work items, sprints, comments, history and attachment files in this space are deleted for everyone. This can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <form
            id="delete-space-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (matches) void confirm();
            }}
          >
            <FormField id="confirm-key" label={`Type ${space.space_key} to confirm`}>
              <Input id="confirm-key" autoComplete="off" autoFocus value={typed} onChange={(e) => setTyped(e.target.value)} className="font-mono uppercase" />
            </FormField>
          </form>
          <DialogFooter>
            <Button variant="outline" onClick={close}>Cancel</Button>
            <SubmitButton form="delete-space-form" variant="destructive" disabled={!matches} pending={remove.isPending}>Delete space</SubmitButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

/** Space settings for Administrators: details, statuses and deleting the space. */
export function SpaceSettings() {
  const { isAdmin } = useSpaceCtx();
  if (!isAdmin) return <p className="text-muted-foreground text-sm">Only space Administrators can change settings.</p>;
  return (
    <>
      <PageHeader title="Space settings" description="Name, client link and board statuses." />
      <div className="grid max-w-3xl gap-5">
        <Details />
        <Statuses />
        <DeleteSpace />
      </div>
    </>
  );
}
