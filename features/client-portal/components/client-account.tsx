"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CreditCard, MessageSquare } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { DataTable, type Column } from "@/components/shared/data-table";
import { FormField } from "@/components/shared/form-field";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ACCOUNTING_SOFTWARE_LABELS, INDIAN_STATES } from "@/lib/constants";
import { Switch } from "@/components/ui/switch";
import { applyApiError } from "@/lib/form-errors";
import { cn } from "@/lib/utils";
import { formatDate, formatINR, formatPeriod, humanize } from "@/lib/format";
import { usePortalBilling, usePortalBusiness, usePortalSettings, useUpdateClient, useUpdateSettings } from "../hooks/use-client-portal";
import type { NotificationPrefs, PortalBilling, PortalBusiness, PortalCompany, PortalSettings } from "../types/client-portal.types";
import { BizpoleConnection } from "./bizpole-connection";
import { CompanyGate } from "./company-gate";
import { Card } from "./portal-ui";
import { JOURNL_INTEGRATION } from "@/lib/features";

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

// Mirrors backend portalClientUpdateSchema (owners only).
const businessSchema = z.object({
  trade_name: z.string().trim().max(200),
  state: z.string(),
  address: z.string().trim().max(500),
});
type BusinessValues = z.infer<typeof businessSchema>;

