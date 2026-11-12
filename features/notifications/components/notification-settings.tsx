"use client";

import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState } from "@/components/shared/states";
import { SubmitButton } from "@/components/shared/submit-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useSession } from "@/features/auth/hooks/use-session";
import { useSettings, useUpdateSettings } from "@/features/settings/hooks/use-settings";
import { applyApiError } from "@/lib/form-errors";

type ReminderKey = "remind_document_due" | "remind_task_overdue" | "remind_invoice_overdue";

const REMINDERS: { key: ReminderKey; title: string; description: string }[] = [
  { key: "remind_document_due", title: "Document request due tomorrow", description: "Remind the client the day before a document request falls due." },
  { key: "remind_task_overdue", title: "Task overdue", description: "Notify the assignee and reviewer when a task passes its due date." },
  { key: "remind_invoice_overdue", title: "Invoice overdue", description: "Remind the client and the ops team when a service invoice is unpaid." },
];

/** Workspace-wide reminder switches, stored on the settings record. */
export function NotificationSettings() {
  const { data: user } = useSession();
  const canEdit = user?.role === "super_admin";
  const settings = useSettings();
  const update = useUpdateSettings();
  // Unsaved switch changes layered over the stored settings.
  const [overrides, setOverrides] = useState<Partial<Record<ReminderKey, boolean>>>({});
  const s = settings.data;
  const values: Record<ReminderKey, boolean> | null = s
    ? {
        remind_document_due: overrides.remind_document_due ?? s.remind_document_due,
        remind_task_overdue: overrides.remind_task_overdue ?? s.remind_task_overdue,
        remind_invoice_overdue: overrides.remind_invoice_overdue ?? s.remind_invoice_overdue,
      }
    : null;
  const dirty = !!values && !!s && REMINDERS.some((r) => values[r.key] !== s[r.key]);

  const save = async () => {
    if (!values) return;
    try {
      await update.mutateAsync(values);
      setOverrides({});
      toast.success("Reminder settings saved");
    } catch (err) {
      applyApiError(err);
    }
  };

  const header = (
    <PageHeader
      title="Notifications"
      description="Email reminders sent automatically by the platform."
      actions={canEdit && <SubmitButton type="button" pending={update.isPending} disabled={!dirty} onClick={save}>Save settings</SubmitButton>}
    />
  );
  if (settings.error) return <>{header}<ErrorState error={settings.error} onRetry={() => void settings.refetch()} /></>;

  return (
    <>
      {header}
      {!canEdit && <Alert className="mb-4"><AlertDescription>Only a super admin can change workspace reminders.</AlertDescription></Alert>}
      <section className="bg-card rounded-xl border shadow-xs">
        <header className="border-b px-5 py-4">
          <h2 className="font-medium">Email reminders</h2>
          <p className="text-muted-foreground text-xs">These apply to every client in the workspace.</p>
        </header>
        {!values ? (
          <div className="space-y-3 p-5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : (
          <ul className="divide-y">
            {REMINDERS.map((r) => (
              <li key={r.key} className="flex items-center justify-between gap-4 px-5 py-4">
                <div>
                  <label htmlFor={r.key} className="text-sm font-medium">{r.title}</label>
                  <p className="text-muted-foreground text-sm">{r.description}</p>
                </div>
                <Switch id={r.key} checked={values[r.key]} disabled={!canEdit} onCheckedChange={(c) => setOverrides((o) => ({ ...o, [r.key]: c }))} />
              </li>
            ))}
          </ul>
        )}
        <p className="text-muted-foreground border-t px-5 py-3 text-xs">
          Reminders go out once a day in the morning. Turning one off stops it for the whole workspace.
        </p>
      </section>
    </>
  );
}
