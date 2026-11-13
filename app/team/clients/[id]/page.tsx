"use client";

import { useParams } from "next/navigation";
import { ErrorState } from "@/components/shared/states";
import { ClientOverviewView } from "@/features/workspace/components/client-overview";
import { ApiError } from "@/lib/api-client";

export default function TeamClientPage() {
  const id = Number(useParams<{ id: string }>().id);
  if (!Number.isInteger(id) || id <= 0) return <ErrorState error={new ApiError(404, "NOT_FOUND", "Client not found")} />;
  return <ClientOverviewView id={id} />;
}
