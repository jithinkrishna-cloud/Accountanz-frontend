"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { projectService as s } from "../services/project-service";
import type { ItemFilters, ItemPatch, NewItem, SpaceRole, StatusCategory, Template } from "../types/project.types";

/** Query keys: everything for one space sits under ["projects", KEY] so one invalidation refreshes it. */
export const PK = {
  all: ["projects"] as const,
  spaces: (p: object) => ["projects", "list", p] as const,
  space: (key: string) => ["projects", key] as const,
  part: (key: string, part: string, ...rest: unknown[]) => ["projects", key, part, ...rest] as const,
};

export const useSpaces = (p: { q?: string; client_id?: number }) => useQuery({ queryKey: PK.spaces(p), queryFn: () => s.spaces(p), placeholderData: keepPreviousData });
export const useClientOptions = () => useQuery({ queryKey: ["projects", "client-options"], queryFn: s.clientOptions, staleTime: 5 * 60_000 });
export const useSpace = (key: string) => useQuery({ queryKey: PK.space(key), queryFn: () => s.space(key) });
export const useSummary = (key: string, assigneeId?: number) => useQuery({ queryKey: PK.part(key, "summary", assigneeId), queryFn: () => s.summary(key, assigneeId) });
export const useMembers = (key: string) => useQuery({ queryKey: PK.part(key, "members"), queryFn: () => s.members(key) });
export const useStaffSearch = (key: string, q: string, enabled: boolean) =>
  useQuery({ queryKey: PK.part(key, "staff", q), queryFn: () => s.staffSearch(key, q), enabled, placeholderData: keepPreviousData });
export const useSprints = (key: string, enabled = true) => useQuery({ queryKey: PK.part(key, "sprints"), queryFn: () => s.sprints(key), enabled });
export const useItems = (key: string, f: ItemFilters, enabled = true) =>
  useQuery({ queryKey: PK.part(key, "items", f), queryFn: () => s.items(key, f), placeholderData: keepPreviousData, enabled });
export const useItem = (key: string, n: number | null) => useQuery({ queryKey: PK.part(key, "item", n), queryFn: () => s.item(key, n!), enabled: n != null });
export const useComments = (key: string, n: number) => useQuery({ queryKey: PK.part(key, "comments", n), queryFn: () => s.comments(key, n) });
export const useWorklogs = (key: string, n: number, enabled: boolean) => useQuery({ queryKey: PK.part(key, "worklogs", n), queryFn: () => s.worklogs(key, n), enabled });
export const useAddWorklog = (key: string, n: number) => useSpaceMutation(key, (b: { minutes: number; work_date: string; note: string | null }) => s.addWorklog(key, n, b));
export const useDeleteWorklog = (key: string, n: number) => useSpaceMutation(key, (id: number) => s.deleteWorklog(key, n, id));
export const useActivity = (key: string, n: number, enabled: boolean) => useQuery({ queryKey: PK.part(key, "activity", n), queryFn: () => s.activity(key, n), enabled });

/** Any write in a space refreshes that space's queries (board, backlog, list, summary, item). */
function useSpaceMutation<V, R>(key: string, fn: (v: V) => Promise<R>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSettled: () => void qc.invalidateQueries({ queryKey: PK.space(key) }) });
}

export function useCreateSpace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: { name: string; space_key: string; template: Template; client_id: number | null; description: string | null }) => s.createSpace(b),
    onSuccess: () => void qc.invalidateQueries({ queryKey: PK.all }),
  });
}

export function useUpdateSpace(key: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: { name?: string; client_id?: number | null; description?: string | null }) => s.updateSpace(key, b),
    onSuccess: () => void qc.invalidateQueries({ queryKey: PK.all }),
  });
}

/** Deleting a space: drop its cached data (it would 404 on refetch) and refresh the space lists. */
export function useDeleteSpace(key: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (confirmKey: string) => s.deleteSpace(key, confirmKey),
    onSuccess: () => {
      qc.removeQueries({ queryKey: PK.space(key) });
      void qc.invalidateQueries({ queryKey: ["projects", "list"] });
    },
  });
}

export const useCreateStatus = (key: string) => useSpaceMutation(key, (b: { name: string; category: StatusCategory }) => s.createStatus(key, b));
export const useUpdateStatus = (key: string) => useSpaceMutation(key, (v: { id: number; name?: string; category?: StatusCategory }) => s.updateStatus(key, v.id, { name: v.name, category: v.category }));
export const useDeleteStatus = (key: string) => useSpaceMutation(key, (v: { id: number; moveTo: number }) => s.deleteStatus(key, v.id, v.moveTo));
export const useReorderStatuses = (key: string) => useSpaceMutation(key, (ids: number[]) => s.reorderStatuses(key, ids));

export const useAddMembers = (key: string) => useSpaceMutation(key, (v: { ids: number[]; role: SpaceRole }) => s.addMembers(key, v.ids, v.role));
export const useChangeRole = (key: string) => useSpaceMutation(key, (v: { userId: number; role: SpaceRole }) => s.changeRole(key, v.userId, v.role));
export const useRemoveMember = (key: string) => useSpaceMutation(key, (userId: number) => s.removeMember(key, userId));

export const useCreateSprint = (key: string) => useSpaceMutation(key, (b: { name?: string; goal?: string | null; start_date?: string | null; end_date?: string | null }) => s.createSprint(key, b));
export const useUpdateSprint = (key: string) =>
  useSpaceMutation(key, (v: { id: number; name?: string; goal?: string | null; start_date?: string | null; end_date?: string | null }) => {
    const { id, ...body } = v;
    return s.updateSprint(key, id, body);
  });
export const useStartSprint = (key: string) => useSpaceMutation(key, (id: number) => s.startSprint(key, id));
export const useCompleteSprint = (key: string) => useSpaceMutation(key, (v: { id: number; moveTo: number | null }) => s.completeSprint(key, v.id, v.moveTo));
export const useDeleteSprint = (key: string) => useSpaceMutation(key, (id: number) => s.deleteSprint(key, id));

export const useCreateItem = (key: string) => useSpaceMutation(key, (b: NewItem) => s.createItem(key, b));
export const useUpdateItem = (key: string) => useSpaceMutation(key, (v: { n: number; patch: ItemPatch }) => s.updateItem(key, v.n, v.patch));
export const useMoveItem = (key: string) =>
  useSpaceMutation(key, (v: { n: number; status_id?: number; sprint_id?: number | null; prev_number?: number | null; next_number?: number | null }) => {
    const { n, ...body } = v;
    return s.moveItem(key, n, body);
  });
export const useDeleteItem = (key: string) => useSpaceMutation(key, (n: number) => s.deleteItem(key, n));

export const useAddComment = (key: string, n: number) => useSpaceMutation(key, (body: string) => s.addComment(key, n, body));
export const useEditComment = (key: string, n: number) => useSpaceMutation(key, (v: { id: number; body: string }) => s.editComment(key, n, v.id, v.body));
export const useDeleteComment = (key: string, n: number) => useSpaceMutation(key, (id: number) => s.deleteComment(key, n, id));
export const useUploadAttachment = (key: string, n: number) => useSpaceMutation(key, (file: File) => s.uploadAttachment(key, n, file));
export const useDeleteAttachment = (key: string, n: number) => useSpaceMutation(key, (id: number) => s.deleteAttachment(key, n, id));
