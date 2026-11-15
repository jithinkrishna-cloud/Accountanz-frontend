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
import { cn } from "@/lib/utils";
import { formatDate, formatINR, formatPeriod, humanize } from "@/lib/format";
import { usePortalBilling, usePortalBusiness, usePortalSettings, useUpdateClient, useUpdateSettings } from "../hooks/use-client-portal";
import type { NotificationPrefs, PortalBilling, PortalCompany, PortalSettings } from "../types/client-portal.types";
import { CompanyGate } from "./company-gate";
import { Card } from "./portal-ui";
import { JournlConnection } from "./journl-connection";

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

function ProfileForm({ settings, onSave }: { settings: PortalSettings; onSave: () => void }) {
  const updateClient = useUpdateClient();
  const q = usePortalBusiness();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<{
    legal_name: string; trade_name: string; gstin: string; pan: string; state: string; address: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const business = q.data;
  const save = async () => {
    if (!draft) return;
    try {
      await updateClient.mutateAsync({
        legal_name: draft.legal_name.trim() || undefined,
        trade_name: draft.trade_name.trim() || null,
        gstin: draft.gstin.trim() || null,
        pan: draft.pan.trim() || null,
        state: draft.state.trim() || null,
        address: draft.address.trim() || null,
      });
      toast.success("Business details saved");
      setEditing(false);
      setDraft(null);
      void q.refetch();
      onSave();
    } catch (err) {
      applyApiError(err);
    }
  };
  const startEdit = () => {
    if (!business) return;
    setDraft({
      legal_name: business.legal_name ?? "",
      trade_name: business.trade_name ?? "",
      gstin: business.gstin ?? "",
      pan: business.pan ?? "",
      state: business.state ?? "",
      address: business.address ?? "",
    });
    setEditing(true);
    setError(null);
  };
  if (q.error) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  if (q.isLoading || !business) return <Skeleton className="h-64 w-full rounded-xl" />;
  const baseDraft = {
    legal_name: business.legal_name ?? "",
    trade_name: business.trade_name ?? "",
    gstin: business.gstin ?? "",
    pan: business.pan ?? "",
    state: business.state ?? "",
    address: business.address ?? "",
  };
  return (
    <div className="space-y-6">
      <Card title="Your profile" subtitle={`${settings.email} · ${settings.company} · ${settings.role === "owner" ? "Owner" : settings.can_approve ? "Member (can approve)" : "Member"}`}>
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <FormField id="full_name" label="Name"><Input id="full_name" defaultValue={settings.full_name} readOnly /></FormField>
          <FormField id="email" label="Email"><Input id="email" defaultValue={settings.email} type="email" readOnly /></FormField>
          <FormField id="phone" label="Phone"><Input id="phone" type="tel" defaultValue={settings.phone ?? ""} readOnly /></FormField>
        </div>
      </Card>
      <Card title="Business details" subtitle="Your company details as registered with Accountanz.">
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <FormField id="legal_name" label="Legal name" error={error ?? undefined}>
            <Input
              id="legal_name"
              defaultValue={baseDraft.legal_name}
              onChange={(e) => { setDraft({ ...baseDraft, legal_name: e.target.value }); setError(null); }}
              readOnly={!editing}
            />
          </FormField>
          <FormField id="trade_name" label="Trade name">
            <Input
              id="trade_name"
              defaultValue={baseDraft.trade_name}
              onChange={(e) => setDraft({ ...baseDraft, trade_name: e.target.value })}
              readOnly={!editing}
            />
          </FormField>
          <FormField id="gstin" label="GSTIN">
            <Input
              id="gstin"
              defaultValue={baseDraft.gstin}
              onChange={(e) => setDraft({ ...baseDraft, gstin: e.target.value })}
              readOnly={!editing}
            />
          </FormField>
          <FormField id="pan" label="PAN">
            <Input
              id="pan"
              defaultValue={baseDraft.pan}
              onChange={(e) => setDraft({ ...baseDraft, pan: e.target.value })}
              readOnly={!editing}
            />
          </FormField>
          <FormField id="state" label="State">
            <Input
              id="state"
              defaultValue={baseDraft.state}
              onChange={(e) => setDraft({ ...baseDraft, state: e.target.value })}
              readOnly={!editing}
            />
          </FormField>
          <FormField id="address" label="Address">
            <Input
              id="address"
              defaultValue={baseDraft.address}
              onChange={(e) => setDraft({ ...baseDraft, address: e.target.value })}
              readOnly={!editing}
            />
          </FormField>
          <FormField id="software" label="Accounting software"><Input id="software" defaultValue={business.accounting_software} readOnly /></FormField>
        </div>
        <div className="px-5 pt-4 pb-5 border-t border-muted flex justify-end gap-2">
          {editing ? (
            <>
              <Button type="button" variant="outline" size="sm" onClick={() => { setEditing(false); setDraft(null); }}>Cancel</Button>
              <SubmitButton type="button" pending={updateClient.isPending} onClick={() => void save()}>Save changes</SubmitButton>
            </>
          ) : (
            <Button type="button" size="sm" onClick={startEdit}>Edit details</Button>
          )}
        </div>
      </Card>
    </div>
  );
}

function NotificationsForm({ settings }: { settings: PortalSettings }) {
  const update = useUpdateSettings();
  const [prefs, setPrefs] = useState<NotificationPrefs>(settings.notification_prefs);
  const save = async () => {
    try {
      await update.mutateAsync({ notification_prefs: prefs });
      toast.success("Notification preferences saved");
    } catch (err) {
      applyApiError(err);
    }
  };
  return (
    <div className="space-y-6">
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

function JournlAccessTab({ company }: { company: PortalCompany }) {
  return (
    <Card title="Accounting Software" subtitle="Where your books live.">
      <JournlConnection company={company} />
    </Card>
  );
}

function SettingsBody({ company }: { company: PortalCompany }) {
  const { data, isLoading, error, refetch } = usePortalSettings();
  const [tab, setTab] = useState<"profile" | "journl" | "notifications">("profile");
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;
  if (isLoading || !data) return <Skeleton className="h-64 w-full rounded-xl" />;
  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b border-muted">
        <button
          onClick={() => setTab("profile")}
          className={cn("-mb-px border-b-2 px-3 py-2 text-sm font-medium", tab === "profile" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-muted-foreground")}
        >
          Profile
        </button>
        <button
          onClick={() => setTab("journl")}
          className={cn("-mb-px border-b-2 px-3 py-2 text-sm font-medium", tab === "journl" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-muted-foreground")}
        >
          JournL Access
        </button>
        <button
          onClick={() => setTab("notifications")}
          className={cn("-mb-px border-b-2 px-3 py-2 text-sm font-medium", tab === "notifications" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-muted-foreground")}
        >
          Notifications
        </button>
      </div>
      {tab === "profile" && <ProfileForm settings={data} onSave={() => void refetch()} />}
      {tab === "journl" && <JournlAccessTab company={company} />}
      {tab === "notifications" && <NotificationsForm settings={data} />}
    </div>
  );
}

export function ClientSettings() {
  return (
    <CompanyGate>
      {(company) => (
        <>
          <PageHeader title="Settings" description="Your profile, JournL access and notification preferences." />
          <SettingsBody company={company} />
        </>
      )}
    </CompanyGate>
  );
}

