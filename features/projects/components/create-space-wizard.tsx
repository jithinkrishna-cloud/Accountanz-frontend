"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Briefcase, Building2, Check, Columns3, ListTodo } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { FormField } from "@/components/shared/form-field";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { applyApiError } from "@/lib/form-errors";
import { useSession } from "@/features/auth/hooks/use-session";
import { useClientOptions, useClientSpace, useCreateSpace, useProvisionClientSpace } from "../hooks/use-projects";
import { projectService } from "../services/project-service";
import type { SpaceKind, Template } from "../types/project.types";

const TEMPLATES: { id: Template; name: string; blurb: string; icon: typeof Columns3; features: string[] }[] = [
  { id: "scrum", name: "Scrum", blurb: "Plan work in sprints with a backlog, then track it on the board.", icon: ListTodo, features: ["Board", "Backlog and sprints", "List", "Summary"] },
  { id: "kanban", name: "Kanban", blurb: "Keep work flowing on a board without sprints.", icon: Columns3, features: ["Board", "List", "Summary"] },
];

const schema = z.object({
  name: z.string().trim().min(2, "Enter a name").max(80),
  space_key: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z][A-Z0-9]{1,9}$/, "Use 2–10 letters or digits, starting with a letter"),
  client_id: z.string(),
  description: z.string().max(1000),
});
type Values = z.infer<typeof schema>;

