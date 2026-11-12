"use client";

import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Search box that reports its trimmed value after the user pauses typing. `value` seeds the initial text. */
export function SearchInput({ value, onChange, placeholder, className }: { value: string; onChange: (v: string) => void; placeholder: string; className?: string }) {
  const [text, setText] = useState(value);
  useEffect(() => {
    if (text.trim() === value) return;
    const t = setTimeout(() => onChange(text.trim()), 300);
    return () => clearTimeout(t);
  }, [text, value, onChange]);

  return (
    <div className={cn("relative w-full sm:max-w-xs", className)}>
      <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" aria-hidden />
      <Input type="search" aria-label={placeholder} placeholder={placeholder} value={text} onChange={(e) => setText(e.target.value)} className="pl-9" />
    </div>
  );
}
