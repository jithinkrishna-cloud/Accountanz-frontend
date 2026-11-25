"use client";

import { FileText, FolderOpen, Search, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { FormField } from "@/components/shared/form-field";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { CATEGORY_LABELS, DOCUMENT_CATEGORIES, type DocumentCategory } from "@/features/documents/types/document.types";
import { applyApiError } from "@/lib/form-errors";
import { cn } from "@/lib/utils";
import { useAttachToRequest, usePortalDocuments, usePortalFolders, useUpload } from "../hooks/use-client-portal";
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
function UploadForm({ request, folder, onDone, belowHeader }: { request?: PortalRequest | null; folder?: { id: number; path: string } | null; onDone: () => void; belowHeader?: React.ReactNode }) {
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
      {belowHeader}
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

/** A request can be answered with a new upload or a file the client already has in the Document Centre. */
function ModeSwitch({ mode, onChange }: { mode: "upload" | "existing"; onChange: (m: "upload" | "existing") => void }) {
  return (
    <div role="tablist" aria-label="How to send it" className="bg-muted grid grid-cols-2 rounded-lg p-1">
      {(["upload", "existing"] as const).map((m) => (
        <button
          key={m}
          type="button"
          role="tab"
          aria-selected={mode === m}
          onClick={() => onChange(m)}
          className={cn("inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium", mode === m ? "bg-card shadow-xs" : "text-muted-foreground hover:text-foreground")}
        >
          {m === "upload" ? <><Upload className="size-4" aria-hidden /> Upload a new file</> : <><FolderOpen className="size-4" aria-hidden /> From Document Centre</>}
        </button>
      ))}
    </div>
  );
}

/** Pick a file already uploaded (any folder) and send it for the request. */
function ExistingFileForm({ request, onDone, belowHeader }: { request: PortalRequest; onDone: () => void; belowHeader: React.ReactNode }) {
  const docs = usePortalDocuments();
  const folders = usePortalFolders();
  const attach = useAttachToRequest();
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const byId = new Map((folders.data ?? []).map((f) => [f.id, f]));
  const pathOf = (id: number | null) => {
    const names: string[] = [];
    for (let f = id ? byId.get(id) : undefined; f && names.length < 500; f = f.parent_id ? byId.get(f.parent_id) : undefined) names.unshift(f.name);
    return names.length ? `Documents / ${names.join(" / ")}` : "Documents";
  };
  const search = q.trim().toLowerCase();
  const rows = (docs.data ?? []).filter((d) => !search || d.file_name.toLowerCase().includes(search) || pathOf(d.folder_id).toLowerCase().includes(search));

  const submit = async () => {
    if (picked === null) return setError("Pick a file");
    try {
      await attach.mutateAsync({ requestId: request.id, documentId: picked });
      toast.success("Sent. Your team has been told the request is done.");
      onDone();
    } catch (err) {
      setError(applyApiError(err));
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Send the requested document</DialogTitle>
        <DialogDescription>{request.description}</DialogDescription>
      </DialogHeader>
      {belowHeader}
      <div className="grid gap-3">
        <div className="relative">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" aria-hidden />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search your files" className="pl-8" aria-label="Search your files" />
        </div>
        {docs.isLoading || folders.isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : rows.length === 0 ? (
          <p className="text-muted-foreground rounded-lg border px-3 py-6 text-center text-sm">{search ? "No file matches." : "You haven't uploaded any files yet."}</p>
        ) : (
          <div role="radiogroup" aria-label="Your files" className="max-h-64 overflow-y-auto rounded-lg border p-1">
            {rows.map((d) => (
              <button
                key={d.id}
                type="button"
                role="radio"
                aria-checked={picked === d.id}
                onClick={() => { setPicked(d.id); setError(null); }}
                className={cn("flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left", picked === d.id ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
              >
                <FileText className="size-4 shrink-0" aria-hidden />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{d.file_name}</span>
                  <span className={cn("block truncate text-xs", picked === d.id ? "text-primary-foreground/75" : "text-muted-foreground")}>{pathOf(d.folder_id)}</span>
                </span>
              </button>
            ))}
          </div>
        )}
        {error && <p role="alert" className="text-destructive text-xs">{error}</p>}
        <p className="text-muted-foreground text-xs">
          {request.requested_by ?? "Your team"} will be able to open this file, even if it&apos;s in a private folder. The rest of the folder stays private.
        </p>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onDone}>Cancel</Button>
        <SubmitButton type="button" pending={attach.isPending} onClick={() => void submit()}>Send file</SubmitButton>
      </DialogFooter>
    </>
  );
}

function RequestAnswer({ request, onDone }: { request: PortalRequest; onDone: () => void }) {
  const [mode, setMode] = useState<"upload" | "existing">("upload");
  const toggle = <ModeSwitch mode={mode} onChange={setMode} />;
  return mode === "upload" ? <UploadForm request={request} onDone={onDone} belowHeader={toggle} /> : <ExistingFileForm request={request} onDone={onDone} belowHeader={toggle} />;
}

/** Upload files into a folder, or answer an open document request (new upload or an existing file; marks it fulfilled). */
export function UploadDialog({ open, onOpenChange, request, folder }: { open: boolean; onOpenChange: (o: boolean) => void; request?: PortalRequest | null; folder?: { id: number; path: string } | null }) {
  const done = () => onOpenChange(false);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {open && (request ? <RequestAnswer key={request.id} request={request} onDone={done} /> : <UploadForm key="free" folder={folder} onDone={done} />)}
      </DialogContent>
    </Dialog>
  );
}
