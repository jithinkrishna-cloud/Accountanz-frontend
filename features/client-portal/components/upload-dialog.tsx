"use client";

import { useState } from "react";
import { toast } from "sonner";
import { FormField } from "@/components/shared/form-field";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORY_LABELS, DOCUMENT_CATEGORIES, type DocumentCategory } from "@/features/documents/types/document.types";
import { applyApiError } from "@/lib/form-errors";
import { useUpload } from "../hooks/use-client-portal";
import type { PortalRequest } from "../types/client-portal.types";

const MAX_MB = 20;
const ACCEPT = ".pdf,.png,.jpg,.jpeg,.xls,.xlsx,.csv,.doc,.docx,.zip";

/** Requests don't carry a category, so suggest one from what was asked for (the client can still change it). */
const CATEGORY_HINTS: [RegExp, DocumentCategory][] = [
  [/bank|statement|passbook/i, "bank_statement"],
  [/sales|invoice|bill to|outward/i, "sales_invoice"],
  [/purchase|vendor|supplier|inward/i, "purchase_bill"],
  [/receipt|payment proof|voucher/i, "receipt"],
  [/gst|gstr|tax return/i, "gst"],
];
export const suggestCategory = (description: string | undefined): DocumentCategory =>
  (description && CATEGORY_HINTS.find(([re]) => re.test(description))?.[1]) || "other";

/**
 * Fresh state every time the dialog opens (it is mounted only while open). Without a request, several files can be
 * chosen at once and go into `folder` (null = top level). Files upload one after another; failures are reported by name.
 */
function UploadForm({ request, folder, onDone }: { request?: PortalRequest | null; folder?: { id: number; path: string } | null; onDone: () => void }) {
  const upload = useUpload();
  const [files, setFiles] = useState<File[]>([]);
  const [category, setCategory] = useState<string>(suggestCategory(request?.description));
  const [period, setPeriod] = useState(request?.period ?? "");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const multiple = !request;

  const submit = async () => {
    if (!files.length) return setError(multiple ? "Choose at least one file" : "Choose a file to upload");
    const tooBig = files.filter((f) => f.size > MAX_MB * 1024 * 1024);
    if (tooBig.length) return setError(`Each file must be ${MAX_MB} MB or smaller (${tooBig.map((f) => f.name).join(", ")})`);
    const failed: string[] = [];
    let fulfilled = false;
    setProgress({ done: 0, total: files.length });
    for (const [i, file] of files.entries()) {
      try {
        const r = await upload.mutateAsync({ file, meta: { category, period: period || undefined, request_id: request?.id, folder_id: folder?.id ?? null } });
        fulfilled ||= !!r.fulfilled_request;
      } catch (err) {
        failed.push(`${file.name}: ${applyApiError(err)}`);
      }
      setProgress({ done: i + 1, total: files.length });
    }
    setProgress(null);
    const ok = files.length - failed.length;
    if (failed.length) {
      setError(failed.join(" · "));
      setFiles((fs) => fs.filter((f) => failed.some((x) => x.startsWith(`${f.name}:`))));
      if (ok) toast.success(`${ok} file${ok === 1 ? "" : "s"} uploaded`);
      return;
    }
    toast.success(fulfilled ? "Uploaded. Your team has been told the request is done." : ok === 1 ? "Uploaded" : `${ok} files uploaded`);
    onDone();
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{request ? "Send the requested document" : multiple ? "Upload files" : "Upload a document"}</DialogTitle>
        <DialogDescription>
          {request ? request.description : <>Into <span className="text-foreground font-medium">{folder ? `Documents / ${folder.path}` : "Documents"}</span>. Only you and your accounting team can open them.</>}
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4">
        <FormField id="file" label={multiple ? "Files" : "File"} error={error ?? undefined} hint={`PDF, image, Excel, Word, CSV or ZIP, up to ${MAX_MB} MB each.${multiple ? " You can pick several." : ""}`}>
          <Input id="file" type="file" accept={ACCEPT} multiple={multiple} onChange={(e) => { setFiles([...(e.target.files ?? [])]); setError(null); }} />
        </FormField>
        {files.length > 1 && <p className="text-muted-foreground -mt-2 text-xs">{files.length} files selected</p>}
        {progress && <p className="text-sm" role="status">Uploading {progress.done + (progress.done < progress.total ? 1 : 0)} of {progress.total}…</p>}
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

/** Upload files into a folder, or one file against an open document request (which marks it fulfilled). */
export function UploadDialog({ open, onOpenChange, request, folder }: { open: boolean; onOpenChange: (o: boolean) => void; request?: PortalRequest | null; folder?: { id: number; path: string } | null }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">{open && <UploadForm key={request?.id ?? "free"} request={request} folder={folder} onDone={() => onOpenChange(false)} />}</DialogContent>
    </Dialog>
  );
}
