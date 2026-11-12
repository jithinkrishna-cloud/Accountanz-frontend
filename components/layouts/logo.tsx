import { cn } from "@/lib/utils";

export function Logo({ inverted = false }: { inverted?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-lg text-lg font-bold">A</div>
      <div className="leading-tight">
        <p className={cn("font-semibold", inverted ? "text-white" : "text-foreground")}>Accountanz</p>
        <p className={cn("text-[10px] font-medium tracking-[0.14em] uppercase", inverted ? "text-sidebar-muted" : "text-muted-foreground")}>
          Managed accounting
        </p>
      </div>
    </div>
  );
}
