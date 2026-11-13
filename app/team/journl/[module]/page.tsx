"use client";

import { useParams } from "next/navigation";
import { Suspense } from "react";
import { ErrorState } from "@/components/shared/states";
import { Skeleton } from "@/components/ui/skeleton";
import { JournlModulePage } from "@/features/journl-workspace/components/journl-module-page";
import { JOURNL_MODULE_META } from "@/features/journl-workspace/types/journl-workspace.types";
import { ApiError } from "@/lib/api-client";

export default function TeamJournlModulePage() {
  const moduleKey = useParams<{ module: string }>().module;
  if (!JOURNL_MODULE_META[moduleKey]) return <ErrorState error={new ApiError(404, "NOT_FOUND", "This JournL module doesn't exist")} />;
  // The client picker lives in the URL (?client=), which needs a Suspense boundary.
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
      <JournlModulePage key={moduleKey} moduleKey={moduleKey} />
    </Suspense>
  );
}
