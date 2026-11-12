"use client";

import { PortalGuard } from "@/components/layouts/portal-guard";
import { PortalShell } from "@/components/layouts/portal-shell";

export default function ClientPortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalGuard portal="app">
      {(user) => (
        <PortalShell portal="app" user={user}>
          {children}
        </PortalShell>
      )}
    </PortalGuard>
  );
}
