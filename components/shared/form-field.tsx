import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FormFieldProps {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  className?: string;
  /** Rendered right of the label, e.g. a "Forgot password?" link. */
  aside?: React.ReactNode;
  children: React.ReactNode;
}

/** Label + control + hint/error, with the error linked to the control for screen readers. */
export function FormField({ id, label, error, hint, className, aside, children }: FormFieldProps) {
  return (
    <div className={cn("grid min-w-0 grid-cols-1 content-start gap-1.5", className)}>
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>{label}</Label>
        {aside}
      </div>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-destructive text-xs">
          {error}
        </p>
      ) : hint ? (
        <p className="text-muted-foreground text-xs">{hint}</p>
      ) : null}
    </div>
  );
}
