import { FirmProgressView } from "@/features/progress/components/firm-progress";
import { Suspense } from "react";

export default function FirmProgressPage() {
  return (
    <Suspense>
      <FirmProgressView />
    </Suspense>
  );
}
