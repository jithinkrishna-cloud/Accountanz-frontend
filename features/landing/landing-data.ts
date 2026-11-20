"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

/** From GET /api/public/accountants: what anyone may see about an accountant. */
export interface PublicAccountant {
  full_name: string;
  role: string;
  expertise: string[];
  member_since: string;
}

/** From GET /api/public/packages: active packages, cheapest first. */
export interface PublicPackage {
  name: string;
  description: string | null;
  monthly_fee: number;
  billing_cycle: "monthly" | "quarterly" | "yearly";
  scope_notes: string | null;
  team_roles: string[];
  services: string[];
}

const FIVE_MIN = 5 * 60_000;

export const usePublicAccountants = () =>
  useQuery({
    queryKey: ["public", "accountants"],
    queryFn: () => api<{ items: PublicAccountant[] }>("/public/accountants").then((r) => r.items),
    staleTime: FIVE_MIN,
  });

export const usePublicPackages = () =>
  useQuery({
    queryKey: ["public", "packages"],
    queryFn: () => api<{ items: PublicPackage[] }>("/public/packages").then((r) => r.items),
    staleTime: FIVE_MIN,
  });

export const ROLE_NAME: Record<string, string> = {
  bookkeeper: "Bookkeeper",
  finance_manager: "Finance manager",
  reviewer: "Reviewer",
  cfo: "CFO",
};
