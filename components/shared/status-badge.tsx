import { STATUS_TONES, type Tone } from "@/lib/constants";
import { humanize } from "@/lib/format";
import { cn } from "@/lib/utils";

const TONE_CLASSES: Record<Tone, string> = {
  neutral: "bg-secondary text-secondary-foreground ring-border",
  success: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  warning: "bg-amber-50 text-amber-700 ring-amber-200",
  danger: "bg-red-50 text-red-700 ring-red-200",
  info: "bg-sky-50 text-sky-700 ring-sky-200",
};

export function StatusBadge({ status, label, className }: { status: string; label?: string; className?: string }) {
  const tone = STATUS_TONES[status] ?? "neutral";
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", TONE_CLASSES[tone], className)}>
      {label ?? humanize(status)}
    </span>
  );
}
