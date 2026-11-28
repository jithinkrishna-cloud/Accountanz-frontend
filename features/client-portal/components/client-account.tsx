"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlert, CircleCheck, CreditCard, Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { DataTable, type Column } from "@/components/shared/data-table";
import { FormField } from "@/components/shared/form-field";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { SubmitButton } from "@/components/shared/submit-button";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ACCOUNTING_SOFTWARE_LABELS, INDIAN_STATES } from "@/lib/constants";
import { Switch } from "@/components/ui/switch";
import { applyApiError } from "@/lib/form-errors";
import { cn } from "@/lib/utils";
import { formatDate, formatINR, formatPeriod, humanize } from "@/lib/format";
import { usePayInvoice, usePortalBilling, usePortalBusiness, usePortalSettings, useUpdateClient, useUpdateSettings } from "../hooks/use-client-portal";
import type { NotificationPrefs, PortalBilling, PortalBusiness, PortalSettings } from "../types/client-portal.types";
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
  { key: "method", header: "Method", hideOnMobile: true, cell: (p) => (p.method === "easebuzz" ? "Online" : humanize(p.method)) },
  { key: "ref", header: "Reference", hideOnMobile: true, cell: (p) => <span className="text-muted-foreground">{p.reference ?? "—"}</span> },
];

const isOpen = (i: Invoice) => (i.status === "issued" || i.status === "overdue") && i.total - i.paid > 0.004;

/** "Pay now" sends the browser to Easebuzz for the invoice's remaining balance. */
function PayInvoiceButton({ invoice, size = "sm" }: { invoice: Invoice; size?: "sm" | "default" }) {
  const pay = usePayInvoice();
  const start = async () => {
    try {
      const { url } = await pay.mutateAsync(invoice.id);
      window.location.assign(url);
    } catch (err) {
      applyApiError(err);
    }
  };
  // Stays busy after success too: the page is about to navigate away.
  const busy = pay.isPending || pay.isSuccess;
  return (
    <Button size={size} variant="outline" disabled={busy} onClick={() => void start()}>
      {busy ? <Loader2 className="size-4 animate-spin" /> : <CreditCard className="size-4" />} Pay {formatINR(invoice.total - invoice.paid, true)}
    </Button>
  );
}

const PAYMENT_RESULT: Record<string, { title: string; text: string; bad?: boolean }> = {
  success: { title: "Payment received", text: "Thank you. The payment has been recorded against your invoice." },
  pending: { title: "Payment is being confirmed", text: "Your bank hasn't confirmed the payment yet. Check back here in a few minutes, and please don't pay again in the meantime." },
  failed: { title: "Payment didn't go through", text: "No money was taken, or it will be refunded by your bank. You can try again.", bad: true },
  invalid: { title: "We couldn't confirm that payment", text: "If money left your account, message your Accountanz team with the transaction reference and we'll sort it out.", bad: true },
};

/** Shown after Easebuzz sends the payer back (?payment=…); dismissing it clears the query string. */
function PaymentResultBanner({ onShown }: { onShown: () => void }) {
  const params = useSearchParams();
  const router = useRouter();
  const result = PAYMENT_RESULT[params.get("payment") ?? ""];
  useEffect(() => {
    if (result) onShown();
  }, [result, onShown]);
  if (!result) return null;
  return (
    <Alert variant={result.bad ? "destructive" : "default"} className="mb-6">
      {result.bad ? <CircleAlert /> : <CircleCheck />}
      <AlertTitle>{result.title}</AlertTitle>
      <AlertDescription>{result.text}</AlertDescription>
      <AlertAction>
        <Button variant="ghost" size="sm" onClick={() => router.replace("/app/billing")}>Dismiss</Button>
      </AlertAction>
    </Alert>
  );
}

