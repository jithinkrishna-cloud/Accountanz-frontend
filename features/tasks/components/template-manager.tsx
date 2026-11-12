"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { applyApiError } from "@/lib/form-errors";
import { humanize } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useDeleteTemplateItem, useTaskTemplates } from "../hooks/use-task-templates";
import type { TaskTemplate, TaskTemplateItem } from "../types/task.types";
import { TemplateFormDialog } from "./template-form-dialog";
import { TemplateItemDialog } from "./template-item-dialog";

const describe = (t: TaskTemplate) => `${t.service_name} · ${humanize(t.recurrence)} · Day ${t.due_day_of_period}`;

function DeleteItemDialog({ item, onClose }: { item: TaskTemplateItem | null; onClose: () => void }) {
  const remove = useDeleteTemplateItem();
  if (!item) return null;
  const confirm = async () => {
    try {
      await remove.mutateAsync(item.id);
      toast.success("Item deleted");
      onClose();
    } catch (err) {
      applyApiError(err);
    }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete “{item.title}”?</DialogTitle>
          <DialogDescription>Future periods won&apos;t get this task. Tasks already generated from it are kept.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <SubmitButton type="button" variant="destructive" pending={remove.isPending} onClick={confirm}>Delete item</SubmitButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TemplateManager() {
  const { data: templates, isLoading, error, refetch } = useTaskTemplates();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [editingItem, setEditingItem] = useState<TaskTemplateItem | null | undefined>(undefined);
  const [deletingItem, setDeletingItem] = useState<TaskTemplateItem | null>(null);

  const selected = templates?.find((t) => t.id === selectedId) ?? templates?.[0];

  const header = (
    <PageHeader
      title="Task Templates"
      description="What gets generated for a period, and when it is due."
      actions={<Button onClick={() => setCreating(true)}><Plus className="size-4" /> New template</Button>}
    />
  );
  if (error) return <>{header}<ErrorState error={error} onRetry={() => void refetch()} /></>;

  return (
    <>
      {header}
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="bg-card min-w-0 self-start rounded-xl border shadow-xs">
          <h2 className="border-b px-5 py-4 font-medium">Templates</h2>
          {isLoading ? (
            <div className="space-y-2 p-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : !templates?.length ? (
            <EmptyState title="No templates yet" description="Create one per service you deliver every period." />
          ) : (
            <ul className="space-y-1 p-2" role="listbox" aria-label="Templates">
              {templates.map((t) => {
                const active = t.id === selected?.id;
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => setSelectedId(t.id)}
                      className={cn("w-full rounded-lg px-3 py-2.5 text-left transition-colors", active ? "bg-accent" : "hover:bg-muted")}
                    >
                      <p className={cn("text-sm font-medium", active && "text-accent-foreground")}>{t.name}</p>
                      <p className="text-muted-foreground text-xs">{describe(t)}</p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="bg-card min-w-0 rounded-xl border shadow-xs lg:col-span-2">
          <header className="flex items-center justify-between gap-3 border-b px-5 py-4">
            <div className="min-w-0">
              <h2 className="truncate font-medium">{selected ? `${selected.name} · items` : "Items"}</h2>
              <p className="text-muted-foreground text-xs">Each item becomes one task when the period is generated.</p>
            </div>
            {selected && <Button variant="outline" size="sm" onClick={() => setEditingItem(null)}><Plus className="size-4" /> Add item</Button>}
          </header>
          {isLoading ? (
            <div className="space-y-2 p-5">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : !selected ? (
            <EmptyState title="No template selected" description="Create a template to add its items." />
          ) : selected.items.length === 0 ? (
            <EmptyState title="No items yet" description="Add the tasks this template should create each period." />
          ) : (
            <ul className="divide-y">
              {selected.items.map((item) => (
                <li key={item.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.title}</p>
                    <p className="text-muted-foreground text-xs">
                      {item.checklist.length} checklist point(s) · {item.client_visible ? "visible to client" : "internal only"}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" aria-label={`Edit ${item.title}`} onClick={() => setEditingItem(item)}><Pencil className="size-4" /></Button>
                  <Button variant="ghost" size="icon" aria-label={`Delete ${item.title}`} onClick={() => setDeletingItem(item)}><Trash2 className="size-4" /></Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <TemplateFormDialog open={creating} onOpenChange={setCreating} onCreated={(t) => setSelectedId(t.id)} />
      {selected && <TemplateItemDialog templateId={selected.id} item={editingItem} onClose={() => setEditingItem(undefined)} />}
      <DeleteItemDialog item={deletingItem} onClose={() => setDeletingItem(null)} />
    </>
  );
}