/** "Finance Ops Team" → "FOT"; a single word → its first 3 letters. */
export function suggestKey(name: string) {
  const words = name.toUpperCase().replace(/[^A-Z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
  if (!words.length) return "";
  const key = words.length === 1 ? words[0].slice(0, 3) : words.map((w) => w[0]).join("").slice(0, 10);
  return /^[A-Z]/.test(key) ? key : `P${key}`.slice(0, 10);
}

type Purpose = Exclude<SpaceKind, "client_primary">;
type Clients = { id: number; name: string }[] | undefined;

function ClientPicker({ id, value, onChange, clients }: { id: string; value: string; onChange: (v: string) => void; clients: Clients }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue placeholder="Pick a client" />
      </SelectTrigger>
      <SelectContent>
        {clients?.map((c) => (
          <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

const NO_ACCESS = "You don't have access to this client workspace. Contact an Ops Admin to request access.";

/** The client's primary space and usage. Admins can provision a missing primary; staff only see Open or No access. */
function ClientSpacePanel({ clientId, isAdmin, onBlockedChange }: { clientId: number; isAdmin: boolean; onBlockedChange?: (blocked: boolean) => void }) {
  const info = useClientSpace(clientId);
  const provision = useProvisionClientSpace();
  const d = info.data;
  const atLimit = !!d?.usage && d.usage.limit !== null && d.usage.used >= d.usage.limit;
  const blocked = !d || !d.can_create_project || atLimit;
  useEffect(() => onBlockedChange?.(blocked), [blocked, onBlockedChange]);

  if (info.isLoading) return <p className="text-muted-foreground text-sm">Checking this client&apos;s workspace…</p>;
  if (info.isError || !d) {
    return <p className="text-muted-foreground text-sm">{isAdmin ? "Could not load this client's workspace." : NO_ACCESS}</p>;
  }
  const p = d.primary;
  return (
    <div className="bg-muted/50 grid gap-2 rounded-lg border p-4 text-sm">
      {p ? (
        p.accessible ? (
          <p>
            Primary space: {p.name} ({p.space_key}) ·{" "}
            <Link className="text-primary underline" href={`/projects/${p.space_key}/board`}>Open</Link>
          </p>
        ) : (
          <p>{NO_ACCESS}</p>
        )
      ) : isAdmin && !d.usage ? (
        <p className="text-destructive">This client has no active package</p>
      ) : isAdmin && d.can_provision_primary ? (
        <div className="flex items-center justify-between gap-3">
          <p>This client has no primary space yet.</p>
          <Button type="button" size="sm" disabled={provision.isPending} onClick={() => provision.mutate(clientId, { onError: (e) => applyApiError(e) })}>
            Create client space
          </Button>
        </div>
      ) : (
        <p className="text-muted-foreground">This client has no primary space.</p>
      )}
      {isAdmin && !d.usage && p && <p className="text-destructive">This client has no active package</p>}
      {isAdmin && d.usage && (
        <p className="text-muted-foreground">
          {d.usage.used} of {d.usage.limit ?? "Unlimited"} client spaces used
        </p>
      )}
      {isAdmin && atLimit && d.usage && (
        <p className="text-destructive">The {d.usage.package_name} package allows {d.usage.limit} client workspace{d.usage.limit === 1 ? "" : "s"}. Archive one or ask a Super admin for more room.</p>
      )}
    </div>
  );
}

function PurposeStep({ onPick }: { onPick: (k: Purpose) => void }) {
  const { data: me } = useSession();
  const isAdmin = me?.role === "super_admin" || me?.role === "ops_admin";
  const clients = useClientOptions();
  const [lookup, setLookup] = useState("");
  const options: { kind: Purpose; name: string; blurb: string; icon: typeof Columns3; disabled?: boolean }[] = [
    { kind: "internal", name: "Internal", blurb: "Work for your own team, not tied to a client.", icon: Briefcase },
    { kind: "client_project", name: "Client project", blurb: "Work for one client, linked to their workspace.", icon: Building2, disabled: !isAdmin },
  ];
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">What is this space for?</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {options.map((o) => (
          <button key={o.kind} type="button" disabled={o.disabled} onClick={() => onPick(o.kind)} className="bg-card hover:border-primary focus-visible:ring-ring flex flex-col items-start rounded-xl border p-5 text-left shadow-xs transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-border">
            <span className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-lg">
              <o.icon className="size-5" aria-hidden />
            </span>
            <p className="mt-4 font-semibold">{o.name}</p>
            <p className="text-muted-foreground mt-1 text-sm">{o.disabled ? "Ask an admin to create client spaces" : o.blurb}</p>
          </button>
        ))}
      </div>
      {me && !isAdmin && (
        <div className="mt-8 grid max-w-xl gap-3">
          <FormField id="lookup_client" label="Look up a client's space">
            <ClientPicker id="lookup_client" value={lookup} onChange={setLookup} clients={clients.data} />
          </FormField>
          {lookup && <ClientSpacePanel clientId={Number(lookup)} isAdmin={false} />}
        </div>
      )}
    </div>
  );
}

function TemplateStep({ onPick }: { onPick: (t: Template) => void }) {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">Create a space</h1>
      <p className="text-muted-foreground mt-1 text-sm">Pick how your team works. You can rename statuses and add people afterwards.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {TEMPLATES.map((t) => (
          <button key={t.id} type="button" onClick={() => onPick(t.id)} className="bg-card hover:border-primary focus-visible:ring-ring group flex flex-col items-start justify-start rounded-xl border p-5 text-left shadow-xs transition-colors focus-visible:ring-2 focus-visible:outline-none">
            <span className="bg-primary/10 text-primary flex size-10 items-center justify-center rounded-lg">
              <t.icon className="size-5" aria-hidden />
            </span>
            <p className="mt-4 font-semibold">{t.name}</p>
            <p className="text-muted-foreground mt-1 text-sm">{t.blurb}</p>
            <ul className="mt-4 space-y-1 text-sm">
              {t.features.map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <Check className="size-3.5 text-emerald-600" aria-hidden /> {f}
                </li>
              ))}
            </ul>
          </button>
        ))}
      </div>
    </div>
  );
}

