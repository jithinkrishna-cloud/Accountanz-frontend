import { Suspense } from "react";
import { AnalyticsOverview } from "@/features/analytics/components/analytics-overview";

export default function AnalyticsPage() {
  // Suspense: the page reads ?range=.
  return (
    <Suspense>
      <AnalyticsOverview />
    </Suspense>
  );
}
