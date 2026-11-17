"use client";

import { ArrowRightLeft, Check, CheckCircle2, Clock, Info, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState } from "@/components/shared/states";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { applyApiError } from "@/lib/form-errors";
import { formatDate, formatINR } from "@/lib/format";
import { useChoosePackage, usePortalPackages, usePortalProposal, useRequestPackageChange, useWithdrawPackageChange } from "../hooks/use-client-portal";
import type { PortalCompany, PortalPackage, PortalPackageChange, PortalPackages } from "../types/client-portal.types";
import { ProposalCard } from "./client-proposal";
import { TeamIncluded } from "./portal-ui";
import { CompanyGate } from "./company-gate";

const CYCLE: Record<PortalPackage["billing_cycle"], string> = { monthly: "Billed monthly", quarterly: "Billed quarterly", yearly: "Billed yearly" };

const STAGE: Record<NonNullable<PortalPackages["current"]>["status"], string> = {
  draft: "Your team is preparing your agreement. You can still switch package.",
  sent: "Your agreement has been sent to you. To move to another package, request a change below.",
  accepted: "You accepted the agreement. Your team will activate your service shortly.",
  active: "This is your active service. To move to another package, request a change below.",
};

/** The company's package change request: waiting for the team, or recently answered. */
function ChangeBanner({ change }: { change: PortalPackageChange }) {
  const withdraw = useWithdrawPackageChange();
  const onWithdraw = async () => {
    try {
      await withdraw.mutateAsync(change.id);
      toast.success("Request withdrawn");
    } catch (err) {
      applyApiError(err);
    }
  };
  if (change.status === "pending") {
    return (
      <div role="status" className="mb-6 flex flex-wrap items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
        <Clock className="mt-0.5 size-4 shrink-0" aria-hidden />
        <p className="min-w-0 flex-1">
          You asked to move from <span className="font-medium">{change.from_package_name}</span> to <span className="font-medium">{change.to_package_name}</span> on {formatDate(change.created_at)}. Your team will review it and confirm the new fee.
        </p>
        <Button variant="outline" size="sm" disabled={withdraw.isPending} onClick={() => void onWithdraw()}>Withdraw</Button>
      </div>
    );
  }
  const approved = change.status === "approved";
  return (
    <p role="status" className={`mb-6 flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${approved ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}>
      {approved ? <Check className="mt-0.5 size-4 shrink-0" aria-hidden /> : <X className="mt-0.5 size-4 shrink-0" aria-hidden />}
      <span>
        Your request to move to <span className="font-medium">{change.to_package_name}</span> was {approved ? "approved" : "declined"}
        {change.decided_at ? ` on ${formatDate(change.decided_at)}` : ""}.{change.decision_note ? ` “${change.decision_note}”` : ""}
      </span>
    </p>
  );
}

function RequestChangeDialog({ pkg, from, onClose }: { pkg: PortalPackage | null; from: string; onClose: () => void }) {
  const request = useRequestPackageChange();
  const [message, setMessage] = useState("");
  const confirm = async () => {
    if (!pkg) return;
    try {
      await request.mutateAsync({ package_id: pkg.id, message: message.trim() || null });
      toast.success(`Request sent. Your team will confirm the move to ${pkg.name}.`);
      setMessage("");
      onClose();
    } catch (err) {
      applyApiError(err);
    }
  };
  return (
    <Dialog open={!!pkg} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        {pkg && (
          <>
            <DialogHeader>
              <DialogTitle>Move from {from} to {pkg.name}?</DialogTitle>
              <DialogDescription>
                {pkg.name} lists at {formatINR(pkg.monthly_fee)} a month + GST. Your team reviews the request and confirms the fee. Nothing changes until they approve it, and the new package is billed from your next invoice.
              </DialogDescription>
            </DialogHeader>
            <label htmlFor="change-message" className="text-sm font-medium">Anything your team should know? <span className="text-muted-foreground font-normal">(optional)</span></label>
            <Textarea id="change-message" rows={3} maxLength={1000} value={message} placeholder="We're adding payroll for our new branch from next month." onChange={(e) => setMessage(e.target.value)} />
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <SubmitButton type="button" pending={request.isPending} onClick={confirm}>Send request</SubmitButton>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CurrentBanner({ current }: { current: NonNullable<PortalPackages["current"]> }) {
  return (
    <p role="status" className="bg-primary/5 border-primary/20 mb-6 flex items-start gap-2 rounded-xl border px-4 py-3 text-sm">
      <Info className="text-primary mt-0.5 size-4 shrink-0" aria-hidden />
      <span>
        <span className="font-medium">{current.package_name}</span> · {STAGE[current.status]}
      </span>
    </p>
  );
}

function PackageCard({ pkg, current, pending, isOwner, recommended, proposalOpen, onChoose, onRequest }: { pkg: PortalPackage; current: PortalPackages["current"]; pending: PortalPackageChange | null; isOwner: boolean; recommended: boolean; proposalOpen: boolean; onChoose: (p: PortalPackage) => void; onRequest: (p: PortalPackage) => void }) {
  const isCurrent = current?.package_id === pkg.id;
  // While a proposal is open, the client accepts it (above) rather than picking from the catalogue.
  const locked = proposalOpen || (!!current && current.status !== "draft");
  // Once the agreement has gone out, another package is requested and the team approves it.
  const canRequest = isOwner && !proposalOpen && !!current && current.status !== "draft" && !pending;
  const requested = pending?.to_package_id === pkg.id;
  return (
    <article className={`bg-card flex flex-col rounded-xl border p-5 shadow-xs ${isCurrent || recommended ? "border-primary ring-primary/20 ring-2" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-semibold">{pkg.name}</h2>
          {pkg.description && <p className="text-muted-foreground mt-0.5 text-sm">{pkg.description}</p>}
        </div>
        {isCurrent ? (
          <span className="text-primary flex shrink-0 items-center gap-1 text-xs font-medium">
            <CheckCircle2 className="size-4" aria-hidden /> Your package
          </span>
        ) : recommended ? (
          <span className="bg-primary/10 text-primary flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium">
            <Sparkles className="size-3.5" aria-hidden /> Recommended for you
          </span>
        ) : null}
      </div>

      <p className="mt-4">
        <span className="text-2xl font-semibold tabular-nums">{formatINR(pkg.monthly_fee)}</span>
        <span className="text-muted-foreground text-sm"> / month + GST</span>
      </p>
      <p className="text-muted-foreground text-xs">{CYCLE[pkg.billing_cycle]}</p>

      {pkg.services.length > 0 && (
        <ul className="mt-4 grid gap-1.5 text-sm">
          {pkg.services.map((s) => (
            <li key={s.id} className="flex gap-2">
              <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden /> {s.name}
            </li>
          ))}
        </ul>
      )}
      {pkg.scope_notes && <p className="text-muted-foreground mt-3 text-sm">{pkg.scope_notes}</p>}
      <TeamIncluded roles={pkg.team_roles} className="mt-4" />

      <div className="mt-auto pt-5">
        {isCurrent ? (
          <Button variant="outline" className="w-full" disabled>Selected</Button>
        ) : requested ? (
          <Button variant="outline" className="w-full" disabled><Clock className="size-4" /> Change requested</Button>
        ) : isOwner && !locked ? (
          <Button className="w-full" onClick={() => onChoose(pkg)}>{current ? "Switch to this package" : "Choose this package"}</Button>
        ) : canRequest ? (
          <Button variant="outline" className="w-full" onClick={() => onRequest(pkg)}><ArrowRightLeft className="size-4" /> Request this package</Button>
        ) : null}
      </div>
    </article>
  );
}

function ChooseDialog({ pkg, hasDraft, onClose }: { pkg: PortalPackage | null; hasDraft: boolean; onClose: () => void }) {
  const choose = useChoosePackage();
  const confirm = async () => {
    if (!pkg) return;
    try {
      await choose.mutateAsync(pkg.id);
      toast.success(`${pkg.name} chosen. Your Accountanz team will send your agreement.`);
      onClose();
    } catch (err) {
      applyApiError(err);
    }
  };
  return (
    <Dialog open={!!pkg} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        {pkg && (
          <>
            <DialogHeader>
              <DialogTitle>{hasDraft ? `Switch to ${pkg.name}?` : `Choose ${pkg.name}?`}</DialogTitle>
              <DialogDescription>
                {formatINR(pkg.monthly_fee)} a month + GST. Nothing is charged now: your Accountanz team sends you an agreement for this package, and your first invoice is issued when the service starts.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <SubmitButton type="button" pending={choose.isPending} onClick={confirm}>{hasDraft ? "Switch package" : "Choose package"}</SubmitButton>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PackagesBody({ company }: { company: PortalCompany }) {
  const { data, isLoading, error, refetch } = usePortalPackages();
  const proposal = usePortalProposal().data;
  const proposalOpen = proposal?.stage === "proposal_sent";
  const [choosing, setChoosing] = useState<PortalPackage | null>(null);
  const [requesting, setRequesting] = useState<PortalPackage | null>(null);
  const isOwner = company.role === "owner";
  const pending = data?.pending_change?.status === "pending" ? data.pending_change : null;

  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;
  if (isLoading || !data) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }
  return (
    <>
      <ProposalCard className="mb-6" />
      {data.current && !proposal && <CurrentBanner current={data.current} />}
      {data.pending_change && <ChangeBanner change={data.pending_change} />}
      {proposalOpen ? (
        <p className="text-muted-foreground mb-4 text-sm">All our packages are below for reference. To go with something else, message your team.</p>
      ) : (
        !isOwner && <p className="text-muted-foreground mb-4 text-sm">Only your company owner can choose a package.</p>
      )}
      {data.items.length === 0 ? (
        <p className="text-muted-foreground bg-card rounded-xl border px-6 py-12 text-center text-sm">No packages are available right now. Message your team for a quote.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.items.map((p) => (
            <PackageCard key={p.id} pkg={p} current={data.current} pending={pending} isOwner={isOwner} recommended={proposalOpen && proposal?.package_id === p.id} proposalOpen={proposalOpen} onChoose={setChoosing} onRequest={setRequesting} />
          ))}
        </div>
      )}
      <ChooseDialog pkg={choosing} hasDraft={data.current?.status === "draft"} onClose={() => setChoosing(null)} />
      <RequestChangeDialog pkg={requesting} from={data.current?.package_name ?? ""} onClose={() => setRequesting(null)} />
    </>
  );
}

/** Client portal: the packages Accountanz offers, and choosing one to start (or change) the service. */
export function ClientPackages() {
  return (
    <CompanyGate>
      {(company) => (
        <>
          <PageHeader title="Packages" description="Choose the service that fits your business. Prices are per month, plus GST." />
          <PackagesBody company={company} />
        </>
      )}
    </CompanyGate>
  );
}
