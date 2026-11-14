"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Check, Info, Send, TriangleAlert, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { FormField } from "@/components/shared/form-field";
import { StatusBadge } from "@/components/shared/status-badge";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { usePackages } from "@/features/services/hooks/use-catalogue";
import { applyApiError } from "@/lib/form-errors";
import { formatDate, formatINR, humanize } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useChangeStage, useSaveAssessment } from "../hooks/use-onboarding";
import { assessmentFormSchema, type AssessmentFormOutput, type AssessmentFormValues } from "../schemas/onboarding.schema";
import { COMPLEXITIES, STAGE_LABELS, STAGE_TRANSITIONS, type OnboardingCase, type OnboardingStage } from "../types/onboarding.types";

const PIPELINE: OnboardingStage[] = ["registered", "assessment", "proposal_sent", "accepted"];

const toValues = (c: OnboardingCase): AssessmentFormValues => ({
  monthly_transaction_volume: c.monthly_transaction_volume?.toString() ?? "",
  complexity: c.complexity ?? "",
  suggested_package_id: c.suggested_package_id?.toString() ?? "",
  suggested_monthly_fee: c.suggested_monthly_fee?.toString() ?? "",
  notes: c.notes ?? "",
  proposal_message: c.proposal_message ?? "",
});

const ACTION_LABEL: Partial<Record<OnboardingStage, string>> = {
  assessment: "Start assessment",
  proposal_sent: "Send proposal to client",
  accepted: "Mark accepted",
  rejected: "Reject",
};

function StageTrack({ stage }: { stage: OnboardingStage }) {
  const current = PIPELINE.indexOf(stage);
  return (
    <ol className="flex items-center gap-1" aria-label="Onboarding progress">
      {PIPELINE.map((s, i) => {
        const done = stage !== "rejected" && i < current;
        const active = s === stage;
        return (
          <li key={s} className="flex flex-1 flex-col gap-1.5">
            <span className={cn("h-1.5 rounded-full", done || active ? "bg-primary" : "bg-muted", active && "bg-primary/70")} />
            <span className={cn("text-[11px]", active ? "text-foreground font-medium" : "text-muted-foreground")}>{STAGE_LABELS[s]}</span>
          </li>
        );
      })}
    </ol>
  );
}

interface Props {
  row: OnboardingCase | null;
  onOpenChange: (open: boolean) => void;
  onChanged: (row: OnboardingCase) => void;
}

export function OnboardingCaseSheet({ row, onOpenChange, onChanged }: Props) {
  return (
    <Sheet open={!!row} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-lg">{row && <CaseBody key={row.id} row={row} onChanged={onChanged} />}</SheetContent>
    </Sheet>
  );
}

