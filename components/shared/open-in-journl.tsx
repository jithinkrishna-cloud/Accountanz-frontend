import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

/** JournL's web address. Accountants sign in there with the login the client invited them with. */
const JOURNL_URL = process.env.NEXT_PUBLIC_JOURNL_URL;

/** A plain link to JournL (navigation only). Renders nothing when NEXT_PUBLIC_JOURNL_URL isn't set. */
export function OpenInJournl({ className }: { className?: string }) {
  if (!JOURNL_URL) return null;
  return (
    <a
      href={JOURNL_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={cn("text-primary inline-flex items-center gap-1.5 text-sm font-medium hover:underline", className)}
    >
      Open JournL <ExternalLink className="size-3.5" aria-hidden />
    </a>
  );
}
