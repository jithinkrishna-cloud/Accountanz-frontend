import { ProgressListView } from "@/features/progress/components/progress-list";
import { Suspense } from "react";

export default function TeamProgressPage() {
  return (
    <Suspense>
      <ProgressListView />
    </Suspense>
  );
}