function DetailsStep({ template, kind, onBack }: { template: Template; kind: Purpose; onBack: () => void }) {
  const router = useRouter();
  const create = useCreateSpace();
  const clients = useClientOptions();
  const [keyEdited, setKeyEdited] = useState(false);
  const [keyState, setKeyState] = useState<"idle" | "checking" | "free" | "taken">("idle");
  const { register, handleSubmit, setError, setValue, watch, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", space_key: "", client_id: "", description: "" },
  });
  const name = watch("name");
  const key = watch("space_key");
  const clientId = watch("client_id");
  const isClient = kind === "client_project";
  const [blocked, setBlocked] = useState(true);

  useEffect(() => {
    if (!keyEdited) setValue("space_key", suggestKey(name));
  }, [name, keyEdited, setValue]);

  useEffect(() => {
    const k = key.trim().toUpperCase();
    if (!/^[A-Z][A-Z0-9]{1,9}$/.test(k)) return setKeyState("idle");
    setKeyState("checking");
    const t = setTimeout(() => {
      projectService.keyAvailable(k).then((r) => setKeyState(r.available ? "free" : "taken")).catch(() => setKeyState("idle"));
    }, 300);
    return () => clearTimeout(t);
  }, [key]);

  const picked = TEMPLATES.find((t) => t.id === template)!;
  const onSubmit = handleSubmit(async (v) => {
    if (isClient && !v.client_id) return setError("client_id", { message: "Pick a client" });
    try {
      const space = await create.mutateAsync({
        name: v.name,
        space_key: v.space_key,
        template,
        kind,
        client_id: isClient ? Number(v.client_id) : null,
        description: v.description.trim() || null,
      });
      toast.success(`${space.name} created`);
      router.push(`/projects/${space.space_key}/board`);
    } catch (err) {
      applyApiError(err, setError, ["name", "space_key"]);
    }
  });

  return (
    <div className="mx-auto max-w-xl">
      <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2 mb-4">
        <ArrowLeft className="size-4" /> Back to templates
      </Button>
      <h1 className="text-2xl font-semibold tracking-tight">Name your space</h1>
      <p className="text-muted-foreground mt-1 text-sm">Required fields are marked with an asterisk.</p>
      <form onSubmit={onSubmit} className="mt-6 grid gap-5" noValidate>
        <FormField id="name" label="Name *" error={errors.name?.message}>
          <Input id="name" autoFocus placeholder="Try a team name, project goal or client project" aria-invalid={!!errors.name} {...register("name")} />
        </FormField>
        <FormField
          id="space_key"
          label="Key *"
          hint="Prefixes every work item, e.g. KEY-12. It can't be changed later."
          error={errors.space_key?.message ?? (keyState === "taken" ? "This key is already used by another space" : undefined)}
          aside={keyState === "free" ? <span className="text-xs text-emerald-600">Available</span> : keyState === "checking" ? <span className="text-muted-foreground text-xs">Checking…</span> : null}
        >
          <Input
            id="space_key"
            className="max-w-40 font-mono uppercase"
            maxLength={10}
            aria-invalid={!!errors.space_key || keyState === "taken"}
            {...register("space_key", { onChange: () => setKeyEdited(true) })}
          />
        </FormField>
        {isClient && (
          <>
            <FormField id="client_id" label="Client *" error={errors.client_id?.message}>
              <ClientPicker id="client_id" value={clientId} onChange={(v) => setValue("client_id", v, { shouldValidate: true })} clients={clients.data} />
            </FormField>
            {clientId && <ClientSpacePanel clientId={Number(clientId)} isAdmin onBlockedChange={setBlocked} />}
          </>
        )}
        <FormField id="description" label="Description" error={errors.description?.message}>
          <Textarea id="description" rows={3} placeholder="What is this space for?" {...register("description")} />
        </FormField>
        <div className="bg-muted/50 flex items-start gap-3 rounded-lg border p-4">
          <picked.icon className="text-primary mt-0.5 size-5" aria-hidden />
          <div>
            <p className="text-sm font-medium">Template: {picked.name}</p>
            <p className="text-muted-foreground text-sm">{picked.blurb}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" asChild>
            <Link href="/projects">Cancel</Link>
          </Button>
          <SubmitButton pending={create.isPending} disabled={keyState === "taken" || (isClient && (!clientId || blocked))}>Create space</SubmitButton>
        </div>
      </form>
    </div>
  );
}

/** Create space: pick the purpose, then a template, then name, key and (for client projects) the client. */
export function CreateSpaceWizard() {
  const [kind, setKind] = useState<Purpose | null>(null);
  const [template, setTemplate] = useState<Template | null>(null);
  if (!kind) return <PurposeStep onPick={setKind} />;
  if (!template) return <TemplateStep onPick={setTemplate} />;
  return <DetailsStep template={template} kind={kind} onBack={() => setTemplate(null)} />;
}