function CaseBody({ row, onChanged }: { row: OnboardingCase; onChanged: (row: OnboardingCase) => void }) {
  const packages = usePackages();
  const save = useSaveAssessment(row.id);
  const stage = useChangeStage(row.id);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const locked = row.stage === "accepted";

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    setValue,
    getValues,
    formState: { errors, isDirty },
  } = useForm<AssessmentFormValues, unknown, AssessmentFormOutput>({ resolver: zodResolver(assessmentFormSchema), defaultValues: toValues(row) });

  useEffect(() => reset(toValues(row)), [row, reset]);

  const onSave = handleSubmit(async (values) => {
    try {
      onChanged(await save.mutateAsync(values));
      toast.success("Assessment saved");
    } catch (err) {
      applyApiError(err, setError, Object.keys(values));
    }
  });

  async function move(to: OnboardingStage) {
    if (isDirty) {
      toast.error("Save the assessment first");
      return;
    }
    try {
      const updated = await stage.mutateAsync({ to, reason: to === "rejected" ? reason : undefined });
      onChanged(updated);
      setRejecting(false);
      setReason("");
      toast.success(
        to === "accepted"
          ? "Accepted. A draft engagement is ready."
          : to === "proposal_sent"
            ? updated.owner_logins > 0 ? "Proposal sent. The owner has been emailed and can accept it in their portal." : "Proposal marked as sent. The company has no portal login, so nobody was emailed."
            : `Moved to ${STAGE_LABELS[to].toLowerCase()}`,
      );
    } catch (err) {
      applyApiError(err);
    }
  }

  const nextStages = STAGE_TRANSITIONS[row.stage];
  const activePackages = packages.data?.filter((p) => p.is_active || p.id === row.suggested_package_id) ?? [];

  return (
    <>
      <SheetHeader className="border-b p-5 pr-12">
        <div className="flex items-center gap-2">
          <SheetTitle className="truncate text-lg">{row.client_name}</SheetTitle>
          <StatusBadge status={row.stage} label={STAGE_LABELS[row.stage]} />
        </div>
        <SheetDescription>
          {row.legal_name !== row.client_name ? `${row.legal_name} · ` : ""}Added {formatDate(row.created_at)}
        </SheetDescription>
        <div className="pt-3">
          <StageTrack stage={row.stage} />
        </div>
      </SheetHeader>

      <div className="space-y-6 p-5">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <div>
            <dt className="text-muted-foreground text-xs">GSTIN</dt>
            <dd className="font-mono text-xs">{row.gstin ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">State</dt>
            <dd>{row.state ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Client status</dt>
            <dd><StatusBadge status={row.client_status} /></dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Assessed by</dt>
            <dd>{row.assessed_by_name ?? "—"}</dd>
          </div>
        </dl>

        {row.engagement_id && (
          <Link
            href={`/admin/engagements?open=${row.engagement_id}`}
            className="bg-accent/60 hover:bg-accent flex items-center justify-between rounded-lg border px-4 py-3 text-sm transition-colors"
          >
            <span>
              Engagement #{row.engagement_id} · <span className="font-medium">{humanize(row.engagement_status ?? "")}</span>
            </span>
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        )}

        <Separator />

        <section aria-labelledby="assessment-heading">
          <div className="mb-3">
            <h3 id="assessment-heading" className="font-medium">Assessment</h3>
            <p className="text-muted-foreground text-xs">
              {locked ? "Locked after acceptance. Change the engagement instead." : "Needed before a proposal can go out."}
            </p>
          </div>
          <form id="assessment-form" onSubmit={onSave} className="grid gap-4 sm:grid-cols-2" noValidate>
            <fieldset disabled={locked} className="contents">
              <FormField id="monthly_transaction_volume" label="Transactions per month" error={errors.monthly_transaction_volume?.message}>
                <Input id="monthly_transaction_volume" inputMode="numeric" aria-invalid={!!errors.monthly_transaction_volume} {...register("monthly_transaction_volume")} />
              </FormField>
              <FormField id="complexity" label="Complexity" error={errors.complexity?.message}>
                <Controller
                  control={control}
                  name="complexity"
                  render={({ field }) => (
                    <Select value={field.value || undefined} onValueChange={field.onChange} disabled={locked}>
                      <SelectTrigger id="complexity" className="w-full"><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {COMPLEXITIES.map((c) => <SelectItem key={c} value={c}>{humanize(c)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
              <FormField id="suggested_package_id" label="Suggested package" error={errors.suggested_package_id?.message} className="sm:col-span-2">
                <Controller
                  control={control}
                  name="suggested_package_id"
                  render={({ field }) => (
                    <Select
                      value={field.value || undefined}
                      disabled={locked}
                      onValueChange={(v) => {
                        field.onChange(v);
                        // Start the fee at the package's list price; the admin can still adjust it.
                        const pkg = packages.data?.find((p) => String(p.id) === v);
                        if (pkg && !getValues("suggested_monthly_fee")) setValue("suggested_monthly_fee", String(pkg.monthly_fee), { shouldDirty: true });
                      }}
                    >
                      <SelectTrigger id="suggested_package_id" className="w-full">
                        <SelectValue placeholder={packages.isLoading ? "Loading packages…" : "Select a package"} />
                      </SelectTrigger>
                      <SelectContent>
                        {activePackages.map((p) => (
                          <SelectItem key={p.id} value={String(p.id)}>
                            {p.name} · {formatINR(p.monthly_fee)}/mo
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
              <FormField id="suggested_monthly_fee" label="Proposed monthly fee (₹)" error={errors.suggested_monthly_fee?.message} hint="Before GST." className="sm:col-span-2">
                <Input id="suggested_monthly_fee" inputMode="decimal" aria-invalid={!!errors.suggested_monthly_fee} {...register("suggested_monthly_fee")} />
              </FormField>
              <FormField id="proposal_message" label="Message to the client" hint="Shown with the proposal in their portal and email." error={errors.proposal_message?.message} className="sm:col-span-2">
                <Textarea id="proposal_message" rows={3} placeholder="Thanks for walking us through your business. With two branches and GST plus payroll, Growth Compliance covers everything you need." {...register("proposal_message")} />
              </FormField>
              <FormField id="notes" label="Internal notes" hint="Only Accountanz staff see these." error={errors.notes?.message} className="sm:col-span-2">
                <Textarea id="notes" rows={3} {...register("notes")} />
              </FormField>
            </fieldset>
          </form>
          {!locked && (
            <div className="mt-4 flex justify-end">
              <SubmitButton form="assessment-form" size="sm" variant={isDirty ? "default" : "outline"} pending={save.isPending}>
                Save assessment
              </SubmitButton>
            </div>
          )}
        </section>

        {row.stage === "accepted" && row.accepted_at && (
          <p className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            <Check className="mt-0.5 size-4 shrink-0" aria-hidden />
            {row.accepted_via === "client"
              ? `${row.accepted_by_name ?? "The client"} accepted the proposal in the client portal on ${formatDate(row.accepted_at, true)}.`
              : `Marked accepted by ${row.accepted_by_name ?? "staff"} on ${formatDate(row.accepted_at, true)}.`}
          </p>
        )}

        {nextStages.length > 0 && (
          <>
            <Separator />
            <section aria-labelledby="stage-heading" className="space-y-3">
              <h3 id="stage-heading" className="font-medium">Next step</h3>
              {row.stage === "proposal_sent" && (
                <p className="flex items-start gap-2 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
                  <Send className="mt-0.5 size-4 shrink-0" aria-hidden />
                  {row.owner_logins > 0
                    ? `Sent${row.proposal_sent_at ? ` ${formatDate(row.proposal_sent_at, true)}` : ""}. Waiting for the client to accept it in their portal. If they agree by phone or in a meeting, mark it accepted.`
                    : `Marked sent${row.proposal_sent_at ? ` ${formatDate(row.proposal_sent_at, true)}` : ""}. This company has no portal login, so they can't see it online: invite the owner from Clients, or mark it accepted once they agree.`}
                </p>
              )}
              {row.stage === "assessment" && row.owner_logins === 0 && (
                <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                  No portal login for this company yet. The proposal can be sent, but they won&apos;t see it online until you invite the owner from Clients.
                </p>
              )}
              {rejecting ? (
                <div className="space-y-3 rounded-lg border p-4">
                  <FormField id="reject-reason" label="Reason (optional)" hint="Recorded in the audit log.">
                    <Input id="reject-reason" autoFocus value={reason} maxLength={500} onChange={(e) => setReason(e.target.value)} />
                  </FormField>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setRejecting(false)}>Cancel</Button>
                    <Button variant="destructive" size="sm" disabled={stage.isPending} onClick={() => void move("rejected")}>Reject prospect</Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {nextStages
                    .filter((s) => s !== "rejected")
                    .map((s) => {
                      const backwards = row.stage === "rejected" || PIPELINE.indexOf(s) < PIPELINE.indexOf(row.stage);
                      return (
                        <Button key={s} size="sm" variant={backwards ? "outline" : "default"} disabled={stage.isPending} onClick={() => void move(s)}>
                          {s === "accepted" && <Check className="size-4" />}
                          {s === "proposal_sent" && <Send className="size-4" />}
                          {backwards ? (row.stage === "rejected" ? "Reopen" : "Back to assessment") : s === "accepted" ? "Mark accepted (agreed offline)" : ACTION_LABEL[s]}
                        </Button>
                      );
                    })}
                  {nextStages.includes("rejected") && (
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setRejecting(true)}>
                      <X className="size-4" /> Reject
                    </Button>
                  )}
                </div>
              )}
              {row.stage === "proposal_sent" && (
                <p className="text-muted-foreground flex items-start gap-1.5 text-xs"><Info className="mt-px size-3.5 shrink-0" aria-hidden />Accepting (by the client or here) moves the client to onboarding and opens a draft engagement. &ldquo;Back to assessment&rdquo; withdraws the proposal from their portal.</p>
              )}
              {row.stage === "assessment" && (
                <p className="text-muted-foreground flex items-start gap-1.5 text-xs"><Info className="mt-px size-3.5 shrink-0" aria-hidden />Sending emails the owner and shows the package, fee and your message in their portal, where they can accept it.</p>
              )}
            </section>
          </>
        )}
      </div>
    </>
  );
}
