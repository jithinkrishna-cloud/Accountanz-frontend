"use client";

import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { CorrectionsPage } from "@/features/journl-corrections/corrections-page";

export default function TeamJournlCorrectionsPage() {
  // The client picker lives in the URL (?client=), which needs a Suspense boundary.
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
      <CorrectionsPage />
    </Suspense>
  );
}
