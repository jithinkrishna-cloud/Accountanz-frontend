"use client";

import { PortalGuard } from "@/components/layouts/portal-guard";
import { PortalShell } from "@/components/layouts/portal-shell";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalGuard portal="admin">
      {(user) => (
        <PortalShell portal="admin" user={user}>
          {children}
        </PortalShell>
      )}
    </PortalGuard>
  );
}
