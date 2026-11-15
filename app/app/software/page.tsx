"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ClientSoftwarePage() {
  const router = useRouter();
  useEffect(() => {
    void router.replace("/app/settings");
  }, [router]);
  return null;
}
