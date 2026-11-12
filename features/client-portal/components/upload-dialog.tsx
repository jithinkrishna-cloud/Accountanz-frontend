"use client";

import { useState } from "react";
import { toast } from "sonner";
import { FormField } from "@/components/shared/form-field";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORY_LABELS, DOCUMENT_CATEGORIES } from "@/features/documents/types/document.types";
import { applyApiError } from "@/lib/form-errors";
import { useUpload } from "../hooks/use-client-portal";
import type { PortalRequest } from "../types/client-portal.types";

const MAX_MB = 20;
const ACCEPT = ".pdf,.png,.jpg,.jpeg,.xls,.xlsx,.csv,.doc,.docx,.zip";

/** Fresh state every time the dialog opens (it is mounted only while open). */
function UploadForm({ request, onDone }: { request?: PortalRequest | null; onDone: () => void }) {
  const upload = useUpload();
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState("other");
  const [period, setPeriod] = useState(request?.period ?? "");
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!file) return setError("Choose a file to upload");
    if (file.size > MAX_MB * 1024 * 1024) return setError(`The file must be ${MAX_MB} MB or smaller`);
    try {
      const r = await upload.mutateAsync({ file, meta: { category, period: period || undefined, request_id: request?.id } });
      toast.success(r.fulfilled_request ? "Uploaded. Your team has been told the request is done." : "Uploaded");
      onDone();
    } catch (err) {
      setError(applyApiError(err));
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{request ? "Send the requested document" : "Upload a document"}</DialogTitle>
        <DialogDescription>{request ? request.description : "Files are stored privately; only you and your accounting team can open them."}</DialogDescription>
      </DialogHeader>
      <div className="grid gap-4">
        <FormField id="file" label="File" error={error ?? undefined} hint={`PDF, image, Excel, Word, CSV or ZIP, up to ${MAX_MB} MB.`}>
          <Input id="file" type="file" accept={ACCEPT} onChange={(e) => { setFile(e.target.files?.[0] ?? null); setError(null); }} />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="category" label="Category">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="category" className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>{DOCUMENT_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>)}</SelectContent>
            </Select>
          </FormField>
          <FormField id="period" label="Period (optional)">
            <Input id="period" type="month" value={period} onChange={(e) => setPeriod(e.target.value)} />
          </FormField>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onDone}>Cancel</Button>
        <SubmitButton type="button" pending={upload.isPending} onClick={() => void submit()}>Upload</SubmitButton>
      </DialogFooter>
    </>
  );
}

/** Upload a file, optionally against an open document request (which marks it fulfilled). */
export function UploadDialog({ open, onOpenChange, request }: { open: boolean; onOpenChange: (o: boolean) => void; request?: PortalRequest | null }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">{open && <UploadForm key={request?.id ?? "free"} request={request} onDone={() => onOpenChange(false)} />}</DialogContent>
    </Dialog>
  );
}
