"use client";

import { MessageSquarePlus, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { FormField } from "@/components/shared/form-field";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { applyApiError } from "@/lib/form-errors";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { usePortalThread, usePortalThreads, useReply, useStartThread } from "../hooks/use-client-portal";
import { CompanyGate } from "./company-gate";

function NewThreadDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (id: number) => void }) {
  const start = useStartThread();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    if (subject.trim().length < 2) return setError("Add a subject");
    if (!body.trim()) return setError("Write a message");
    try {
      const t = await start.mutateAsync({ subject, body });
      toast.success("Message sent to your accounting team");
      onCreated(t.id);
      onClose();
    } catch (err) {
      setError(applyApiError(err));
    }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New message</DialogTitle>
          <DialogDescription>Your accounting team is notified by email.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <FormField id="subject" label="Subject"><Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} /></FormField>
          <FormField id="body" label="Message" error={error ?? undefined}><Textarea id="body" rows={5} value={body} onChange={(e) => setBody(e.target.value)} /></FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <SubmitButton type="button" pending={start.isPending} onClick={() => void submit()}>Send</SubmitButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Conversation({ id }: { id: number }) {
  const { data, isLoading, error, refetch } = usePortalThread(id);
  const reply = useReply(id);
  const [body, setBody] = useState("");
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;
  if (isLoading || !data) return <div className="space-y-3 p-5"><Skeleton className="h-16 w-2/3" /><Skeleton className="ml-auto h-16 w-2/3" /></div>;
  const send = async () => {
    if (!body.trim()) return;
    try {
      await reply.mutateAsync(body);
      setBody("");
    } catch (err) {
      applyApiError(err);
    }
  };
  return (
    <div className="flex h-full flex-col">
      <h2 className="border-b px-5 py-4 font-medium">{data.subject ?? "Conversation"}</h2>
      <ol className="flex-1 space-y-3 overflow-y-auto p-5">
        {data.messages.map((m) => (
          <li key={m.id} className={cn("max-w-[85%] rounded-lg px-3.5 py-2.5 text-sm", m.from_client ? "bg-primary text-primary-foreground ml-auto" : "bg-muted")}>
            <p className="whitespace-pre-line">{m.body}</p>
            <p className={cn("mt-1 text-[11px]", m.from_client ? "text-primary-foreground/80" : "text-muted-foreground")}>{m.author ?? "—"} · {formatDate(m.created_at, true)}</p>
          </li>
        ))}
      </ol>
      <form className="flex gap-2 border-t p-3" onSubmit={(e) => { e.preventDefault(); void send(); }}>
        <Input aria-label="Reply" placeholder="Write a reply…" value={body} onChange={(e) => setBody(e.target.value)} />
        <SubmitButton pending={reply.isPending} disabled={!body.trim()} aria-label="Send"><Send className="size-4" /></SubmitButton>
      </form>
    </div>
  );
}

function MessagesBody() {
  const threads = usePortalThreads();
  const [openId, setOpenId] = useState<number | null>(null);
  const [composing, setComposing] = useState(false);
  const selected = openId ?? threads.data?.[0]?.id ?? null;
  return (
    <>
      <PageHeader title="Messages" description="Talk to your accounting team." actions={<Button onClick={() => setComposing(true)}><MessageSquarePlus className="size-4" /> New message</Button>} />
      {threads.error ? (
        <ErrorState error={threads.error} onRetry={() => void threads.refetch()} />
      ) : threads.isLoading ? (
        <Skeleton className="h-80 w-full rounded-xl" />
      ) : !threads.data?.length ? (
        <div className="bg-card rounded-xl border"><EmptyState title="No messages yet" description="Ask your team a question or share an update." action={<Button size="sm" onClick={() => setComposing(true)}>New message</Button>} /></div>
      ) : (
        <div className="bg-card grid min-h-[28rem] overflow-hidden rounded-xl border shadow-xs md:grid-cols-[18rem_1fr]">
          <ul className="divide-y border-b md:border-r md:border-b-0" aria-label="Conversations">
            {threads.data.map((t) => (
              <li key={t.id}>
                <button type="button" onClick={() => setOpenId(t.id)} aria-current={t.id === selected} className={cn("w-full px-4 py-3 text-left", t.id === selected ? "bg-accent" : "hover:bg-muted")}>
                  <p className="truncate text-sm font-medium">{t.subject ?? "Conversation"}</p>
                  <p className="text-muted-foreground truncate text-xs">{t.last_author ? `${t.last_author}: ` : ""}{t.last_body}</p>
                  <p className="text-muted-foreground text-[11px]">{formatDate(t.last_at ?? t.created_at, true)}</p>
                </button>
              </li>
            ))}
          </ul>
          {selected && <Conversation key={selected} id={selected} />}
        </div>
      )}
      {composing && <NewThreadDialog onClose={() => setComposing(false)} onCreated={setOpenId} />}
    </>
  );
}

export function ClientMessages() {
  return <CompanyGate>{() => <MessagesBody />}</CompanyGate>;
}
