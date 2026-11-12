"use client";

import { PortalGuard } from "@/components/layouts/portal-guard";
import { PortalShell } from "@/components/layouts/portal-shell";

export default function TeamLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalGuard portal="team">
      {(user) => (
        <PortalShell portal="team" user={user}>
          {children}
        </PortalShell>
      )}
    </PortalGuard>
  );
}
