"use client";

import { ChevronRight, Download, FileText, Folder, FolderInput, FolderPlus, Home, MoreHorizontal, Pencil, Search, Trash2, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { FormField } from "@/components/shared/form-field";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { StatusBadge } from "@/components/shared/status-badge";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { CATEGORY_LABELS, type DocumentCategory } from "@/features/documents/types/document.types";
import { ApiError } from "@/lib/api-client";
import { formatDate, formatPeriod } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useFolderActions, usePortalDocuments, usePortalFolders } from "../hooks/use-client-portal";
import { portalFileUrl } from "../services/client-portal-service";
import type { PortalDocument, PortalFolder } from "../types/client-portal.types";
import { UploadDialog } from "./upload-dialog";

const DOC_STATUS_LABEL = { new: "Received", reviewed: "Reviewed", rejected: "Rejected" } as const;

const formatSize = (bytes: number | null) => {
  if (!bytes) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

/** Folder tree helpers over the flat list the API returns. */
function buildTree(folders: PortalFolder[]) {
  const byId = new Map(folders.map((f) => [f.id, f]));
  const chain = (id: number | null): PortalFolder[] => {
    const out: PortalFolder[] = [];
    for (let f = id ? byId.get(id) : undefined; f && out.length < 500; f = f.parent_id ? byId.get(f.parent_id) : undefined) out.unshift(f);
    return out;
  };
  const children = (id: number | null) => folders.filter((f) => f.parent_id === id).sort((a, b) => a.name.localeCompare(b.name));
  const path = (id: number | null) => chain(id).map((f) => f.name).join(" / ");
  /** Depth-first list for pickers: [folder, depth]. */
  const flat = (): [PortalFolder, number][] => {
    const out: [PortalFolder, number][] = [];
    const walk = (parent: number | null, depth: number) => {
      for (const f of children(parent)) {
        out.push([f, depth]);
        walk(f.id, depth + 1);
      }
    };
    walk(null, 0);
    return out;
  };
  return { byId, chain, children, path, flat };
}

// ───────────── Dialogs ─────────────

function FolderNameDialog({ mode, folder, parent, onClose }: { mode: "create" | "rename"; folder?: PortalFolder; parent: { id: number | null; path: string }; onClose: () => void }) {
  const { create, rename } = useFolderActions();
  const [name, setName] = useState(folder?.name ?? "");
  const [error, setError] = useState<string | null>(null);
  const pending = create.isPending || rename.isPending;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return setError("Enter a folder name");
    if (/[\\/]/.test(trimmed)) return setError("Folder names can't contain / or \\");
    try {
      if (mode === "create") await create.mutateAsync({ name: trimmed, parent_id: parent.id });
      else await rename.mutateAsync({ id: folder!.id, name: trimmed });
      toast.success(mode === "create" ? `Folder "${trimmed}" created` : "Folder renamed");
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? (err.fieldErrors.name?.[0] ?? err.message) : "Something went wrong");
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "New folder" : "Rename folder"}</DialogTitle>
          <DialogDescription>{mode === "create" ? <>Inside <span className="text-foreground font-medium">{parent.path ? `Documents / ${parent.path}` : "Documents"}</span></> : `Currently "${folder?.name}"`}</DialogDescription>
        </DialogHeader>
        <form id="folder-form" onSubmit={submit} noValidate>
          <FormField id="folder-name" label="Folder name" error={error ?? undefined}>
            <Input id="folder-name" autoFocus value={name} maxLength={100} placeholder="e.g. Bank statements" onChange={(e) => { setName(e.target.value); setError(null); }} aria-invalid={!!error} />
          </FormField>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <SubmitButton form="folder-form" pending={pending}>{mode === "create" ? "Create folder" : "Save"}</SubmitButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MoveDialog({ doc, tree, onClose }: { doc: PortalDocument; tree: ReturnType<typeof buildTree>; onClose: () => void }) {
  const { move } = useFolderActions();
  const [target, setTarget] = useState<number | null>(doc.folder_id);
  const options: { id: number | null; label: string; depth: number }[] = [{ id: null, label: "Documents (top level)", depth: 0 }, ...tree.flat().map(([f, d]) => ({ id: f.id, label: f.name, depth: d + 1 }))];

  const submit = async () => {
    try {
      await move.mutateAsync({ id: doc.id, folderId: target });
      toast.success(`Moved to ${target ? tree.path(target) : "Documents"}`);
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't move the file");
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Move file</DialogTitle>
          <DialogDescription className="truncate">{doc.file_name}</DialogDescription>
        </DialogHeader>
        <div role="radiogroup" aria-label="Destination folder" className="max-h-72 overflow-y-auto rounded-lg border p-1">
          {options.map((o) => (
            <button
              key={o.id ?? "root"}
              type="button"
              role="radio"
              aria-checked={target === o.id}
              onClick={() => setTarget(o.id)}
              className={cn("flex w-full items-center gap-2 rounded-md py-1.5 pr-2 text-left text-sm", target === o.id ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
              style={{ paddingLeft: `${8 + o.depth * 16}px` }}
            >
              {o.id === null ? <Home className="size-4 shrink-0" aria-hidden /> : <Folder className="size-4 shrink-0" aria-hidden />}
              <span className="truncate">{o.label}</span>
              {doc.folder_id === o.id && <span className={cn("ml-auto text-xs", target === o.id ? "text-primary-foreground/75" : "text-muted-foreground")}>current</span>}
            </button>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <SubmitButton type="button" pending={move.isPending} disabled={target === doc.folder_id} onClick={() => void submit()}>Move here</SubmitButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ───────────── Rows ─────────────

function FolderRow({ folder, count, onOpen, onRename, onDelete }: { folder: PortalFolder; count: { folders: number; files: number }; onOpen: () => void; onRename: () => void; onDelete: () => void }) {
  const summary = [count.folders && `${count.folders} folder${count.folders === 1 ? "" : "s"}`, count.files && `${count.files} file${count.files === 1 ? "" : "s"}`].filter(Boolean).join(", ") || "Empty";
  return (
    <li className="hover:bg-muted/40 flex items-center gap-3 px-5 py-2.5">
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <Folder className="size-5 shrink-0 fill-amber-100 text-amber-600" aria-hidden />
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">{folder.name}</span>
          <span className="text-muted-foreground block text-xs">{summary}</span>
        </span>
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8" aria-label={`Actions for folder ${folder.name}`}><MoreHorizontal className="size-4" /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={onOpen}><Folder className="size-4" /> Open</DropdownMenuItem>
          <DropdownMenuItem onSelect={onRename}><Pencil className="size-4" /> Rename</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={onDelete}><Trash2 className="size-4" /> Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}

function FileRow({ doc, path, onMove }: { doc: PortalDocument; path?: string; onMove: () => void }) {
  const size = formatSize(doc.size_bytes);
  return (
    <li className="flex items-center gap-3 px-5 py-2.5">
      <FileText className="text-muted-foreground size-5 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        <a href={portalFileUrl.document(doc.id)} target="_blank" rel="noopener" className="block truncate text-sm font-medium hover:underline">{doc.file_name}</a>
        <p className="text-muted-foreground truncate text-xs">
          {path !== undefined && <>{path ? `Documents / ${path}` : "Documents"} · </>}
          {CATEGORY_LABELS[doc.category as DocumentCategory] ?? doc.category}
          {doc.period ? ` · ${formatPeriod(doc.period)}` : ""} · {formatDate(doc.created_at)}
          {size ? ` · ${size}` : ""}
          {doc.uploaded_by ? ` · ${doc.uploaded_by}` : ""}
        </p>
        {doc.status === "rejected" && doc.review_note && <p className="text-destructive mt-0.5 text-xs">Rejected: {doc.review_note}</p>}
      </div>
      <StatusBadge status={doc.status === "new" ? "submitted" : doc.status} label={DOC_STATUS_LABEL[doc.status]} className="hidden sm:inline-flex" />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8" aria-label={`Actions for ${doc.file_name}`}><MoreHorizontal className="size-4" /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild><a href={portalFileUrl.document(doc.id)} target="_blank" rel="noopener"><Download className="size-4" /> Open / download</a></DropdownMenuItem>
          <DropdownMenuItem onSelect={onMove}><FolderInput className="size-4" /> Move to…</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}

// ───────────── Page ─────────────

export function DocumentExplorer() {
  const folders = usePortalFolders();
  const docs = usePortalDocuments();
  const { remove } = useFolderActions();
  const [current, setCurrent] = useState<number | null>(null);
  const [q, setQ] = useState("");
  const [uploading, setUploading] = useState(false);
  const [naming, setNaming] = useState<{ mode: "create" | "rename"; folder?: PortalFolder } | null>(null);
  const [moving, setMoving] = useState<PortalDocument | null>(null);

  const tree = buildTree(folders.data ?? []);
  // A folder deleted elsewhere: fall back to the top level.
  const here = current !== null && folders.data && !tree.byId.has(current) ? null : current;
  const crumbs = tree.chain(here);
  const herePath = tree.path(here);
  const allDocs = docs.data ?? [];
  const subfolders = tree.children(here);
  const files = allDocs.filter((d) => d.folder_id === here);
  const countIn = (id: number) => ({ folders: tree.children(id).length, files: allDocs.filter((d) => d.folder_id === id).length });
  const search = q.trim().toLowerCase();
  const found = search ? allDocs.filter((d) => d.file_name.toLowerCase().includes(search)) : [];
  const foundFolders = search ? (folders.data ?? []).filter((f) => f.name.toLowerCase().includes(search)) : [];

  const open = (id: number | null) => {
    setCurrent(id);
    setQ("");
  };

  const deleteFolder = async (f: PortalFolder) => {
    const inside = countIn(f.id);
    if (inside.folders || inside.files) {
      toast.error(`"${f.name}" isn't empty. Move or remove what's inside first.`);
      return;
    }
    if (!window.confirm(`Delete the folder "${f.name}"?`)) return;
    try {
      await remove.mutateAsync(f.id);
      toast.success("Folder deleted");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't delete the folder");
    }
  };

  const error = folders.error ?? docs.error;
  const loading = folders.isLoading || docs.isLoading;

  return (
    <>
      <PageHeader
        title="Document Centre"
        description="Everything you've shared with your accounting team. Organise it in folders any way you like."
        actions={
          <>
            <Button variant="outline" onClick={() => setNaming({ mode: "create" })}><FolderPlus className="size-4" /> New folder</Button>
            <Button onClick={() => setUploading(true)}><Upload className="size-4" /> Upload files</Button>
          </>
        }
      />

      <div className="bg-card rounded-xl border shadow-xs">
        <div className="flex flex-wrap items-center gap-3 border-b px-5 py-3">
          <nav aria-label="Folder path" className="flex min-w-0 flex-1 flex-wrap items-center gap-1 text-sm">
            <button type="button" onClick={() => open(null)} className={cn("inline-flex items-center gap-1.5 rounded px-1.5 py-0.5", here === null && !search ? "font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted")}>
              <Home className="size-4" aria-hidden /> Documents
            </button>
            {!search &&
              crumbs.map((f, i) => (
                <span key={f.id} className="inline-flex min-w-0 items-center gap-1">
                  <ChevronRight className="text-muted-foreground size-3.5 shrink-0" aria-hidden />
                  <button type="button" onClick={() => open(f.id)} aria-current={i === crumbs.length - 1 ? "page" : undefined} className={cn("truncate rounded px-1.5 py-0.5", i === crumbs.length - 1 ? "font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted")}>
                    {f.name}
                  </button>
                </span>
              ))}
            {search && (
              <span className="text-muted-foreground inline-flex items-center gap-1"><ChevronRight className="size-3.5" aria-hidden /> Search results</span>
            )}
          </nav>
          <div className="relative w-full sm:w-64">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" aria-hidden />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search all files and folders" className="pl-8" aria-label="Search documents" />
          </div>
        </div>

        {error ? (
          <ErrorState error={error} onRetry={() => { void folders.refetch(); void docs.refetch(); }} />
        ) : loading ? (
          <div className="space-y-2 p-5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : search ? (
          foundFolders.length + found.length === 0 ? (
            <EmptyState title="Nothing matches" description={`No file or folder called "${q.trim()}".`} />
          ) : (
            <ul className="divide-y">
              {foundFolders.map((f) => (
                <FolderRow key={`f${f.id}`} folder={{ ...f, name: tree.path(f.id) }} count={countIn(f.id)} onOpen={() => open(f.id)} onRename={() => setNaming({ mode: "rename", folder: f })} onDelete={() => void deleteFolder(f)} />
              ))}
              {found.map((d) => <FileRow key={d.id} doc={d} path={tree.path(d.folder_id)} onMove={() => setMoving(d)} />)}
            </ul>
          )
        ) : subfolders.length + files.length === 0 ? (
          <EmptyState
            title={here === null ? "No documents yet" : "This folder is empty"}
            description={here === null ? "Create folders to organise your files, then upload bank statements, bills and invoices." : "Upload files here or create a subfolder."}
          />
        ) : (
          <ul className="divide-y">
            {subfolders.map((f) => (
              <FolderRow key={`f${f.id}`} folder={f} count={countIn(f.id)} onOpen={() => open(f.id)} onRename={() => setNaming({ mode: "rename", folder: f })} onDelete={() => void deleteFolder(f)} />
            ))}
            {files.map((d) => <FileRow key={d.id} doc={d} onMove={() => setMoving(d)} />)}
          </ul>
        )}
        <p className="text-muted-foreground border-t px-5 py-2.5 text-xs">Stored privately: only you and your accounting team can open these files.</p>
      </div>

      <UploadDialog open={uploading} onOpenChange={setUploading} folder={here === null ? null : { id: here, path: herePath }} />
      {naming && <FolderNameDialog mode={naming.mode} folder={naming.folder} parent={{ id: here, path: herePath }} onClose={() => setNaming(null)} />}
      {moving && <MoveDialog doc={moving} tree={tree} onClose={() => setMoving(null)} />}
    </>
  );
}
