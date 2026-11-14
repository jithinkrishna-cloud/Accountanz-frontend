"use client";

import { MessageSquarePlus, Send } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { FormField } from "@/components/shared/form-field";
import { MentionText, MentionTextarea, mentionIdsIn, type MentionPerson } from "@/components/shared/mention-textarea";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/features/auth/hooks/use-session";
import { applyApiError } from "@/lib/form-errors";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { usePortalMentionable, usePortalThread, usePortalThreads, useReply, useStartThread } from "../hooks/use-client-portal";
import { CompanyGate } from "./company-gate";

/** Opening values for a new message, e.g. from "Message Arun" on a job (?to=<user id>&subject=…). */
interface Draft {
  subject: string;
  body: string;
}

function NewThreadDialog({ draft, people, onClose, onCreated }: { draft: Draft; people: MentionPerson[]; onClose: () => void; onCreated: (id: number) => void }) {
  const start = useStartThread();
  const [subject, setSubject] = useState(draft.subject);
  const [body, setBody] = useState(draft.body);
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    if (subject.trim().length < 2) return setError("Add a subject");
    if (!body.trim()) return setError("Write a message");
    try {
      const mentions = mentionIdsIn(body, people);
      const t = await start.mutateAsync({ subject, body, mentions });
      toast.success(mentions.length ? "Message sent. The people you mentioned have been emailed." : "Message sent to your accounting team");
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
          <DialogDescription>Your whole accounting team can see it. Type @ to mention someone so they&apos;re notified directly.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <FormField id="subject" label="Subject"><Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} /></FormField>
          <FormField id="body" label="Message" error={error ?? undefined}>
            <MentionTextarea id="body" rows={5} value={body} onChange={setBody} people={people} autoFocus={!!draft.body} />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <SubmitButton type="button" pending={start.isPending} onClick={() => void submit()}>Send</SubmitButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Conversation({ id, people }: { id: number; people: MentionPerson[] }) {
  const { data, isLoading, error, refetch } = usePortalThread(id);
  const reply = useReply(id);
  const [body, setBody] = useState("");
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;
  if (isLoading || !data) return <div className="space-y-3 p-5"><Skeleton className="h-16 w-2/3" /><Skeleton className="ml-auto h-16 w-2/3" /></div>;
  const send = async () => {
    if (!body.trim()) return;
    try {
      await reply.mutateAsync({ body, mentions: mentionIdsIn(body, people) });
      setBody("");
    } catch (err) {
      applyApiError(err);
    }
  };
  return (
    <div className="flex h-full min-h-0 flex-col">
      <h2 className="border-b px-5 py-4 font-medium">{data.subject ?? "Conversation"}</h2>
      <ol className="flex-1 space-y-3 overflow-y-auto p-5">
        {data.messages.map((m) => (
          <li key={m.id} className={cn("max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm", m.from_client ? "bg-primary text-primary-foreground ml-auto" : "bg-muted")}>
            <p className="whitespace-pre-line"><MentionText body={m.body} mentions={m.mentions} onDark={m.from_client} /></p>
            <p className={cn("mt-1 text-[11px]", m.from_client ? "text-primary-foreground/80" : "text-muted-foreground")}>{m.author ?? "—"} · {formatDate(m.created_at, true)}</p>
          </li>
        ))}
      </ol>
      <form className="flex items-end gap-2 border-t p-3" onSubmit={(e) => { e.preventDefault(); void send(); }}>
        <div className="flex-1">
          <MentionTextarea aria-label="Reply" placeholder="Write a reply… (type @ to mention someone)" rows={1} className="min-h-10 resize-none" value={body} onChange={setBody} people={people} onSubmit={() => void send()} />
        </div>
        <SubmitButton pending={reply.isPending} disabled={!body.trim()} aria-label="Send"><Send className="size-4" /></SubmitButton>
      </form>
    </div>
  );
}

function MessagesBody() {
  const threads = usePortalThreads();
  const mentionable = usePortalMentionable();
  const { data: me } = useSession();
  const people = mentionable.data ?? [];
  const params = useSearchParams();
  const router = useRouter();
  const [openId, setOpenId] = useState<number | null>(null);
  const [typedDraft, setTypedDraft] = useState<Draft | null>(null);
  const [linkDraftClosed, setLinkDraftClosed] = useState(false);
  const selected = openId ?? threads.data?.[0]?.id ?? null;

  // "Message Arun" from a job or the team page (?to=&subject=): a new message already addressed to that person.
  const to = params.get("to");
  const subject = params.get("subject");
  const toPerson = to ? people.find((p) => String(p.user_id) === to) : undefined;
  const linkDraft: Draft | null =
    !linkDraftClosed && (to || subject) && (!to || mentionable.data) ? { subject: subject ?? "", body: toPerson ? `@${toPerson.full_name} ` : "" } : null;
  const draft = typedDraft ?? linkDraft;
  const setDraft = setTypedDraft;
  const closeDraft = () => {
    setTypedDraft(null);
    if (linkDraft) {
      setLinkDraftClosed(true);
      router.replace("/app/messages");
    }
  };

  return (
    <>
      <PageHeader
        title="Messages"
        description="Talk to your accounting team. Everyone on your team sees each conversation; @mention someone to notify them directly."
        actions={<Button onClick={() => setDraft({ subject: "", body: "" })}><MessageSquarePlus className="size-4" /> New message</Button>}
      />
      {threads.error ? (
        <ErrorState error={threads.error} onRetry={() => void threads.refetch()} />
      ) : threads.isLoading ? (
        <Skeleton className="h-80 w-full rounded-xl" />
      ) : !threads.data?.length ? (
        <div className="bg-card rounded-xl border"><EmptyState title="No messages yet" description="Ask your team a question or share an update." action={<Button size="sm" onClick={() => setDraft({ subject: "", body: "" })}>New message</Button>} /></div>
      ) : (
        <div className="bg-card grid min-h-[28rem] overflow-hidden rounded-xl border shadow-xs md:grid-cols-[18rem_1fr]">
          <ul className="divide-y border-b md:border-r md:border-b-0" aria-label="Conversations">
            {threads.data.map((t) => (
              <li key={t.id}>
                <button type="button" onClick={() => setOpenId(t.id)} aria-current={t.id === selected} className={cn("w-full px-4 py-3 text-left", t.id === selected ? "bg-accent" : "hover:bg-muted")}>
                  <p className="truncate text-sm font-medium">{t.subject ?? "Conversation"}</p>
                  <p className="text-muted-foreground truncate text-xs">{t.last_author_id && t.last_author_id === me?.id ? "You: " : t.last_author ? `${t.last_author}: ` : ""}{t.last_body}</p>
                  <p className="text-muted-foreground text-[11px]">{formatDate(t.last_at ?? t.created_at, true)}</p>
                </button>
              </li>
            ))}
          </ul>
          {selected && <Conversation key={selected} id={selected} people={people} />}
        </div>
      )}
      {draft && <NewThreadDialog draft={draft} people={people} onClose={closeDraft} onCreated={setOpenId} />}
    </>
  );
}

export function ClientMessages() {
  return <CompanyGate>{() => <MessagesBody />}</CompanyGate>;
}
