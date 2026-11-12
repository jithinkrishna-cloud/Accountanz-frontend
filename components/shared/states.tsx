import { AlertTriangle, Inbox, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";

export function EmptyState({ title, description, action, className }: { title: string; description?: string; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 px-6 py-12 text-center", className)}>
      <Inbox className="text-muted-foreground size-8" aria-hidden />
      <p className="font-medium">{title}</p>
      {description && <p className="text-muted-foreground max-w-sm text-sm">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry, className }: { error: unknown; onRetry?: () => void; className?: string }) {
  const message = error instanceof ApiError ? error.message : "Something went wrong while loading this.";
  return (
    <div role="alert" className={cn("flex flex-col items-center justify-center gap-2 px-6 py-12 text-center", className)}>
      <AlertTriangle className="text-destructive size-8" aria-hidden />
      <p className="font-medium">Couldn&apos;t load this</p>
      <p className="text-muted-foreground max-w-sm text-sm">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-2" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function FullPageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center" aria-busy="true" aria-live="polite">
      <Loader2 className="text-primary size-6 animate-spin" aria-label="Loading" />
    </div>
  );
}
