"use client";

import { ArrowLeft, Lock, MessageSquarePlus, Send } from "lucide-react";
import { useState } from "react";
import { FilterSelect } from "@/components/shared/filter-select";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useStaffClientOptions } from "@/features/workspace/hooks/use-workspace";
import { applyApiError } from "@/lib/form-errors";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { StaffPortal } from "@/types/auth";
import { useReply, useThread, useThreads } from "../hooks/use-communication";
import type { Thread, ThreadVisibility } from "../types/communication.types";
import { NewThreadDialog } from "./new-thread-dialog";

function ThreadListItem({ thread, active, onSelect }: { thread: Thread; active: boolean; onSelect: () => void }) {
  const waiting = thread.visibility === "client" && thread.last_from_client === 1;
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={cn("hover:bg-muted/60 w-full border-b px-4 py-3 text-left", active && "bg-muted")}
        aria-current={active ? "true" : undefined}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-medium">{thread.subject ?? "Conversation"}</p>
          {waiting && <span className="bg-primary/10 text-primary shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium">Needs reply</span>}
        </div>
        <p className="text-muted-foreground truncate text-xs">{thread.client_name}</p>
        <p className="text-muted-foreground mt-1 line-clamp-1 text-xs">
          {thread.last_author ? `${thread.last_author}: ` : ""}{thread.last_body}
        </p>
      </button>
    </li>
  );
}

function Conversation({ portal, threadId, onBack }: { portal: StaffPortal; threadId: number; onBack: () => void }) {
  const { data: t, isLoading, error, refetch } = useThread(portal, threadId);
  const reply = useReply(portal, threadId);
  const [body, setBody] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return setErr("Write a message");
    try {
      await reply.mutateAsync(body.trim());
      setBody("");
      setErr(null);
    } catch (e2) {
      setErr(applyApiError(e2));
    }
  };

  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;
  if (isLoading || !t) return <div className="space-y-3 p-5"><Skeleton className="h-6 w-1/2" /><Skeleton className="h-24 w-full" /></div>;

  const internal = t.visibility === "internal";
  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-start gap-2 border-b px-5 py-4">
        <Button variant="ghost" size="icon" className="-ml-2 size-8 lg:hidden" onClick={onBack} aria-label="Back to conversations"><ArrowLeft className="size-4" /></Button>
        <div className="min-w-0">
          <h2 className="truncate font-medium">{t.subject ?? "Conversation"}</h2>
          <p className="text-muted-foreground flex items-center gap-1 text-xs">
            {t.client_name} · {internal ? <><Lock className="size-3" aria-hidden /> Internal: staff only</> : "Shared with the client"}
          </p>
        </div>
      </header>
      <ol className="flex-1 space-y-3 overflow-y-auto p-5" aria-label="Messages">
        {t.items.map((m) => (
          <li key={m.id} className={cn("flex", m.from_client ? "justify-start" : "justify-end")}>
            <div className={cn("max-w-[85%] rounded-xl px-4 py-2.5 text-sm", m.from_client ? "bg-muted" : internal ? "bg-amber-50 text-amber-950 dark:bg-amber-950/40 dark:text-amber-50" : "bg-primary text-primary-foreground")}>
              <p className="text-xs font-medium opacity-80">{m.author ?? "Former user"}{m.from_client ? " · client" : ""}</p>
              <p className="mt-0.5 whitespace-pre-wrap break-words">{m.body}</p>
              <p className="mt-1 text-[11px] opacity-70">{formatDate(m.created_at, true)}</p>
            </div>
          </li>
        ))}
      </ol>
      <form onSubmit={send} className="border-t p-4" noValidate>
        <label htmlFor="reply" className="sr-only">Reply</label>
        <Textarea id="reply" rows={3} value={body} onChange={(e) => setBody(e.target.value)} placeholder={internal ? "Add an internal note…" : "Reply to the client…"} aria-invalid={!!err} />
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className="text-destructive text-xs">{err}</p>
          <SubmitButton size="sm" pending={reply.isPending}><Send className="size-4" /> {internal ? "Post note" : "Send reply"}</SubmitButton>
        </div>
      </form>
    </div>
  );
}

export function StaffMessages({ portal }: { portal: StaffPortal }) {
  const clients = useStaffClientOptions(portal);
  const [visibility, setVisibility] = useState<ThreadVisibility>("client");
  const [clientId, setClientId] = useState<string>();
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<number | null>(null);
  const [composing, setComposing] = useState(false);
  const threads = useThreads(portal, { visibility, client_id: clientId, page });
  const data = threads.data;

  return (
    <>
      <PageHeader
        title="Messages"
        description="Conversations with clients, and internal discussion about them."
        actions={<Button onClick={() => setComposing(true)}><MessageSquarePlus className="size-4" /> New conversation</Button>}
      />
      <div className="bg-card grid min-h-[32rem] overflow-hidden rounded-xl border shadow-xs lg:grid-cols-[22rem_1fr]">
        <aside className={cn("flex min-h-0 flex-col border-r", selected !== null && "hidden lg:flex")}>
          <div className="space-y-3 border-b p-3">
            <div role="tablist" aria-label="Conversation type" className="bg-muted grid grid-cols-2 rounded-lg p-1 text-sm">
              {(["client", "internal"] as const).map((v) => (
                <button
                  key={v}
                  role="tab"
                  type="button"
                  aria-selected={visibility === v}
                  onClick={() => { setVisibility(v); setPage(1); setSelected(null); }}
                  className={cn("rounded-md px-3 py-1.5 font-medium", visibility === v ? "bg-card shadow-xs" : "text-muted-foreground")}
                >
                  {v === "client" ? "Client" : "Internal"}
                </button>
              ))}
            </div>
            <FilterSelect allLabel="All clients" value={clientId} onChange={(v) => { setClientId(v); setPage(1); }} options={clients.data ?? []} className="w-full" />
          </div>
          {threads.error ? (
            <ErrorState error={threads.error} onRetry={() => void threads.refetch()} />
          ) : threads.isLoading ? (
            <div className="space-y-2 p-4"><Skeleton className="h-14 w-full" /><Skeleton className="h-14 w-full" /></div>
          ) : !data?.items.length ? (
            <EmptyState title={visibility === "client" ? "No client conversations" : "No internal discussions"} description="Start one with New conversation." />
          ) : (
            <>
              <ul className="flex-1 overflow-y-auto">
                {data.items.map((t) => <ThreadListItem key={t.id} thread={t} active={t.id === selected} onSelect={() => setSelected(t.id)} />)}
              </ul>
              {data.total > data.pageSize && (
                <div className="flex justify-between border-t p-2">
                  <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
                  <Button variant="ghost" size="sm" disabled={page * data.pageSize >= data.total} onClick={() => setPage(page + 1)}>Next</Button>
                </div>
              )}
            </>
          )}
        </aside>
        <div className={cn("min-h-0", selected === null && "hidden lg:block")}>
          {selected !== null ? (
            <Conversation key={selected} portal={portal} threadId={selected} onBack={() => setSelected(null)} />
          ) : (
            <EmptyState title="Choose a conversation" description="Pick one on the left, or start a new one." className="h-full" />
          )}
        </div>
      </div>
      <NewThreadDialog portal={portal} visibility={visibility} open={composing} onOpenChange={setComposing} onCreated={(id) => setSelected(id)} />
    </>
  );
}
