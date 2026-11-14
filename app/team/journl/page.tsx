"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ErrorState } from "@/components/shared/states";
import { Skeleton } from "@/components/ui/skeleton";
import { useGrantedModules } from "@/features/journl-workspace/components/journl-subnav";

/** "JournL Books" opens the first module the accountant has been granted. */
export default function JournlIndexPage() {
  const router = useRouter();
  const { modules, isLoading, error, refetch } = useGrantedModules();
  const first = modules[0];

  useEffect(() => {
    if (first) router.replace(`/team/journl/${first}`);
  }, [first, router]);

  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;
  if (isLoading || first) return <Skeleton className="h-64 w-full rounded-xl" />;
  return (
    <div className="bg-card rounded-xl border px-6 py-14 text-center">
      <p className="font-medium">No JournL modules granted yet</p>
      <p className="text-muted-foreground mx-auto mt-1 max-w-md text-sm">
        An admin grants modules per client under Assignments → JournL modules. The client also needs an active engagement and JournL access on your assignment.
      </p>
    </div>
  );
}
