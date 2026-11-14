"use client";

import { Check, Pencil, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const NONE = "__none";

/** A labelled detail row as on the item's right panel. */
export function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] items-center gap-2 py-1.5">
      <span className="text-muted-foreground text-sm">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** Select that saves on change; `null` is the "none" option when `noneLabel` is given. */
export function InlineSelect<T extends string | number>({
  value,
  options,
  onChange,
  noneLabel,
  disabled,
  label,
  className,
}: {
  value: T | null;
  options: { value: T; label: React.ReactNode }[];
  onChange: (v: T | null) => void;
  noneLabel?: string;
  disabled?: boolean;
  label: string;
  className?: string;
}) {
  const current = value == null ? NONE : String(value);
  return (
    <Select
      value={current}
      disabled={disabled}
      onValueChange={(v) => {
        if (v === current) return;
        if (v === NONE) return onChange(null);
        const opt = options.find((o) => String(o.value) === v);
        if (opt) onChange(opt.value);
      }}
    >
      <SelectTrigger size="sm" className={cn("h-8 w-full border-transparent shadow-none hover:border-input", className)} aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {noneLabel && <SelectItem value={NONE}>{noneLabel}</SelectItem>}
        {options.map((o) => (
          <SelectItem key={String(o.value)} value={String(o.value)}>{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Click-to-edit text/number/date field; Enter or ✓ saves, Escape cancels. Empty saves null. */
export function InlineInput({
  value,
  onSave,
  type = "text",
  placeholder = "None",
  label,
  display,
  className,
}: {
  value: string | null;
  onSave: (v: string | null) => Promise<unknown> | void;
  type?: "text" | "number" | "date";
  placeholder?: string;
  label: string;
  display?: React.ReactNode;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const save = async () => {
    const v = draft.trim() === "" ? null : draft.trim();
    if (v !== (value ?? null)) await onSave(v);
    setEditing(false);
  };
  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => (setDraft(value ?? ""), setEditing(true))}
        className={cn("hover:bg-muted group flex min-h-8 w-full items-center gap-2 rounded-md px-2 text-left text-sm", className)}
        aria-label={`Edit ${label}`}
      >
        <span className={cn("truncate", !value && "text-muted-foreground")}>{value ? (display ?? value) : placeholder}</span>
        <Pencil className="text-muted-foreground ml-auto size-3.5 opacity-0 group-hover:opacity-100" aria-hidden />
      </button>
    );
  }
  return (
    <div className="flex items-center gap-1">
      <Input
        autoFocus
        type={type}
        value={draft}
        aria-label={label}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") void save();
          if (e.key === "Escape") setEditing(false);
        }}
        className="h-8"
      />
      <Button size="icon" variant="ghost" className="size-8" onClick={() => void save()} aria-label="Save"><Check className="size-4" /></Button>
      <Button size="icon" variant="ghost" className="size-8" onClick={() => setEditing(false)} aria-label="Cancel"><X className="size-4" /></Button>
    </div>
  );
}