function BillingBody() {
  const { data, isLoading, error, refetch } = usePortalBilling();
  const refresh = useCallback(() => void refetch(), [refetch]);
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;
  if (isLoading || !data) return <Skeleton className="h-64 w-full rounded-xl" />;
  const open = data.invoices.filter(isOpen);
  const columns: Column<Invoice>[] = [
    ...invoiceColumns,
    { key: "pay", header: "", className: "text-right", cell: (i) => (isOpen(i) ? <PayInvoiceButton invoice={i} /> : null) },
  ];
  return (
    <>
      <PageHeader title="Service & Billing" description="Your package, invoices and payments in one place." />
      <PaymentResultBanner onShown={refresh} />
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
        <Card title="Outstanding" actions={open.length === 1 && <PayInvoiceButton invoice={open[0]} />}>
          <div className="p-5">
            <p className="text-2xl font-semibold tabular-nums">{formatINR(data.outstanding, true)}</p>
            <p className="text-muted-foreground text-sm">
              {open.length === 0 ? "Nothing due right now — thank you." : open.length === 1 ? "Due on your open invoice. Pay online by card, UPI or net banking." : `Due on ${open.length} open invoices. Pay each one online from the list below.`}
            </p>
          </div>
        </Card>
      </div>
      <div className="mt-6 space-y-6">
        <Card title="Invoices"><DataTable columns={columns} rows={data.invoices} rowKey={(i) => i.id} empty={{ title: "No invoices yet" }} /></Card>
        <Card title="Payment history"><DataTable columns={paymentColumns} rows={data.payments} rowKey={(p) => p.id} empty={{ title: "No payments recorded yet" }} /></Card>
      </div>
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

// Mirrors backend portalClientUpdateSchema (owners only): everything on the client record except status.
const GSTIN_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const PAN_RE = /^[A-Z]{5}\d{4}[A-Z]$/;
const upper = (re: RegExp, message: string) =>
  z.string().trim().transform((v) => v.toUpperCase()).refine((v) => v === "" || re.test(v), message);
const businessSchema = z.object({
  legal_name: z.string().trim().min(2, "Enter the legal name").max(200),
  trade_name: z.string().trim().max(200),
  business_type: z.string(),
  date_of_establishment: z.string(),
  gstin: upper(GSTIN_RE, "Enter a valid 15-character GSTIN"),
  pan: upper(PAN_RE, "Enter a valid 10-character PAN"),
  state: z.string(),
  address: z.string().trim().max(500),
  accounting_software: z.enum(["journl", "none"]),
  primary_contact_name: z.string().trim().max(150),
  primary_contact_email: z.union([z.literal(""), z.string().trim().email("Enter a valid email address").max(255)]),
  primary_contact_phone: z.string().trim().max(30),
});
type BusinessValues = z.input<typeof businessSchema>;
const BUSINESS_FIELDS = Object.keys(businessSchema.shape) as (keyof BusinessValues)[];
const BUSINESS_TYPES = ["private_limited", "public_limited", "llp", "partnership", "proprietorship", "opc"] as const;
const BUSINESS_TYPE_LABEL: Record<(typeof BUSINESS_TYPES)[number], string> = {
  private_limited: "Private limited", public_limited: "Public limited", llp: "LLP", partnership: "Partnership", proprietorship: "Proprietorship", opc: "One person company",
};

/** The owner keeps the company's details up to date themselves; changes apply straight away and are logged. */
function BusinessDetailsCard({ business, isOwner, onSave }: { business: PortalBusiness; isOwner: boolean; onSave: () => void }) {
  const updateClient = useUpdateClient();
  const [editing, setEditing] = useState(false);
  const toValues = (b: PortalBusiness): BusinessValues => ({
    legal_name: b.legal_name ?? "",
    trade_name: b.trade_name ?? "",
    business_type: b.business_type ?? "",
    date_of_establishment: b.date_of_establishment?.slice(0, 10) ?? "",
    gstin: b.gstin ?? "",
    pan: b.pan ?? "",
    state: b.state ?? "",
    address: b.address ?? "",
    accounting_software: b.accounting_software === "journl" ? "journl" : "none",
    primary_contact_name: b.primary_contact_name ?? "",
    primary_contact_email: b.primary_contact_email ?? "",
    primary_contact_phone: b.primary_contact_phone ?? "",
  });
  const { register, control, handleSubmit, reset, setError, formState: { errors } } = useForm<BusinessValues, unknown, z.output<typeof businessSchema>>({
    resolver: zodResolver(businessSchema),
    defaultValues: toValues(business),
  });

  const cancel = () => {
    reset(toValues(business));
    setEditing(false);
  };
  const save = handleSubmit(async (v) => {
    try {
      // Blank optional fields are sent as null (cleared); the legal name is required.
      const blankToNull = (s: string) => (s === "" ? null : s);
      const updated = await updateClient.mutateAsync({
        legal_name: v.legal_name,
        trade_name: blankToNull(v.trade_name),
        business_type: blankToNull(v.business_type),
        date_of_establishment: blankToNull(v.date_of_establishment),
        gstin: blankToNull(v.gstin),
        pan: blankToNull(v.pan),
        state: blankToNull(v.state),
        address: blankToNull(v.address),
        accounting_software: v.accounting_software,
        primary_contact_name: blankToNull(v.primary_contact_name),
        primary_contact_email: blankToNull(v.primary_contact_email),
        primary_contact_phone: blankToNull(v.primary_contact_phone),
      });
      reset(toValues(updated));
      toast.success("Business details saved");
      setEditing(false);
      onSave();
    } catch (err) {
      applyApiError(err, setError, BUSINESS_FIELDS);
    }
  });

  const locked = !editing;
  const text = (name: keyof BusinessValues, label: string, opts: { mono?: boolean; type?: string; placeholder?: string } = {}) => (
    <FormField id={name} label={label} error={errors[name]?.message}>
      <Input id={name} type={opts.type} readOnly={locked} placeholder={opts.placeholder ?? (locked ? "—" : undefined)} className={opts.mono ? "font-mono uppercase" : undefined} aria-invalid={!!errors[name]} {...register(name)} />
    </FormField>
  );
  const select = (name: "business_type" | "state" | "accounting_software", label: string, options: { value: string; label: string }[]) => (
    <FormField id={name} label={label} error={errors[name]?.message}>
      <Controller control={control} name={name} render={({ field }) => (
        <Select value={field.value || ""} onValueChange={field.onChange} disabled={locked}>
          <SelectTrigger id={name} className="w-full"><SelectValue placeholder="—" /></SelectTrigger>
          <SelectContent>{options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
        </Select>
      )} />
    </FormField>
  );

  return (
    <Card
      title="Business details"
      subtitle={isOwner ? "Keep your company's details up to date. Changes apply straight away and your accounting team sees them." : "Only the company owner can change these."}
    >
      <form id="business-form" onSubmit={save} noValidate>
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          {text("legal_name", "Legal name")}
          {text("trade_name", "Trade name")}
          {select("business_type", "Business type", BUSINESS_TYPES.map((t) => ({ value: t, label: BUSINESS_TYPE_LABEL[t] })))}
          {text("date_of_establishment", "Established on", { type: "date" })}
          {text("gstin", "GSTIN", { mono: true, placeholder: locked ? "—" : "15 characters" })}
          {text("pan", "PAN", { mono: true, placeholder: locked ? "—" : "10 characters" })}
          {select("state", "State", INDIAN_STATES.map((s) => ({ value: s, label: s })))}
          {text("address", "Address")}
          {select("accounting_software", "Accounting software", Object.entries(ACCOUNTING_SOFTWARE_LABELS).map(([value, label]) => ({ value, label })))}
        </div>
        <div className="border-t">
          <h3 className="px-5 pt-4 text-sm font-medium">Primary contact</h3>
          <div className="grid gap-4 p-5 sm:grid-cols-3">
            {text("primary_contact_name", "Name")}
            {text("primary_contact_email", "Email", { type: "email" })}
            {text("primary_contact_phone", "Phone", { type: "tel" })}
          </div>
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

type SettingsTab = "profile" | "notifications";
const SETTINGS_TABS: SettingsTab[] = ["profile", "notifications"];

function SettingsBody() {
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
        <button
          onClick={() => setTab("notifications")}
          className={cn("-mb-px border-b-2 px-3 py-2 text-sm font-medium", tab === "notifications" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-muted-foreground")}
        >
          Notifications
        </button>
      </div>
      {tab === "profile" && <ProfileForm settings={data} onSave={() => void refetch()} />}
      {tab === "notifications" && <NotificationsForm settings={data} />}
    </div>
  );
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

