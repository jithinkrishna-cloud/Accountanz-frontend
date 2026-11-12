"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api-client";
import { PORTAL_HOME } from "@/lib/constants";
import type { SessionUser } from "@/types/auth";
import { authService } from "../services/auth-service";

export const SESSION_KEY = ["session"] as const;

/** Current user, or null when signed out. */
export function useSession() {
  return useQuery<SessionUser | null>({
    queryKey: SESSION_KEY,
    queryFn: async () => {
      try {
        return await authService.me();
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return null;
        throw err;
      }
    },
    staleTime: 5 * 60_000,
  });
}

/** Stores the signed-in user and sends them to their portal (or to a safe ?next= path inside it). */
export function useSignedIn() {
  const qc = useQueryClient();
  const router = useRouter();
  return (user: SessionUser, next?: string | null) => {
    qc.setQueryData(SESSION_KEY, user);
    const home = PORTAL_HOME[user.portal];
    const safeNext = next && next.startsWith(`/${user.portal}/`) && !next.startsWith("//") ? next : null;
    router.replace(safeNext ?? home);
  };
}

export function useLogout() {
  const qc = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: authService.logout,
    onSettled: () => {
      qc.clear();
      router.replace("/login");
    },
  });
}
