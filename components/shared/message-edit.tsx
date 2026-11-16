"use client";

import { Pencil } from "lucide-react";
import { useEffect, useState } from "react";
import { MentionTextarea, mentionIdsIn, type MentionPerson } from "@/components/shared/mention-textarea";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { applyApiError } from "@/lib/form-errors";
import { cn } from "@/lib/utils";

/** Matches the server's edit window (MESSAGE_EDIT_MINUTES). The server enforces it; this only hides the button in time. */
export const MESSAGE_EDIT_MINUTES = 5;

/**
 * True while the author can still edit a message. `secondsLeft` comes from the server (so clock differences and
 * time zones don't matter); a timer closes the window on screen when it runs out.
 */
export function useEditWindow(secondsLeft: number) {
  const [expired, setExpired] = useState(false);
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setTimeout(() => setExpired(true), secondsLeft * 1000);
    return () => clearTimeout(t);
  }, [secondsLeft]);
  return secondsLeft > 0 && !expired;
}

/** Small "Edit" link under one of your own messages, shown only inside the edit window. */
export function EditMessageButton({ secondsLeft, onEdit, onDark }: { secondsLeft: number; onEdit: () => void; onDark?: boolean }) {
  const open = useEditWindow(secondsLeft);
  if (!open) return null;
  return (
    <button
      type="button"
      onClick={onEdit}
      title={`You can edit a message for ${MESSAGE_EDIT_MINUTES} minutes after sending it`}
      className={cn("inline-flex items-center gap-1 rounded text-[11px] font-medium underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:outline-none", onDark ? "text-primary-foreground/90 focus-visible:ring-white/60" : "text-primary focus-visible:ring-ring")}
    >
      <Pencil className="size-3" aria-hidden />
      Edit
    </button>
  );
}

/** Inline editor that replaces a message bubble's text. Enter saves, Shift+Enter adds a line, Esc cancels. */
export function MessageEditor({
  initial,
  people,
  pending,
  onSave,
  onCancel,
}: {
  initial: string;
  people: MentionPerson[];
  pending: boolean;
  onSave: (body: string, mentions: number[]) => Promise<unknown>;
  onCancel: () => void;
}) {
  const [body, setBody] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const save = async () => {
    const text = body.trim();
    if (!text) return setError("Write a message");
    if (text === initial.trim()) return onCancel();
    try {
      await onSave(text, mentionIdsIn(text, people));
      onCancel();
    } catch (err) {
      setError(applyApiError(err));
    }
  };
  return (
    <div className="bg-card text-card-foreground grid gap-2 rounded-lg p-2" onKeyDown={(e) => e.key === "Escape" && onCancel()}>
      <MentionTextarea aria-label="Edit message" rows={2} autoFocus value={body} onChange={(v) => { setBody(v); setError(null); }} people={people} onSubmit={() => void save()} aria-invalid={!!error} />
      <div className="flex items-center justify-end gap-2">
        {error && <p className="text-destructive mr-auto text-xs" role="alert">{error}</p>}
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
        <SubmitButton type="button" size="sm" pending={pending} onClick={() => void save()}>Save</SubmitButton>
      </div>
    </div>
  );
}
