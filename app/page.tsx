"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { FullPageLoader } from "@/components/shared/states";
import { useSession } from "@/features/auth/hooks/use-session";
import { PORTAL_HOME } from "@/lib/constants";

/** Sends visitors to their portal, or to login when signed out. */
export default function Home() {
  const { data: user, isPending } = useSession();
  const router = useRouter();
  useEffect(() => {
    if (!isPending) router.replace(user ? PORTAL_HOME[user.portal] : "/login");
  }, [isPending, user, router]);
  return <FullPageLoader />;
}
