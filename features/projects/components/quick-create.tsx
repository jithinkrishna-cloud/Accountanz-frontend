"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { applyApiError } from "@/lib/form-errors";
import { useCreateItem } from "../hooks/use-projects";
import { ITEM_TYPE_LABELS, type ItemType, type NewItem } from "../types/project.types";
import { TypeIcon } from "./project-ui";

/** Inline "+ Create" row: type + summary, Enter to create, stays open for the next one. */
export function QuickCreate({ spaceKey, defaults, label = "Create", className }: { spaceKey: string; defaults?: Omit<NewItem, "title">; label?: string; className?: string }) {
  const create = useCreateItem(spaceKey);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<ItemType>("task");

  if (!open) {
    return (
      <Button variant="ghost" size="sm" className={className ?? "text-muted-foreground w-full justify-start"} onClick={() => setOpen(true)}>
        <Plus className="size-4" /> {label}
      </Button>
    );
  }
  const submit = async () => {
    if (!title.trim()) return;
    try {
      await create.mutateAsync({ ...defaults, title: title.trim(), type });
      setTitle("");
    } catch (err) {
      applyApiError(err);
    }
  };
  return (
    <div className="bg-card flex flex-wrap items-center gap-2 rounded-lg border p-2">
      <Select value={type} onValueChange={(v) => setType(v as ItemType)}>
        <SelectTrigger size="sm" className="w-28" aria-label="Work type">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(["task", "bug", "story"] as const).map((t) => (
            <SelectItem key={t} value={t}><span className="flex items-center gap-2"><TypeIcon type={t} />{ITEM_TYPE_LABELS[t]}</span></SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        autoFocus
        value={title}
        maxLength={255}
        placeholder="What needs to be done?"
        aria-label="Summary"
        className="h-8 min-w-48 flex-1"
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") void submit();
          if (e.key === "Escape") setOpen(false);
        }}
      />
      <SubmitButton size="sm" pending={create.isPending} onClick={() => void submit()}>Create</SubmitButton>
      <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
    </div>
  );
}
