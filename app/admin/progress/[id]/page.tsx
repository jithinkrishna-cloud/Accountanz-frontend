"use client";

import { useParams } from "next/navigation";
import { ErrorState } from "@/components/shared/states";
import { PersonProgressView } from "@/features/progress/components/person-progress";
import { ApiError } from "@/lib/api-client";

export default function PersonProgressPage() {
  const id = Number(useParams<{ id: string }>().id);
  if (!Number.isInteger(id) || id <= 0) return <ErrorState error={new ApiError(404, "NOT_FOUND", "Team member not found")} />;
  return <PersonProgressView id={id} />;
}