/** Legal name, GSTIN and PAN are read-only; the owner may change trade name, state and address. */
function BusinessDetailsCard({ business, isOwner, onSave }: { business: PortalBusiness; isOwner: boolean; onSave: () => void }) {
  const updateClient = useUpdateClient();
  const [editing, setEditing] = useState(false);
  const toValues = (b: PortalBusiness): BusinessValues => ({ trade_name: b.trade_name ?? "", state: b.state ?? "", address: b.address ?? "" });
  const { register, control, handleSubmit, reset, setError, formState: { errors } } = useForm<BusinessValues>({
    resolver: zodResolver(businessSchema),
    defaultValues: toValues(business),
  });

  const cancel = () => {
    reset(toValues(business));
    setEditing(false);
  };
  const save = handleSubmit(async (v) => {
    try {
      const updated = await updateClient.mutateAsync({ trade_name: v.trade_name || null, state: v.state || null, address: v.address || null });
      reset(toValues(updated));
      toast.success("Business details saved");
      setEditing(false);
      onSave();
    } catch (err) {
      applyApiError(err, setError, ["trade_name", "state", "address"]);
    }
  });

  return (
    <Card
      title="Business details"
      subtitle={isOwner ? "You can update the trade name, state and address. Your accounting team manages the rest." : "Only the company owner can change these."}
      actions={
        <Button asChild variant="outline" size="sm">
          <Link href={`/app/messages?subject=${encodeURIComponent("Correction: Company details")}`}><MessageSquare className="size-4" /> Request correction</Link>
        </Button>
      }
    >
      <form id="business-form" onSubmit={save} noValidate>
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <FormField id="legal_name" label="Legal name" hint="Managed by your accounting team.">
            <Input id="legal_name" value={business.legal_name} readOnly disabled />
          </FormField>
          <FormField id="trade_name" label="Trade name" error={errors.trade_name?.message}>
            <Input id="trade_name" readOnly={!editing} aria-invalid={!!errors.trade_name} {...register("trade_name")} />
          </FormField>
          <FormField id="gstin" label="GSTIN" hint="Managed by your accounting team.">
            <Input id="gstin" className="font-mono" value={business.gstin ?? ""} placeholder="—" readOnly disabled />
          </FormField>
          <FormField id="pan" label="PAN" hint="Managed by your accounting team.">
            <Input id="pan" className="font-mono" value={business.pan ?? ""} placeholder="—" readOnly disabled />
          </FormField>
          <FormField id="state" label="State" error={errors.state?.message}>
            <Controller control={control} name="state" render={({ field }) => (
              <Select value={field.value || ""} onValueChange={field.onChange} disabled={!editing}>
                <SelectTrigger id="state" className="w-full"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>{INDIAN_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            )} />
          </FormField>
          <FormField id="address" label="Address" error={errors.address?.message}>
            <Input id="address" readOnly={!editing} aria-invalid={!!errors.address} {...register("address")} />
          </FormField>
          <FormField id="software" label="Accounting software">
            <Input id="software" value={ACCOUNTING_SOFTWARE_LABELS[business.accounting_software] ?? business.accounting_software} readOnly disabled />
          </FormField>
        </div>
      </form>
      {isOwner && (
        <div className="flex justify-end gap-2 border-t px-5 pt-4 pb-5">
          {editing ? (
            <>
              <Button type="button" variant="outline" size="sm" onClick={cancel}>Cancel</Button>
              <SubmitButton form="business-form" size="sm" pending={updateClient.isPending}>Save changes</SubmitButton>
            </>
          ) : (
            <Button type="button" size="sm" onClick={() => setEditing(true)}>Edit details</Button>
          )}
        </div>
      )}
    </Card>
  );
}

function ProfileForm({ settings, onSave }: { settings: PortalSettings; onSave: () => void }) {
  const q = usePortalBusiness();
  if (q.error) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />;
  if (q.isLoading || !q.data) return <Skeleton className="h-64 w-full rounded-xl" />;
  return (
    <div className="space-y-6">
      <Card title="Your profile" subtitle={`${settings.email} · ${settings.company} · ${settings.role === "owner" ? "Owner" : settings.can_approve ? "Member (can approve)" : "Member"}`}>
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <FormField id="full_name" label="Name"><Input id="full_name" defaultValue={settings.full_name} readOnly /></FormField>
          <FormField id="email" label="Email"><Input id="email" defaultValue={settings.email} type="email" readOnly /></FormField>
          <FormField id="phone" label="Phone"><Input id="phone" type="tel" defaultValue={settings.phone ?? ""} readOnly /></FormField>
        </div>
      </Card>
      <BusinessDetailsCard business={q.data} isOwner={settings.role === "owner"} onSave={onSave} />
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

type SettingsTab = "profile" | "integrations" | "notifications";
// Integrations holds only the JournL connection, so it's hidden while the JournL integration is off.
const SETTINGS_TABS: SettingsTab[] = JOURNL_INTEGRATION ? ["profile", "integrations", "notifications"] : ["profile", "notifications"];

function SettingsBody({ company }: { company: PortalCompany }) {
  const { data, isLoading, error, refetch } = usePortalSettings();
  const params = useSearchParams();
  const requested = params.get("tab") as SettingsTab | null;
  const [tab, setTab] = useState<SettingsTab>(requested && SETTINGS_TABS.includes(requested) ? requested : "profile");
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
        {JOURNL_INTEGRATION && (
        <button
          onClick={() => setTab("integrations")}
          className={cn("-mb-px border-b-2 px-3 py-2 text-sm font-medium", tab === "integrations" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-muted-foreground")}
        >
          Integrations
        </button>
        )}
        <button
          onClick={() => setTab("notifications")}
          className={cn("-mb-px border-b-2 px-3 py-2 text-sm font-medium", tab === "notifications" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-muted-foreground")}
        >
          Notifications
        </button>
      </div>
      {tab === "profile" && <ProfileForm settings={data} onSave={() => void refetch()} />}
      {JOURNL_INTEGRATION && tab === "integrations" && <BizpoleConnection company={company} />}
      {tab === "notifications" && <NotificationsForm settings={data} />}
    </div>
  );
}

export function ClientSettings() {
  return (
    <CompanyGate>
      {(company) => (
        <>
          <PageHeader title="Settings" description={JOURNL_INTEGRATION ? "Your profile, integrations and notification preferences." : "Your profile and notification preferences."} />
          <SettingsBody company={company} />
        </>
      )}
    </CompanyGate>
  );
}

