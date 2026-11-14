"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Check, Columns3, ListTodo } from "lucide-react";
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
import { useClientOptions, useCreateSpace } from "../hooks/use-projects";
import { projectService } from "../services/project-service";
import type { Template } from "../types/project.types";

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

function DetailsStep({ template, onBack }: { template: Template; onBack: () => void }) {
  const router = useRouter();
  const create = useCreateSpace();
  const clients = useClientOptions();
  const [keyEdited, setKeyEdited] = useState(false);
  const [keyState, setKeyState] = useState<"idle" | "checking" | "free" | "taken">("idle");
  const { register, handleSubmit, setError, setValue, watch, formState: { errors } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", space_key: "", client_id: "none", description: "" },
  });
  const name = watch("name");
  const key = watch("space_key");
  const clientId = watch("client_id");

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
    try {
      const space = await create.mutateAsync({
        name: v.name,
        space_key: v.space_key,
        template,
        client_id: v.client_id === "none" ? null : Number(v.client_id),
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
        <FormField id="client_id" label="Client" hint="Optional. Link the space when the work is for one client.">
          <Select value={clientId} onValueChange={(v) => setValue("client_id", v)}>
            <SelectTrigger id="client_id" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No client</SelectItem>
              {clients.data?.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
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
          <SubmitButton pending={create.isPending} disabled={keyState === "taken"}>Create space</SubmitButton>
        </div>
      </form>
    </div>
  );
}

/** Create space: pick a template, then name, key, optional client. */
export function CreateSpaceWizard() {
  const [template, setTemplate] = useState<Template | null>(null);
  return template ? <DetailsStep template={template} onBack={() => setTemplate(null)} /> : <TemplateStep onPick={setTemplate} />;
}
