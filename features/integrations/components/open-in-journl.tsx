import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { humanize } from "@/lib/format";

/** Mirrors backend JournlLinkState (integrations/journl-link.ts). */
export type JournlLinkState = { state: "ready"; url: string } | { state: "not_configured" } | { state: "unavailable"; status: string | null };

const UNAVAILABLE: Record<string, string> = {
  disconnected: "The client disconnected JournL. They can reconnect from their portal (Accounting Software).",
  revoked: "JournL access was revoked. The client needs to reconnect from their portal (Accounting Software).",
  error: "The JournL connection has an error. The client needs to reconnect from their portal (Accounting Software).",
  pending: "The client started connecting JournL but hasn't finished.",
};

/**
 * "Open in JournL": navigation only. The link carries no Accountanz session, so JournL shows whoever is signed in
 * there in this browser, or its own sign-in page.
 */
export function OpenInJournl({ link, size = "sm", className }: { link: JournlLinkState; size?: "sm" | "default"; className?: string }) {
  if (link.state === "ready") {
    return (
      <div className={className}>
        <Button asChild size={size} variant="outline">
          <a href={link.url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="size-4" aria-hidden /> Open in JournL
          </a>
        </Button>
        <p className="text-muted-foreground mt-1.5 text-xs">
          Opens JournL in a new tab. Sign in with your JournL login for this client: JournL opens the company that login belongs to.
        </p>
      </div>
    );
  }
  const message =
    link.state === "not_configured"
      ? "The JournL link isn't set up yet. An admin needs to add JournL's web address (JOURNL_APP_URL_TEMPLATE)."
      : link.status
        ? (UNAVAILABLE[link.status] ?? `JournL status: ${humanize(link.status)}.`)
        : "The client hasn't connected JournL yet. They do it from their portal (Accounting Software).";
  return (
    <div className={className}>
      <Button size={size} variant="outline" disabled>
        <ExternalLink className="size-4" aria-hidden /> Open in JournL
      </Button>
      <p className="text-muted-foreground mt-1.5 text-xs">{message}</p>
    </div>
  );
}
