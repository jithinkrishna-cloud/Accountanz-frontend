"use client";

import { Download, FileQuestion, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { portalFileUrl } from "../services/client-portal-service";

type Preview =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "pdf" | "image"; url: string }
  | { kind: "text"; text: string; csv: boolean }
  | { kind: "none" };

const ext = (name: string) => name.split(".").pop()?.toLowerCase() ?? "";
const MAX_TEXT = 200_000;

/** Splits one CSV line, respecting quoted fields. Good enough for previews. */
function csvRow(line: string) {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted && c === '"' && line[i + 1] === '"') {
      cur += '"';
      i++;
    } else if (c === '"') {
      quoted = !quoted;
    } else if (c === "," && !quoted) {
      out.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

function CsvTable({ text }: { text: string }) {
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  const rows = lines.slice(0, 500).map(csvRow);
  const [head, ...body] = rows;
  return (
    <div className="h-full overflow-auto rounded-lg border">
      <table className="w-full text-sm">
        {head && (
          <thead className="bg-muted sticky top-0">
            <tr>{head.map((h, i) => <th key={i} className="border-b px-3 py-2 text-left font-medium whitespace-nowrap">{h}</th>)}</tr>
          </thead>
        )}
        <tbody>
          {body.map((r, i) => (
            <tr key={i} className="even:bg-muted/30">{r.map((c, j) => <td key={j} className="border-b px-3 py-1.5 whitespace-nowrap">{c}</td>)}</tr>
          ))}
        </tbody>
      </table>
      {lines.length > 500 && <p className="text-muted-foreground px-3 py-2 text-xs">Showing the first 500 rows of {lines.length}.</p>}
    </div>
  );
}

/**
 * Loads the file into memory and shows it, so nothing is downloaded just to look at it. The viewer body is keyed by
 * document, so each file starts from "loading".
 */
function usePreview({ id, file_name }: { id: number; file_name: string }) {
  const [preview, setPreview] = useState<Preview>({ kind: "loading" });
  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(portalFileUrl.view(id), { credentials: "same-origin" });
        if (!res.ok) throw new Error(res.status === 404 ? "This file isn't available any more." : "Couldn't load this file.");
        const type = (res.headers.get("content-type") ?? "").split(";")[0]!.trim().toLowerCase();
        const e = ext(file_name);
        const blob = await res.blob();
        if (cancelled) return;
        if (type === "application/pdf" || e === "pdf") {
          url = URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
          setPreview({ kind: "pdf", url });
        } else if (/^image\/(png|jpe?g|gif|webp)$/.test(type) || ["png", "jpg", "jpeg", "gif", "webp"].includes(e)) {
          url = URL.createObjectURL(blob);
          setPreview({ kind: "image", url });
        } else if (type.startsWith("text/") || ["csv", "txt", "json"].includes(e)) {
          const text = (await blob.text()).slice(0, MAX_TEXT);
          if (!cancelled) setPreview({ kind: "text", text, csv: e === "csv" || type === "text/csv" });
        } else {
          setPreview({ kind: "none" });
        }
      } catch (err) {
        if (!cancelled) setPreview({ kind: "error", message: err instanceof Error ? err.message : "Couldn't load this file." });
      }
    })();
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [id, file_name]);
  return preview;
}

function PreviewBody({ doc }: { doc: { id: number; file_name: string } }) {
  const preview = usePreview(doc);
  return (
        <div className="bg-muted/30 min-h-0 flex-1 overflow-hidden rounded-lg">
          {preview.kind === "loading" && (
            <div className="text-muted-foreground flex h-full items-center justify-center gap-2 text-sm"><Loader2 className="size-4 animate-spin" aria-hidden /> Loading preview…</div>
          )}
          {preview.kind === "error" && <div className="text-destructive flex h-full items-center justify-center text-sm" role="alert">{preview.message}</div>}
          {preview.kind === "pdf" && <iframe src={preview.url} title={doc?.file_name ?? "Document"} className="h-full w-full rounded-lg border-0 bg-white" />}
          {preview.kind === "image" && (
            <div className="flex h-full items-center justify-center overflow-auto p-4">
              {/* eslint-disable-next-line @next/next/no-img-element -- a local object URL, not an optimisable asset */}
              <img src={preview.url} alt={doc?.file_name ?? ""} className="max-h-full max-w-full object-contain" />
            </div>
          )}
          {preview.kind === "text" &&
            (preview.csv ? <CsvTable text={preview.text} /> : <pre className="h-full overflow-auto rounded-lg border bg-white p-4 text-sm whitespace-pre-wrap">{preview.text}</pre>)}
          {preview.kind === "none" && (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
              <FileQuestion className="text-muted-foreground size-10" aria-hidden />
              <p className="font-medium">No preview for this type of file</p>
              <p className="text-muted-foreground max-w-sm text-sm">Excel, Word and ZIP files can&apos;t be shown here. Download it to open it on your computer.</p>
            </div>
          )}
        </div>
  );
}

/** View a document inside the app: PDFs, images, CSV and text files show here; other types offer a download. */
export function DocumentViewer({ doc, onClose }: { doc: { id: number; file_name: string } | null; onClose: () => void }) {
  return (
    <Dialog open={!!doc} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex h-[90vh] max-w-[calc(100%-2rem)] flex-col gap-3 sm:max-w-5xl">
        <DialogHeader className="flex-row items-center gap-3 space-y-0 pr-8">
          <div className="min-w-0 flex-1">
            <DialogTitle className="truncate">{doc?.file_name}</DialogTitle>
            <DialogDescription className="sr-only">Preview of {doc?.file_name}</DialogDescription>
          </div>
          {doc && (
            <Button asChild size="sm" variant="outline">
              <a href={portalFileUrl.document(doc.id)} download={doc.file_name}><Download className="size-4" /> Download</a>
            </Button>
          )}
        </DialogHeader>
        {doc && <PreviewBody key={doc.id} doc={doc} />}
      </DialogContent>
    </Dialog>
  );
}
