"use client";

import { CreditCard } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { DataTable, type Column } from "@/components/shared/data-table";
import { FormField } from "@/components/shared/form-field";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { applyApiError } from "@/lib/form-errors";
import { formatDate, formatINR, formatPeriod, humanize } from "@/lib/format";
import { usePortalBilling, usePortalSettings, useUpdateSettings } from "../hooks/use-client-portal";
import type { NotificationPrefs, PortalBilling, PortalSettings } from "../types/client-portal.types";
import { CompanyGate } from "./company-gate";
import { Card } from "./portal-ui";

// ───────────── Service & Billing ─────────────

type Invoice = PortalBilling["invoices"][number];
type Payment = PortalBilling["payments"][number];

const invoiceColumns: Column<Invoice>[] = [
  { key: "no", header: "Invoice", cell: (i) => <span className="font-mono text-xs font-medium">{i.invoice_number}</span> },
  { key: "period", header: "Period", cell: (i) => formatPeriod(i.period) },
  { key: "total", header: "Total", className: "text-right", cell: (i) => <span className="tabular-nums">{formatINR(i.total, true)}</span> },
  { key: "due", header: "Due", hideOnMobile: true, cell: (i) => formatDate(i.due_date) },
  { key: "status", header: "Status", cell: (i) => <StatusBadge status={i.status} /> },
];
const paymentColumns: Column<Payment>[] = [
  { key: "no", header: "Invoice", cell: (p) => <span className="font-mono text-xs">{p.invoice_number}</span> },
  { key: "amount", header: "Amount", className: "text-right", cell: (p) => <span className="tabular-nums">{formatINR(p.amount, true)}</span> },
  { key: "date", header: "Paid on", cell: (p) => formatDate(p.paid_date) },
  { key: "method", header: "Method", hideOnMobile: true, cell: (p) => humanize(p.method) },
  { key: "ref", header: "Reference", hideOnMobile: true, cell: (p) => <span className="text-muted-foreground">{p.reference ?? "—"}</span> },
];

