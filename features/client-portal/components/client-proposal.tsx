"use client";

import { Check, CheckCircle2, FileSignature, MessageSquare, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { applyApiError } from "@/lib/form-errors";
import { formatINR } from "@/lib/format";
import { useAcceptProposal, usePortalProposal } from "../hooks/use-client-portal";
import type { PortalProposal } from "../types/client-portal.types";
import { TeamIncluded } from "./portal-ui";

const PER: Record<PortalProposal["billing_cycle"], string> = { monthly: "month", quarterly: "quarter", yearly: "year" };
const longDate = (utc: string) => new Date(`${utc.replace(" ", "T")}Z`).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

/** What happens after accepting: commercial acceptance first, the service starts only once the agreement is signed. */
const NEXT_STEPS = ["Your team prepares your agreement", "You sign it", "Your service starts and your team is assigned"];

function AcceptDialog({ proposal, open, onClose }: { proposal: PortalProposal; open: boolean; onClose: () => void }) {
  const accept = useAcceptProposal();
  const confirm = async () => {
    try {
      await accept.mutateAsync();
      toast.success("Proposal accepted. Your team will send your agreement.");
      onClose();
    } catch (err) {
      applyApiError(err);
    }
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Accept {proposal.package_name}?</DialogTitle>
          <DialogDescription>
            {formatINR(proposal.monthly_fee)} per {PER[proposal.billing_cycle]} + GST. Nothing is charged now: your team sends you an agreement to sign, and your first invoice is issued when the service starts.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Not yet</Button>
          <SubmitButton type="button" pending={accept.isPending} onClick={() => void confirm()}><Check className="size-4" /> Accept proposal</SubmitButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * The proposal Accountanz recommended for this company. Shown on the dashboard and the Packages page while it's open,
 * and as a confirmation (with next steps) after it's accepted, until the service starts.
 */
export function ProposalCard({ className }: { className?: string }) {
  const { data: proposal } = usePortalProposal();
  const [accepting, setAccepting] = useState(false);
  if (!proposal) return null;

  if (proposal.stage === "accepted") {
    return (
      <section className={`rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-50 ${className ?? ""}`} aria-labelledby="proposal-accepted">
        <p id="proposal-accepted" className="flex items-center gap-2 font-medium">
          <CheckCircle2 className="size-5" aria-hidden />
          {proposal.accepted_via === "client" ? "You accepted" : "Accepted"}: {proposal.package_name} · {formatINR(proposal.monthly_fee)}/{PER[proposal.billing_cycle]} + GST
        </p>
        {proposal.accepted_at && <p className="mt-0.5 text-sm opacity-80">on {longDate(proposal.accepted_at)}</p>}
        <ol className="mt-3 grid gap-1.5 text-sm sm:grid-cols-3">
          {NEXT_STEPS.map((step, i) => (
            <li key={step} className="flex items-start gap-2">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-white text-[11px] font-semibold text-emerald-800 ring-1 ring-emerald-200">{i + 1}</span>
              {step}
            </li>
          ))}
        </ol>
      </section>
    );
  }

  return (
    <section className={`bg-card overflow-hidden rounded-xl border-2 border-primary/30 shadow-sm ${className ?? ""}`} aria-labelledby="proposal-heading">
      <div className="bg-primary/5 flex items-center gap-2 border-b px-5 py-3">
        <Sparkles className="text-primary size-4" aria-hidden />
        <h2 id="proposal-heading" className="text-sm font-medium">Your proposal from Accountanz</h2>
        {proposal.sent_at && <span className="text-muted-foreground ml-auto text-xs">Sent {longDate(proposal.sent_at)}</span>}
      </div>
      <div className="grid gap-6 p-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <p className="text-muted-foreground text-xs tracking-wide uppercase">Recommended package</p>
          <p className="mt-0.5 text-xl font-semibold">{proposal.package_name}</p>
          {proposal.package_description && <p className="text-muted-foreground mt-0.5 text-sm">{proposal.package_description}</p>}
          <p className="mt-3">
            <span className="text-2xl font-semibold tabular-nums">{formatINR(proposal.monthly_fee)}</span>
            <span className="text-muted-foreground text-sm"> / {PER[proposal.billing_cycle]} + GST</span>
          </p>
          {proposal.services.length > 0 && (
            <ul className="mt-3 grid gap-1.5 text-sm">
              {proposal.services.map((s) => (
                <li key={s} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden />{s}</li>
              ))}
            </ul>
          )}
          {proposal.scope_notes && <p className="text-muted-foreground mt-3 text-xs">{proposal.scope_notes}</p>}
          <TeamIncluded roles={proposal.team_roles} className="mt-4" />
        </div>
        <div className="flex flex-col gap-4">
          {proposal.message && (
            <figure className="bg-muted/50 rounded-lg border p-4 text-sm">
              <figcaption className="text-muted-foreground mb-1.5 text-xs">A note from {proposal.sent_by ?? "your Accountanz team"}</figcaption>
              <blockquote className="whitespace-pre-line">{proposal.message}</blockquote>
            </figure>
          )}
          <div>
            <p className="text-muted-foreground mb-2 flex items-center gap-1.5 text-xs"><FileSignature className="size-3.5" aria-hidden /> After you accept</p>
            <ol className="grid gap-1 text-sm">
              {NEXT_STEPS.map((step, i) => <li key={step} className="text-muted-foreground"><span className="text-foreground font-medium">{i + 1}.</span> {step}</li>)}
            </ol>
          </div>
          <div className="mt-auto flex flex-wrap gap-2">
            {proposal.can_accept ? (
              <Button onClick={() => setAccepting(true)}><Check className="size-4" /> Accept proposal</Button>
            ) : (
              <p className="text-muted-foreground text-xs">Only your company owner can accept the proposal.</p>
            )}
            <Button variant="outline" asChild>
              <Link href={`/app/messages?subject=${encodeURIComponent(`Question about my proposal (${proposal.package_name})`)}`}><MessageSquare className="size-4" /> Ask a question</Link>
            </Button>
          </div>
        </div>
      </div>
      <AcceptDialog proposal={proposal} open={accepting} onClose={() => setAccepting(false)} />
    </section>
  );
}
