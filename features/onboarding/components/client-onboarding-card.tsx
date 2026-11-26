"use client";

import { ClipboardList, Zap } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EngagementFormDialog } from "@/features/engagements/components/engagement-form-dialog";
import { useEngagements } from "@/features/engagements/hooks/use-engagements";
import { useOnboardingCases } from "../hooks/use-onboarding";
import { STAGE_LABELS, type OnboardingCase } from "../types/onboarding.types";
import { OnboardingCaseSheet } from "./onboarding-case-sheet";

/**
 * On a client that isn't active yet (a portal sign-up or a new lead): where onboarding now happens, since there is
 * no separate Leads page. Either work through the assessment and proposal, or activate a package straight away.
 */
export function ClientOnboardingCard({ client, onActivated }: { client: { id: number; name: string }; onActivated: () => void }) {
  const cases = useOnboardingCases({ client_id: client.id, page: 1 });
  const latest = cases.data?.items[0] ?? null;
  // An engagement already in progress (e.g. from an accepted proposal) is continued, not duplicated.
  const engagements = useEngagements({ clientId: client.id, page: 1 });
  const inProgress = engagements.data?.items.find((e) => e.status !== "ended") ?? null;
  const [open, setOpen] = useState<OnboardingCase | null>(null);
  const [activating, setActivating] = useState(false);

  return (
    <section className="bg-card mb-6 flex flex-col gap-3 rounded-xl border p-5 shadow-xs sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <h2 className="font-semibold">Onboarding</h2>
        <p className="text-muted-foreground text-sm">
          {latest ? `Stage: ${STAGE_LABELS[latest.stage]}. ` : ""}
          This client has no active package yet. Review the assessment and proposal, or activate a package now.
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        {latest && (
          <Button variant="outline" onClick={() => setOpen(latest)}>
            <ClipboardList className="size-4" /> Open onboarding
          </Button>
        )}
        {inProgress ? (
          <Button asChild>
            <Link href={`/admin/clients?tab=engagements&open=${inProgress.id}`}>
              <Zap className="size-4" /> Continue engagement
            </Link>
          </Button>
        ) : (
          <Button onClick={() => setActivating(true)} disabled={engagements.isLoading}>
            <Zap className="size-4" /> Activate package
          </Button>
        )}
      </div>
      <OnboardingCaseSheet row={open} onOpenChange={(o) => !o && setOpen(null)} onChanged={setOpen} />
      <EngagementFormDialog
        open={activating}
        forClient={client}
        onOpenChange={setActivating}
        onSaved={() => onActivated()}
      />
    </section>
  );
}
