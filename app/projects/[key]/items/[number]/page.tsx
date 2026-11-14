"use client";

import { useParams, useRouter } from "next/navigation";
import { ErrorState } from "@/components/shared/states";
import { ItemDetailView } from "@/features/projects/components/item-detail";
import { ApiError } from "@/lib/api-client";

export default function ItemPage() {
  const { key, number } = useParams<{ key: string; number: string }>();
  const router = useRouter();
  const n = Number(String(number).split("-").pop());
  if (!Number.isInteger(n) || n <= 0) return <ErrorState error={new ApiError(404, "NOT_FOUND", "Work item not found")} />;
  return <ItemDetailView number={n} wide onDeleted={() => router.push(`/projects/${key}/board`)} />;
}
