"use client";

import { Check, CheckCircle2, Info } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState } from "@/components/shared/states";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { applyApiError } from "@/lib/form-errors";
import { formatINR } from "@/lib/format";
import { useChoosePackage, usePortalPackages } from "../hooks/use-client-portal";
import type { PortalCompany, PortalPackage, PortalPackages } from "../types/client-portal.types";
import { CompanyGate } from "./company-gate";

const CYCLE: Record<PortalPackage["billing_cycle"], string> = { monthly: "Billed monthly", quarterly: "Billed quarterly", yearly: "Billed yearly" };

const STAGE: Record<NonNullable<PortalPackages["current"]>["status"], string> = {
  draft: "Your team is preparing your agreement. You can still switch package.",
  sent: "Your agreement has been sent to you. Message your team to change package.",
  accepted: "You accepted the agreement. Your team will activate your service shortly.",
  active: "This is your active service. Message your team to change package.",
};

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

function PackageCard({ pkg, current, isOwner, onChoose }: { pkg: PortalPackage; current: PortalPackages["current"]; isOwner: boolean; onChoose: (p: PortalPackage) => void }) {
  const isCurrent = current?.package_id === pkg.id;
  const locked = !!current && current.status !== "draft";
  return (
    <article className={`bg-card flex flex-col rounded-xl border p-5 shadow-xs ${isCurrent ? "border-primary ring-primary/20 ring-2" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-semibold">{pkg.name}</h2>
          {pkg.description && <p className="text-muted-foreground mt-0.5 text-sm">{pkg.description}</p>}
        </div>
        {isCurrent && (
          <span className="text-primary flex shrink-0 items-center gap-1 text-xs font-medium">
            <CheckCircle2 className="size-4" aria-hidden /> Your package
          </span>
        )}
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

      <div className="mt-auto pt-5">
        {isCurrent ? (
          <Button variant="outline" className="w-full" disabled>Selected</Button>
        ) : isOwner && !locked ? (
          <Button className="w-full" onClick={() => onChoose(pkg)}>{current ? "Switch to this package" : "Choose this package"}</Button>
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
  const [choosing, setChoosing] = useState<PortalPackage | null>(null);
  const isOwner = company.role === "owner";

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
      {data.current && <CurrentBanner current={data.current} />}
      {!isOwner && <p className="text-muted-foreground mb-4 text-sm">Only your company owner can choose a package.</p>}
      {data.items.length === 0 ? (
        <p className="text-muted-foreground bg-card rounded-xl border px-6 py-12 text-center text-sm">No packages are available right now. Message your team for a quote.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.items.map((p) => (
            <PackageCard key={p.id} pkg={p} current={data.current} isOwner={isOwner} onChoose={setChoosing} />
          ))}
        </div>
      )}
      <ChooseDialog pkg={choosing} hasDraft={data.current?.status === "draft"} onClose={() => setChoosing(null)} />
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
