"use client";

import { useParams } from "next/navigation";
import { ErrorState } from "@/components/shared/states";
import { StaffDetail } from "@/features/staff/components/staff-detail";
import { ApiError } from "@/lib/api-client";

export default function EmployeeDetailPage() {
  const id = Number(useParams<{ id: string }>().id);
  if (!Number.isInteger(id) || id <= 0) return <ErrorState error={new ApiError(404, "NOT_FOUND", "Employee not found")} />;
  return <StaffDetail id={id} staffType="employee" />;
}