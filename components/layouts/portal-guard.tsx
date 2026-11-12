"use client";

import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ErrorState, FullPageLoader } from "@/components/shared/states";
import { useSession } from "@/features/auth/hooks/use-session";
import { PORTAL_HOME, ROLE_LABELS } from "@/lib/constants";
import type { Portal, SessionUser } from "@/types/auth";

type GuardProps = { portal: Portal; children: (user: SessionUser) => React.ReactNode };

/**
 * Client-side gate for a portal. The API enforces roles on every request; this only decides
 * what to render: login redirect, "no access" screen, or the portal.
 * Suspense is required because the guard reads the URL, which only exists at request time.
 */
export function PortalGuard(props: GuardProps) {
  return (
    <Suspense fallback={<FullPageLoader />}>
      <Guard {...props} />
    </Suspense>
  );
}

function Guard({ portal, children }: GuardProps) {
  const { data: user, isPending, error, refetch } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isPending && user === null) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [isPending, user, router, pathname]);

  if (error) return <ErrorState error={error} onRetry={() => void refetch()} className="min-h-screen" />;
  if (isPending || !user) return <FullPageLoader />;

  if (user.portal !== portal) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
        <ShieldAlert className="text-warning size-10" aria-hidden />
        <h1 className="text-xl font-semibold">You don&apos;t have access to this area</h1>
        <p className="text-muted-foreground max-w-sm text-sm">
          Your account is signed in as {ROLE_LABELS[user.role]}. That role works inside a different portal.
        </p>
        <Button asChild className="mt-2">
          <Link href={PORTAL_HOME[user.portal]}>Go to my portal</Link>
        </Button>
      </main>
    );
  }

  return <>{children(user)}</>;
}
