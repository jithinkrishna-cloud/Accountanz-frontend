"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { FormField } from "@/components/shared/form-field";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ClientPicker } from "@/features/workspace/components/client-picker";
import { applyApiError } from "@/lib/form-errors";
import type { StaffPortal } from "@/types/auth";
import { useCreateRequest, useUploadDocument } from "../hooks/use-documents";
import { CATEGORY_LABELS, DOCUMENT_CATEGORIES, type DocumentCategory } from "../types/document.types";

const thisMonth = () => new Date().toISOString().slice(0, 7);

const requestSchema = z.object({
  client_id: z.string().min(1, "Choose a client"),
  description: z.string().trim().min(3, "Describe what you need").max(500),
  period: z.string(),
  due_date: z.string(),
});
type RequestValues = z.infer<typeof requestSchema>;

function RequestForm({ portal, clientId, onDone }: { portal: StaffPortal; clientId?: number; onDone: () => void }) {
  const create = useCreateRequest(portal);
  const { register, control, handleSubmit, setError, formState: { errors } } = useForm<RequestValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: { client_id: clientId ? String(clientId) : "", description: "", period: thisMonth(), due_date: "" },
  });
  const onSubmit = handleSubmit(async (v) => {
    try {
      await create.mutateAsync({ client_id: Number(v.client_id), description: v.description, period: v.period || null, due_date: v.due_date || null });
      toast.success("Request sent. The client has been emailed.");
      onDone();
    } catch (err) {
      applyApiError(err, setError, ["client_id", "description", "period", "due_date"]);
    }
  });
  return (
    <>
      <DialogHeader>
        <DialogTitle>Request documents</DialogTitle>
        <DialogDescription>The client sees this under Document Requests and is emailed. Uploading against it marks it done.</DialogDescription>
      </DialogHeader>
      <form id="request-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
        {!clientId && (
          <FormField id="req-client" label="Client" error={errors.client_id?.message} className="sm:col-span-2">
            <Controller control={control} name="client_id" render={({ field }) => <ClientPicker portal={portal} id="req-client" value={field.value} onChange={field.onChange} invalid={!!errors.client_id} />} />
          </FormField>
        )}
        <FormField id="req-description" label="What do you need?" error={errors.description?.message} className="sm:col-span-2">
          <Textarea id="req-description" rows={3} placeholder="Bank statements for all current accounts" aria-invalid={!!errors.description} {...register("description")} />
        </FormField>
        <FormField id="req-period" label="Period" hint="Optional" error={errors.period?.message}>
          <Input id="req-period" type="month" {...register("period")} />
        </FormField>
        <FormField id="req-due" label="Needed by" hint="Optional" error={errors.due_date?.message}>
          <Input id="req-due" type="date" {...register("due_date")} />
        </FormField>
      </form>
      <DialogFooter>
        <Button variant="outline" onClick={onDone}>Cancel</Button>
        <SubmitButton form="request-form" pending={create.isPending}>Send request</SubmitButton>
      </DialogFooter>
    </>
  );
}

export function RequestDocumentsDialog({ portal, clientId, open, onOpenChange }: { portal: StaffPortal; clientId?: number; open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">{open && <RequestForm portal={portal} clientId={clientId} onDone={() => onOpenChange(false)} />}</DialogContent>
    </Dialog>
  );
}

const ACCEPT = ".pdf,.png,.jpg,.jpeg,.xls,.xlsx,.csv,.doc,.docx,.zip";

function UploadForm({ portal, clientId, onDone }: { portal: StaffPortal; clientId?: number; onDone: () => void }) {
  const upload = useUploadDocument(portal);
  const [client, setClient] = useState(clientId ? String(clientId) : "");
  const [category, setCategory] = useState<DocumentCategory>("other");
  const [period, setPeriod] = useState(thisMonth());
  const [file, setFile] = useState<File | null>(null);
  const [error, setErrorText] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!client) return setErrorText("Choose a client");
    if (!file) return setErrorText("Choose a file");
    try {
      await upload.mutateAsync({ file, client_id: Number(client), category, period: period || undefined });
      toast.success(`${file.name} added`);
      onDone();
    } catch (err) {
      setErrorText(applyApiError(err));
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Upload a document</DialogTitle>
        <DialogDescription>For files the client sent another way, such as by email or WhatsApp. Up to 20 MB.</DialogDescription>
      </DialogHeader>
      <form id="upload-form" onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        {!clientId && (
          <FormField id="up-client" label="Client" className="sm:col-span-2">
            <ClientPicker portal={portal} id="up-client" value={client} onChange={setClient} />
          </FormField>
        )}
        <FormField id="up-category" label="Category">
          <Select value={category} onValueChange={(v) => setCategory(v as DocumentCategory)}>
            <SelectTrigger id="up-category" className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>{DOCUMENT_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>)}</SelectContent>
          </Select>
        </FormField>
        <FormField id="up-period" label="Period">
          <Input id="up-period" type="month" value={period} onChange={(e) => setPeriod(e.target.value)} />
        </FormField>
        <FormField id="up-file" label="File" error={error ?? undefined} className="sm:col-span-2">
          <Input id="up-file" type="file" accept={ACCEPT} onChange={(e) => { setFile(e.target.files?.[0] ?? null); setErrorText(null); }} />
        </FormField>
      </form>
      <DialogFooter>
        <Button variant="outline" onClick={onDone}>Cancel</Button>
        <SubmitButton form="upload-form" pending={upload.isPending}>Upload</SubmitButton>
      </DialogFooter>
    </>
  );
}

export function UploadDocumentDialog({ portal, clientId, open, onOpenChange }: { portal: StaffPortal; clientId?: number; open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">{open && <UploadForm portal={portal} clientId={clientId} onDone={() => onOpenChange(false)} />}</DialogContent>
    </Dialog>
  );
}
