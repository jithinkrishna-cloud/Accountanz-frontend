"use client";

import { ChevronDown, ChevronRight, Folder, FolderOpen, Home } from "lucide-react";
import { useState } from "react";
import { FormField } from "@/components/shared/form-field";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";

/**
 * Building blocks shared by the client's Document Centre and the staff Document Centre: the folder tree over the
 * flat list the API returns, the new/rename folder dialog, the move-file dialog and a collapsible tree sidebar.
 * Each portal brings its own data and mutations.
 */

export interface FolderNode {
  id: number;
  parent_id: number | null;
  name: string;
  /** 1 = made by the accounting team (shared with the client and the client's team). */
  staff_folder?: 0 | 1 | boolean;
}

export const formatSize = (bytes: number | null) => {
  if (!bytes) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

/**
 * Tree helpers over a flat folder list. A folder whose parent isn't in the list (staff only see part of a client's
 * tree) is shown at the top level.
 */
export function buildFolderTree<F extends FolderNode>(folders: F[]) {
  const byId = new Map(folders.map((f) => [f.id, f]));
  const parentOf = (f: F) => (f.parent_id !== null && byId.has(f.parent_id) ? f.parent_id : null);
  const chain = (id: number | null): F[] => {
    const out: F[] = [];
    for (let f = id ? byId.get(id) : undefined; f && out.length < 500; f = parentOf(f) !== null ? byId.get(parentOf(f)!) : undefined) out.unshift(f);
    return out;
  };
  const children = (id: number | null) => folders.filter((f) => parentOf(f) === id).sort((a, b) => a.name.localeCompare(b.name));
  const path = (id: number | null) => chain(id).map((f) => f.name).join(" / ");
  /** Inside a team folder (the folder itself or any parent): the client and the team both see it. */
  const inTeamTree = (id: number | null) => chain(id).some((f) => !!f.staff_folder);
  /** Depth-first list for pickers: [folder, depth]. */
  const flat = (): [F, number][] => {
    const out: [F, number][] = [];
    const walk = (parent: number | null, depth: number) => {
      for (const f of children(parent)) {
        out.push([f, depth]);
        walk(f.id, depth + 1);
      }
    };
    walk(null, 0);
    return out;
  };
  return { byId, chain, children, path, flat, inTeamTree };
}

export type FolderTree<F extends FolderNode = FolderNode> = ReturnType<typeof buildFolderTree<F>>;

/** New folder / rename folder. `onSubmit` throws an ApiError on failure; its message is shown under the field. */
export function FolderNameDialog({
  mode,
  currentName,
  parentPath,
  rootLabel = "Documents",
  pending,
  onSubmit,
  onClose,
}: {
  mode: "create" | "rename";
  currentName?: string;
  parentPath: string;
  rootLabel?: string;
  pending: boolean;
  onSubmit: (name: string) => Promise<unknown>;
  onClose: () => void;
}) {
  const [name, setName] = useState(currentName ?? "");
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return setError("Enter a folder name");
    if (/[\\/]/.test(trimmed)) return setError("Folder names can't contain / or \\");
    try {
      await onSubmit(trimmed);
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
          <DialogDescription>
            {mode === "create" ? <>Inside <span className="text-foreground font-medium">{parentPath ? `${rootLabel} / ${parentPath}` : rootLabel}</span></> : `Currently "${currentName}"`}
          </DialogDescription>
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

/** Pick a destination folder for one file (null = top level). */
export function MoveFileDialog<F extends FolderNode>({
  fileName,
  currentFolderId,
  tree,
  rootLabel = "Documents",
  pending,
  onSubmit,
  onClose,
}: {
  fileName: string;
  currentFolderId: number | null;
  tree: FolderTree<F>;
  rootLabel?: string;
  pending: boolean;
  onSubmit: (folderId: number | null) => Promise<unknown>;
  onClose: () => void;
}) {
  const [target, setTarget] = useState<number | null>(currentFolderId);
  const options: { id: number | null; label: string; depth: number }[] = [{ id: null, label: `${rootLabel} (top level)`, depth: 0 }, ...tree.flat().map(([f, d]) => ({ id: f.id, label: f.name, depth: d + 1 }))];

  const submit = async () => {
    try {
      await onSubmit(target);
      onClose();
    } catch {
      // The caller reports the error.
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Move file</DialogTitle>
          <DialogDescription className="truncate">{fileName}</DialogDescription>
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
              {currentFolderId === o.id && <span className={cn("ml-auto text-xs", target === o.id ? "text-primary-foreground/75" : "text-muted-foreground")}>current</span>}
            </button>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <SubmitButton type="button" pending={pending} disabled={target === currentFolderId} onClick={() => void submit()}>Move here</SubmitButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** A collapsible folder tree (any depth). The path to the selected folder is always expanded. */
export function FolderTreeNav<F extends FolderNode>({
  tree,
  selected,
  onSelect,
  rootLabel = "Documents",
  className,
}: {
  tree: FolderTree<F>;
  selected: number | null;
  onSelect: (id: number | null) => void;
  rootLabel?: string;
  className?: string;
}) {
  // Folders opened or closed by hand; the parents of the selected folder are open unless closed by hand.
  const [toggled, setToggled] = useState<{ open: Set<number>; closed: Set<number> }>(() => ({ open: new Set(), closed: new Set() }));
  const onPath = new Set(tree.chain(selected).map((f) => f.id));
  const isOpen = (id: number) => !toggled.closed.has(id) && (toggled.open.has(id) || (onPath.has(id) && id !== selected));
  const toggle = (id: number) => {
    const open = new Set(toggled.open);
    const closed = new Set(toggled.closed);
    if (isOpen(id)) {
      open.delete(id);
      closed.add(id);
    } else {
      closed.delete(id);
      open.add(id);
    }
    setToggled({ open, closed });
  };

  const renderLevel = (parent: number | null, depth: number): React.ReactNode => {
    const kids = tree.children(parent);
    if (!kids.length) return null;
    return (
      <ul role={depth === 0 ? undefined : "group"}>
        {kids.map((f) => {
          const hasKids = tree.children(f.id).length > 0;
          const expanded = hasKids && isOpen(f.id);
          const active = selected === f.id;
          return (
            <li key={f.id} role="treeitem" aria-expanded={hasKids ? expanded : undefined} aria-selected={active}>
              <div className={cn("flex items-center rounded-md text-sm", active ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted")} style={{ paddingLeft: `${4 + depth * 14}px` }}>
                <button
                  type="button"
                  onClick={() => hasKids && toggle(f.id)}
                  className={cn("text-muted-foreground grid size-6 shrink-0 place-items-center rounded", !hasKids && "invisible")}
                  aria-label={expanded ? `Collapse ${f.name}` : `Expand ${f.name}`}
                  tabIndex={hasKids ? 0 : -1}
                >
                  {expanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                </button>
                <button type="button" onClick={() => onSelect(f.id)} className="flex min-w-0 flex-1 items-center gap-1.5 py-1 pr-2 text-left">
                  {active ? <FolderOpen className="size-4 shrink-0 text-amber-600" aria-hidden /> : <Folder className="size-4 shrink-0 fill-amber-100 text-amber-600" aria-hidden />}
                  <span className="truncate">{f.name}</span>
                </button>
              </div>
              {expanded && renderLevel(f.id, depth + 1)}
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <nav aria-label="Folders" className={cn("text-sm", className)}>
      <div role="tree">
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={cn("flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left", selected === null ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted")}
        >
          <Home className="size-4 shrink-0" aria-hidden /> {rootLabel}
        </button>
        {renderLevel(null, 0)}
      </div>
    </nav>
  );
}
