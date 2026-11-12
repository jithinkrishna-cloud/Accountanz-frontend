"use client";

import { Check, Circle, Download, FileText, Pencil, Upload } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/shared/status-badge";
import { ErrorState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { applyApiError } from "@/lib/form-errors";
import { formatDate, formatINR, humanize } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useChangeEngagementStatus, useEngagement, useUploadAgreement } from "../hooks/use-engagements";
import { agreementUrl } from "../services/engagement-service";
import { ENGAGEMENT_TRANSITIONS, type Engagement, type EngagementStatus } from "../types/engagement.types";
import { EngagementFormDialog } from "./engagement-form-dialog";

const CYCLE_MONTHS = { monthly: 1, quarterly: 3, yearly: 12 } as const;
const MAX_MB = 10;

const FORWARD_LABEL: Partial<Record<EngagementStatus, string>> = {
  sent: "Mark sent",
  accepted: "Mark accepted",
  active: "Activate",
};

interface Props {
  id: number | null;
  onOpenChange: (open: boolean) => void;
}

export function EngagementSheet({ id, onOpenChange }: Props) {
  const query = useEngagement(id);
  return (
    <Sheet open={id != null} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-lg">
        {query.data ? (
          <Body key={query.data.id} row={query.data} />
        ) : query.error ? (
          <>
            <SheetTitle className="sr-only">Engagement</SheetTitle>
            <ErrorState error={query.error} onRetry={() => void query.refetch()} className="mt-16" />
          </>
        ) : (
          <div className="space-y-3 p-5">
            <SheetTitle className="sr-only">Loading engagement</SheetTitle>
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="mt-6 h-24 w-full" />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}

function CheckItem({ done, children }: { done: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-sm">
      {done ? <Check className="text-primary mt-0.5 size-4 shrink-0" aria-label="Done" /> : <Circle className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-label="To do" />}
      <span className={cn(!done && "text-muted-foreground")}>{children}</span>
    </li>
  );
}

function Body({ row }: { row: Engagement }) {
  const status = useChangeEngagementStatus(row.id);
  const upload = useUploadAgreement(row.id);
  const fileInput = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);

  const next = ENGAGEMENT_TRANSITIONS[row.status];
  const hasAgreement = !!row.agreement_file_name;
  const invoiceAmount = row.monthly_fee * CYCLE_MONTHS[row.billing_cycle];

  async function move(to: EngagementStatus) {
    try {
      const { invoice } = await status.mutateAsync(to);
      setConfirmEnd(false);
      if (invoice) toast.success(`Activated. Invoice ${invoice.invoice_number} issued for ${formatINR(invoice.total, true)}.`);
      else toast.success(to === "ended" ? "Engagement ended" : `Marked ${humanize(to).toLowerCase()}`);
    } catch (err) {
      applyApiError(err);
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_MB * 1024 * 1024) {
      toast.error(`The agreement must be ${MAX_MB} MB or smaller`);
      return;
    }
    try {
      await upload.mutateAsync(file);
      toast.success("Agreement uploaded");
    } catch (err) {
      applyApiError(err);
    }
  }

  return (
    <>
      <SheetHeader className="border-b p-5 pr-12">
        <div className="flex items-center gap-2">
          <SheetTitle className="truncate text-lg">{row.client_name}</SheetTitle>
          <StatusBadge status={row.status} />
        </div>
        <SheetDescription>
          Engagement #{row.id} · {row.package_name}
        </SheetDescription>
      </SheetHeader>

      <div className="space-y-6 p-5">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-medium">Terms</h3>
            {row.status !== "ended" && (
              <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
                <Pencil className="size-3.5" /> Edit
              </Button>
            )}
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <Detail label="Package">{row.package_name}</Detail>
            <Detail label="Fee">
              <span className="tabular-nums">{formatINR(row.monthly_fee)}</span>
              <span className="text-muted-foreground">/mo, billed {row.billing_cycle}</span>
            </Detail>
            <Detail label="Start date">{formatDate(row.start_date)}</Detail>
            <Detail label="Renewal date">{formatDate(row.renewal_date)}</Detail>
            {row.end_date && <Detail label="End date">{formatDate(row.end_date)}</Detail>}
            <Detail label="Client">
              <Link href={`/admin/clients/${row.client_id}`} className="hover:underline">{row.client_name}</Link>{" "}
              <StatusBadge status={row.client_status} className="ml-1" />
            </Detail>
            <Detail label="Invoices">
              {row.invoice_count > 0 ? (
                <span>
                  {row.invoice_count} · first <span className="font-mono text-xs">{row.first_invoice_number}</span>
                </span>
              ) : (
                "None yet"
              )}
            </Detail>
          </dl>
        </section>

        <Separator />

        <section aria-labelledby="agreement-heading">
          <h3 id="agreement-heading" className="mb-3 font-medium">Signed agreement</h3>
          {hasAgreement ? (
            <div className="flex items-center gap-3 rounded-lg border px-4 py-3">
              <FileText className="text-muted-foreground size-5 shrink-0" aria-hidden />
              <p className="min-w-0 flex-1 truncate text-sm">{row.agreement_file_name}</p>
              <Button variant="outline" size="sm" asChild>
                <a href={agreementUrl(row.id)} download>
                  <Download className="size-3.5" /> Download
                </a>
              </Button>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No agreement uploaded yet. It&apos;s required before activation.</p>
          )}
          {row.status !== "ended" && (
            <>
              <input ref={fileInput} type="file" accept=".pdf,.png,.jpg,.jpeg" className="sr-only" onChange={(e) => void onFile(e)} aria-label="Agreement file" tabIndex={-1} />
              <Button variant="outline" size="sm" className="mt-3" disabled={upload.isPending} onClick={() => fileInput.current?.click()}>
                <Upload className="size-3.5" /> {upload.isPending ? "Uploading…" : hasAgreement ? "Replace file" : "Upload agreement"}
              </Button>
              <p className="text-muted-foreground mt-1.5 text-xs">PDF, PNG or JPG, up to {MAX_MB} MB.</p>
            </>
          )}
        </section>

        {row.status === "accepted" && (
          <div className="bg-accent/50 rounded-lg border p-4">
            <p className="mb-2 text-sm font-medium">Before activating</p>
            <ul className="space-y-1.5">
              <CheckItem done={hasAgreement}>Signed agreement uploaded</CheckItem>
              <CheckItem done={row.invoice_count > 0}>
                {row.invoice_count > 0
                  ? "First invoice already issued"
                  : `First invoice is issued on activation: ${formatINR(invoiceAmount)} + GST`}
              </CheckItem>
            </ul>
          </div>
        )}

        {next.length > 0 && (
          <>
            <Separator />
            <section aria-labelledby="status-heading" className="space-y-3">
              <h3 id="status-heading" className="font-medium">Next step</h3>
              {confirmEnd ? (
                <div className="space-y-3 rounded-lg border p-4">
                  <p className="text-sm">
                    End this engagement? {row.status === "active" ? "Work and billing for this client stop from today." : "It can't be reopened."}
                  </p>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setConfirmEnd(false)}>Cancel</Button>
                    <Button variant="destructive" size="sm" disabled={status.isPending} onClick={() => void move("ended")}>End engagement</Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {next
                    .filter((s) => s !== "ended")
                    .map((s) =>
                      s === "draft" ? (
                        <Button key={s} size="sm" variant="outline" disabled={status.isPending} onClick={() => void move(s)}>Back to draft</Button>
                      ) : (
                        <Button key={s} size="sm" disabled={status.isPending || (s === "active" && !hasAgreement)} onClick={() => void move(s)}>
                          {FORWARD_LABEL[s]}
                        </Button>
                      ),
                    )}
                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setConfirmEnd(true)}>
                    End
                  </Button>
                </div>
              )}
            </section>
          </>
        )}
      </div>

      <EngagementFormDialog open={editing} onOpenChange={setEditing} engagement={row} />
    </>
  );
}