/** No payment gateway is configured yet, so "Pay now" explains how to pay instead of taking card details. */
function PayNowDialog({ amount, onClose }: { amount: number; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pay {formatINR(amount, true)}</DialogTitle>
          <DialogDescription>Online payment isn&apos;t available yet.</DialogDescription>
        </DialogHeader>
        <p className="text-sm">Please pay by bank transfer or UPI using the details on your invoice, and quote the invoice number as the reference. Your Accountanz team records the payment and the invoice is marked paid.</p>
        <DialogFooter><Button onClick={onClose}>OK</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BillingBody() {
  const { data, isLoading, error, refetch } = usePortalBilling();
  const [paying, setPaying] = useState(false);
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;
  if (isLoading || !data) return <Skeleton className="h-64 w-full rounded-xl" />;
  return (
    <>
      <PageHeader title="Service & Billing" description="Your package, invoices and payments in one place." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Your package">
          {data.package ? (
            <div className="p-5">
              <p className="text-lg font-semibold">{data.package.package_name}</p>
              <p className="text-muted-foreground text-sm">{formatINR(data.package.monthly_fee)} · {data.package.billing_cycle}</p>
              {data.package.scope_notes && (
                <>
                  <p className="text-muted-foreground mt-4 text-xs font-semibold tracking-[0.12em] uppercase">What&apos;s included</p>
                  <p className="mt-1 text-sm">{data.package.scope_notes}</p>
                </>
              )}
              {data.package.renewal_date && <p className="text-muted-foreground mt-3 text-xs">Renews {formatDate(data.package.renewal_date)}</p>}
            </div>
          ) : (
            <p className="text-muted-foreground p-5 text-sm">No active package yet. Your Accountanz team will set it up once your agreement is signed.</p>
          )}
        </Card>
        <Card title="Outstanding" actions={data.outstanding > 0 && <Button size="sm" onClick={() => setPaying(true)}><CreditCard className="size-4" /> Pay now</Button>}>
          <div className="p-5">
            <p className="text-2xl font-semibold tabular-nums">{formatINR(data.outstanding, true)}</p>
            <p className="text-muted-foreground text-sm">{data.outstanding > 0 ? "Due on your open invoices." : "Nothing due right now — thank you."}</p>
          </div>
        </Card>
      </div>
      <div className="mt-6 space-y-6">
        <Card title="Invoices"><DataTable columns={invoiceColumns} rows={data.invoices} rowKey={(i) => i.id} empty={{ title: "No invoices yet" }} /></Card>
        <Card title="Payment history"><DataTable columns={paymentColumns} rows={data.payments} rowKey={(p) => p.id} empty={{ title: "No payments recorded yet" }} /></Card>
      </div>
      {paying && <PayNowDialog amount={data.outstanding} onClose={() => setPaying(false)} />}
    </>
  );
}

export function ClientBilling() {
  return <CompanyGate>{() => <BillingBody />}</CompanyGate>;
}

// ───────────── Settings ─────────────

const PREFS: { key: keyof NotificationPrefs; label: string; description: string }[] = [
  { key: "document_requests", label: "Document requests", description: "When your team asks you for a document, and a day before it's due." },
  { key: "approvals", label: "Approvals", description: "When your team needs your sign-off." },
  { key: "reports", label: "Reports", description: "When a new report is published for you." },
  { key: "monthly_summary", label: "Monthly summary", description: "A short summary after each month closes." },
];

function SettingsForm({ settings }: { settings: PortalSettings }) {
  const update = useUpdateSettings();
  const [name, setName] = useState(settings.full_name);
  const [phone, setPhone] = useState(settings.phone ?? "");
  const [prefs, setPrefs] = useState<NotificationPrefs>(settings.notification_prefs);
  const [error, setError] = useState<string | null>(null);
  const save = async () => {
    if (name.trim().length < 2) return setError("Enter your name");
    try {
      await update.mutateAsync({ full_name: name.trim(), phone: phone.trim() || null, notification_prefs: prefs });
      toast.success("Settings saved");
    } catch (err) {
      applyApiError(err);
    }
  };
  return (
    <div className="space-y-6">
      <Card title="Your profile" subtitle={`${settings.email} · ${settings.company} · ${settings.role === "owner" ? "Owner" : settings.can_approve ? "Member (can approve)" : "Member"}`}>
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <FormField id="full_name" label="Name" error={error ?? undefined}><Input id="full_name" value={name} onChange={(e) => { setName(e.target.value); setError(null); }} /></FormField>
          <FormField id="phone" label="Phone"><Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></FormField>
        </div>
      </Card>
      <Card title="Email notifications" subtitle="Choose what we email you about.">
        <ul className="divide-y">
          {PREFS.map((p) => (
            <li key={p.key} className="flex items-center justify-between gap-4 px-5 py-4">
              <div>
                <label htmlFor={p.key} className="text-sm font-medium">{p.label}</label>
                <p className="text-muted-foreground text-sm">{p.description}</p>
              </div>
              <Switch id={p.key} checked={prefs[p.key]} onCheckedChange={(c) => setPrefs({ ...prefs, [p.key]: c })} />
            </li>
          ))}
        </ul>
      </Card>
      <div className="flex justify-end"><SubmitButton type="button" pending={update.isPending} onClick={() => void save()}>Save settings</SubmitButton></div>
    </div>
  );
}

function SettingsBody() {
  const { data, isLoading, error, refetch } = usePortalSettings();
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;
  if (isLoading || !data) return <Skeleton className="h-64 w-full rounded-xl" />;
  return <SettingsForm settings={data} />;
}

export function ClientSettings() {
  return (
    <CompanyGate>
      {() => (
        <>
          <PageHeader title="Settings" description="Your profile and notification preferences." />
          <SettingsBody />
        </>
      )}
    </CompanyGate>
  );
}
