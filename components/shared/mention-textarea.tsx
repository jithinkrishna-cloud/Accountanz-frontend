"use client";

import { AtSign } from "lucide-react";
import { Fragment, useId, useMemo, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Someone who can be @mentioned in a conversation. */
export interface MentionPerson {
  user_id: number;
  full_name: string;
  /** Team role (cfo, finance_manager, …) or client role (owner, member). */
  role?: string;
  kind?: "team" | "client";
}

const ROLE_LABEL: Record<string, string> = {
  cfo: "CFO",
  finance_manager: "Finance manager",
  reviewer: "Reviewer",
  bookkeeper: "Bookkeeper",
  owner: "Company owner",
  member: "Company member",
};
const roleOf = (p: MentionPerson) => (p.role ? ROLE_LABEL[p.role] ?? p.role : p.kind === "client" ? "Client" : "Team");

/** The ids of the people whose "@Full Name" appears in the text (what the API stores as mentions). */
export const mentionIdsIn = (text: string, people: MentionPerson[]) => people.filter((p) => text.includes(`@${p.full_name}`)).map((p) => p.user_id);

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Message text with each @mention shown as a chip. `onDark` for text on a coloured bubble. */
export function MentionText({ body, mentions, onDark }: { body: string; mentions: { user_id: number; full_name: string }[]; onDark?: boolean }) {
  if (!mentions.length) return <>{body}</>;
  const names = [...new Set(mentions.map((m) => m.full_name))].sort((a, b) => b.length - a.length);
  const parts = body.split(new RegExp(`(@(?:${names.map(escapeRe).join("|")}))`, "g"));
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <span key={i} className={cn("rounded px-1 py-px font-medium", onDark ? "bg-white/20 text-white" : "bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200")}>{part}</span>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}

/**
 * A textarea with @mention autocomplete: typing "@" opens a list of people; ↑/↓ choose, Enter or Tab inserts
 * "@Full Name". With `onSubmit`, Enter sends (Shift+Enter for a new line) when the list isn't open.
 */
export function MentionTextarea({
  value,
  onChange,
  people,
  onSubmit,
  className,
  rows = 3,
  ...props
}: Omit<React.ComponentProps<typeof Textarea>, "value" | "onChange" | "onSubmit"> & {
  value: string;
  onChange: (value: string) => void;
  people: MentionPerson[];
  onSubmit?: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const listId = useId();
  /** The "@query" being typed: where the "@" is, and the text after it. */
  const [trigger, setTrigger] = useState<{ at: number; query: string } | null>(null);
  const [active, setActive] = useState(0);

  const matches = useMemo(() => {
    if (!trigger) return [];
    const q = trigger.query.toLowerCase();
    return people.filter((p) => !q || p.full_name.toLowerCase().split(/\s+/).some((w) => w.startsWith(q)) || p.full_name.toLowerCase().startsWith(q)).slice(0, 8);
  }, [people, trigger]);
  const open = !!trigger && matches.length > 0;

  const detect = (text: string, caret: number) => {
    const before = text.slice(0, caret);
    const m = /(^|\s)@([^@\n]{0,30})$/.exec(before);
    if (!m) return setTrigger(null);
    setTrigger({ at: caret - m[2]!.length - 1, query: m[2]!.trimStart() });
    setActive(0);
  };

  const insert = (p: MentionPerson) => {
    if (!trigger) return;
    const el = ref.current;
    const caret = el?.selectionStart ?? value.length;
    const mention = `@${p.full_name} `;
    const next = value.slice(0, trigger.at) + mention + value.slice(caret);
    onChange(next);
    setTrigger(null);
    const pos = trigger.at + mention.length;
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(pos, pos);
    });
  };

  /** The "@" button: starts a mention at the caret. */
  const startMention = () => {
    const el = ref.current;
    const caret = el?.selectionStart ?? value.length;
    const needsSpace = caret > 0 && !/\s/.test(value[caret - 1] ?? "");
    const next = `${value.slice(0, caret)}${needsSpace ? " " : ""}@${value.slice(caret)}`;
    const pos = caret + (needsSpace ? 2 : 1);
    onChange(next);
    setTrigger({ at: pos - 1, query: "" });
    setActive(0);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(pos, pos);
    });
  };

  return (
    <div className="relative">
      <Textarea
        ref={ref}
        rows={rows}
        value={value}
        className={cn("pr-10", className)}
        role="combobox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-autocomplete="list"
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        onChange={(e) => {
          onChange(e.target.value);
          detect(e.target.value, e.target.selectionStart);
        }}
        onClick={(e) => detect(value, e.currentTarget.selectionStart)}
        onBlur={() => setTimeout(() => setTrigger(null), 120)}
        onKeyDown={(e) => {
          if (open) {
            if (e.key === "ArrowDown") return e.preventDefault(), setActive((a) => (a + 1) % matches.length);
            if (e.key === "ArrowUp") return e.preventDefault(), setActive((a) => (a - 1 + matches.length) % matches.length);
            if (e.key === "Enter" || e.key === "Tab") return e.preventDefault(), insert(matches[active]!);
            if (e.key === "Escape") return e.preventDefault(), setTrigger(null);
          }
          if (onSubmit && e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            onSubmit();
          }
        }}
        {...props}
      />
      {people.length > 0 && (
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={startMention}
          title="Mention someone"
          aria-label="Mention someone"
          className="text-muted-foreground hover:text-foreground hover:bg-muted absolute top-2 right-2 rounded-md p-1"
        >
          <AtSign className="size-4" />
        </button>
      )}
      {open && (
        <div className="bg-popover text-popover-foreground absolute bottom-full left-0 z-50 mb-2 w-72 max-w-full overflow-hidden rounded-xl border shadow-lg">
          <p className="text-muted-foreground border-b px-3 py-2 text-xs font-medium">Mention someone</p>
          <ul id={listId} role="listbox" aria-label="People to mention" className="max-h-64 overflow-y-auto py-1">
            {matches.map((p, i) => (
              <li
                key={p.user_id}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActive(i)}
                onClick={() => insert(p)}
                className={cn("flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm", i === active && "bg-muted")}
              >
                <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold", p.kind === "client" ? "bg-amber-100 text-amber-800" : "bg-primary/15 text-primary")}>
                  {initials(p.full_name)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{p.full_name}</span>
                  <span className="text-muted-foreground block truncate text-xs">{roleOf(p)}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
