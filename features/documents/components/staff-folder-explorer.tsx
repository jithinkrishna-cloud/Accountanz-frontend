"use client";

import { ChevronRight, Eye, FileText, Folder, FolderInput, FolderPlus, Home, Lock, MoreHorizontal, Pencil, Search, Trash2, Upload, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { EmptyState, ErrorState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { DocumentViewer } from "@/features/client-portal/components/document-viewer";
import { ApiError } from "@/lib/api-client";
import { applyApiError } from "@/lib/form-errors";
import { formatDate, formatPeriod, humanize } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { StaffPortal } from "@/types/auth";
import { useDocuments, useSetDocumentStatus, useStaffFolderActions, useStaffFolders } from "../hooks/use-documents";
import { documentFileUrl } from "../services/document-service";
import { CATEGORY_LABELS, DOCUMENT_STATUSES, type ClientDocument, type DocumentStatus, type StaffFolder } from "../types/document.types";
import { UploadDocumentDialog } from "./document-dialogs";
import { buildFolderTree, FolderNameDialog, FolderTreeNav, MoveFileDialog, type FolderTree } from "./folder-kit";

const PAGE_SIZE = 100;

export function DocumentStatusCell({ portal, doc }: { portal: StaffPortal; doc: ClientDocument }) {
  const setStatus = useSetDocumentStatus(portal);
  const change = async (status: string) => {
    try {
      await setStatus.mutateAsync({ id: doc.id, status: status as DocumentStatus });
      toast.success(`${doc.file_name} marked ${status}`);
    } catch (err) {
      applyApiError(err);
    }
  };
  return (
    <Select value={doc.status} onValueChange={change} disabled={setStatus.isPending}>
      <SelectTrigger size="sm" className="w-32" aria-label={`Status of ${doc.file_name}`}><SelectValue /></SelectTrigger>
      <SelectContent>{DOCUMENT_STATUSES.map((s) => <SelectItem key={s} value={s}>{humanize(s)}</SelectItem>)}</SelectContent>
    </Select>
  );
}

/** "Team folder" (shared with the client and the team) or the client's own folder that was shared with you. */
function FolderAccess({ tree, id }: { tree: FolderTree<StaffFolder>; id: number }) {
  if (tree.inTeamTree(id)) return <span className="inline-flex items-center gap-1 text-sky-700"><Users className="size-3" aria-hidden /> Team folder · the client sees it too</span>;
  return <span className="inline-flex items-center gap-1"><Lock className="size-3" aria-hidden /> Client&apos;s folder · shared with you</span>;
}

function FolderRow({ folder, tree, onOpen, onRename, onDelete }: { folder: StaffFolder; tree: FolderTree<StaffFolder>; onOpen: () => void; onRename: () => void; onDelete: () => void }) {
  const subfolders = tree.children(folder.id).length;
  return (
    <li className="hover:bg-muted/40 flex items-center gap-3 px-5 py-2.5">
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <Folder className="size-5 shrink-0 fill-amber-100 text-amber-600" aria-hidden />
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">{folder.name}</span>
          <span className="text-muted-foreground block text-xs">
            {subfolders ? `${subfolders} folder${subfolders === 1 ? "" : "s"} · ` : ""}
            <FolderAccess tree={tree} id={folder.id} />
          </span>
        </span>
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8" aria-label={`Actions for folder ${folder.name}`}><MoreHorizontal className="size-4" /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={onOpen}><Folder className="size-4" /> Open</DropdownMenuItem>
          {folder.staff_folder ? (
            <>
              <DropdownMenuItem onSelect={onRename}><Pencil className="size-4" /> Rename</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={onDelete}><Trash2 className="size-4" /> Delete</DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}

function FileRow({ portal, doc, showPath, onView, onMove }: { portal: StaffPortal; doc: ClientDocument; showPath?: boolean; onView: () => void; onMove: () => void }) {
  return (
    <li className="flex items-center gap-3 px-5 py-2.5">
      <FileText className="text-muted-foreground size-5 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1">
        <button type="button" onClick={onView} className="text-primary block max-w-full truncate text-left text-sm font-medium hover:underline">{doc.file_name}</button>
        <p className="text-muted-foreground truncate text-xs">
          {showPath && <>{doc.folder_path ? `Documents / ${doc.folder_path}` : "Documents"} • </>}
          {CATEGORY_LABELS[doc.category]}
          {doc.period ? ` • ${formatPeriod(doc.period)}` : ""} • {formatDate(doc.created_at)}
          {doc.uploaded_by_name ? ` • ${doc.uploaded_by_name} (${doc.from_client ? "client" : "team"})` : ""}
          {doc.request_id !== null ? " • sent for a request" : ""}
        </p>
      </div>
      <div className="hidden sm:block"><DocumentStatusCell portal={portal} doc={doc} /></div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8" aria-label={`Actions for ${doc.file_name}`}><MoreHorizontal className="size-4" /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={onView}><Eye className="size-4" /> View</DropdownMenuItem>
          <DropdownMenuItem asChild><a href={documentFileUrl.download(portal, doc.id)} download={doc.file_name}><FileText className="size-4" /> Download</a></DropdownMenuItem>
          <DropdownMenuItem onSelect={onMove}><FolderInput className="size-4" /> Move to…</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}

/**
 * One client's Document Centre as staff see it: the folder tree on the left (any depth), the open folder's subfolders
 * and files on the right. Staff folders are shared with the client; the client's own folders appear only when the
 * client shared them (admins see every folder). Staff can rename and delete only their team's folders.
 */
export function StaffFolderExplorer({ portal, clientId, current, onOpen }: { portal: StaffPortal; clientId: number; current: number | null; onOpen: (id: number | null) => void }) {
  const folders = useStaffFolders(portal, clientId);
  const { create, rename, remove, move } = useStaffFolderActions(portal);
  const [q, setQ] = useState("");
  const [paging, setPaging] = useState<{ key: string; page: number }>({ key: "", page: 1 });
  const [uploading, setUploading] = useState(false);
  const [naming, setNaming] = useState<{ mode: "create" | "rename"; folder?: StaffFolder } | null>(null);
  const [moving, setMoving] = useState<ClientDocument | null>(null);
  const [viewing, setViewing] = useState<ClientDocument | null>(null);

  const tree = buildFolderTree(folders.data ?? []);
  // A folder deleted elsewhere (or not visible): fall back to the top level.
  const here = current !== null && folders.data && !tree.byId.has(current) ? null : current;
  const search = q.trim();
  // Paging restarts whenever the folder or the search changes.
  const pageKey = `${here}|${search}`;
  const page = paging.key === pageKey ? paging.page : 1;
  const setPage = (p: number) => setPaging({ key: pageKey, page: p });
  const docs = useDocuments(portal, search ? { client_id: String(clientId), q: search, page, pageSize: PAGE_SIZE } : { client_id: String(clientId), folder_id: here ?? "root", page, pageSize: PAGE_SIZE });
  const crumbs = tree.chain(here);
  const herePath = tree.path(here);
  const subfolders = search ? [] : tree.children(here);
  const foundFolders = search ? (folders.data ?? []).filter((f) => f.name.toLowerCase().includes(search.toLowerCase())) : [];
  const files = docs.data?.items ?? [];
  const pages = docs.data ? Math.max(1, Math.ceil(docs.data.total / PAGE_SIZE)) : 1;

  const open = (id: number | null) => {
    onOpen(id);
    setQ("");
  };

  const deleteFolder = async (f: StaffFolder) => {
    if (tree.children(f.id).length) {
      toast.error(`"${f.name}" isn't empty. Move or remove what's inside first.`);
      return;
    }
    if (!window.confirm(`Delete the folder "${f.name}"?`)) return;
    try {
      await remove.mutateAsync(f.id);
      toast.success("Folder deleted");
      if (here === f.id) open(f.parent_id);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't delete the folder");
    }
  };

  const submitName = async (name: string) => {
    if (naming?.mode === "rename") await rename.mutateAsync({ id: naming.folder!.id, name });
    else {
      const f = await create.mutateAsync({ client_id: clientId, parent_id: here, name });
      onOpen(f.id);
    }
    toast.success(naming?.mode === "rename" ? "Folder renamed" : `Folder "${name}" created`);
  };

  const submitMove = async (folderId: number | null) => {
    try {
      await move.mutateAsync({ id: moving!.id, folderId });
      toast.success(`Moved to ${folderId ? `Documents / ${tree.path(folderId)}` : "Documents"}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't move the file");
      throw err;
    }
  };

  const error = folders.error ?? docs.error;
  const loading = folders.isLoading || docs.isLoading;

  return (
    <section id="client-folders" className="bg-card rounded-xl border shadow-xs">
      <header className="flex flex-wrap items-center gap-3 border-b px-5 py-4">
        <div className="min-w-0 flex-1">
          <h2 className="font-medium">Folders</h2>
          <p className="text-muted-foreground text-xs">Team folders are shared with the client. Each document request gets its own folder, and files sent for it land there.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setNaming({ mode: "create" })}><FolderPlus className="size-4" /> New folder</Button>
        <Button size="sm" onClick={() => setUploading(true)}><Upload className="size-4" /> Upload here</Button>
      </header>
      <div className="grid md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
        <aside className="max-h-[32rem] overflow-y-auto border-b p-3 md:border-r md:border-b-0">
          {folders.isLoading ? <Skeleton className="h-32 w-full" /> : <FolderTreeNav tree={tree} selected={here} onSelect={open} />}
        </aside>
        <div className="min-w-0">
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
              {search && <span className="text-muted-foreground inline-flex items-center gap-1"><ChevronRight className="size-3.5" aria-hidden /> Search results</span>}
            </nav>
            {here !== null && !search && <span className="text-muted-foreground text-xs"><FolderAccess tree={tree} id={here} /></span>}
            <div className="relative w-full sm:w-56">
              <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" aria-hidden />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search this client's files" className="pl-8" aria-label="Search this client's files" />
            </div>
          </div>

          {error ? (
            <ErrorState error={error} onRetry={() => { void folders.refetch(); void docs.refetch(); }} />
          ) : loading ? (
            <div className="space-y-2 p-5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : subfolders.length + foundFolders.length + files.length === 0 ? (
            <EmptyState
              title={search ? "Nothing matches" : here === null ? "No documents yet" : "This folder is empty"}
              description={search ? `No file or folder called "${search}".` : "Upload files here or create a subfolder."}
            />
          ) : (
            <ul className="divide-y">
              {[...subfolders, ...foundFolders].map((f) => (
                <FolderRow key={`f${f.id}`} folder={search ? { ...f, name: tree.path(f.id) } : f} tree={tree} onOpen={() => open(f.id)} onRename={() => setNaming({ mode: "rename", folder: f })} onDelete={() => void deleteFolder(f)} />
              ))}
              {files.map((d) => <FileRow key={d.id} portal={portal} doc={d} showPath={!!search} onView={() => setViewing(d)} onMove={() => setMoving(d)} />)}
            </ul>
          )}
          {pages > 1 && (
            <div className="text-muted-foreground flex items-center justify-end gap-2 border-t px-5 py-2.5 text-xs">
              Page {page} of {pages}
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
              <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</Button>
            </div>
          )}
        </div>
      </div>

      <UploadDocumentDialog portal={portal} clientId={clientId} folder={here === null ? null : { id: here, path: herePath }} open={uploading} onOpenChange={setUploading} />
      {naming && (
        <FolderNameDialog
          mode={naming.mode}
          currentName={naming.folder?.name}
          parentPath={herePath}
          pending={create.isPending || rename.isPending}
          onSubmit={submitName}
          onClose={() => setNaming(null)}
        />
      )}
      {moving && <MoveFileDialog fileName={moving.file_name} currentFolderId={moving.folder_id} tree={tree} pending={move.isPending} onSubmit={submitMove} onClose={() => setMoving(null)} />}
      <DocumentViewer
        doc={viewing}
        viewUrl={(id) => documentFileUrl.view(portal, id)}
        downloadUrl={(id) => documentFileUrl.download(portal, id)}
        onClose={() => setViewing(null)}
      />
    </section>
  );
}
