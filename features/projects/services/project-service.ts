import { api, type Paged } from "@/lib/api-client";
import type {
  Activity,
  Attachment,
  Comment,
  Item,
  ItemDetail,
  ItemFilters,
  ItemPatch,
  Member,
  NewItem,
  Space,
  SpaceDetail,
  SpaceRole,
  Sprint,
  StaffOption,
  Status,
  StatusCategory,
  Summary,
  Template,
  Worklog,
} from "../types/project.types";

type Items<T> = { items: T[] };
const items = <T>(p: Promise<Items<T>>) => p.then((r) => r.items);
const base = (key: string) => `/projects/${encodeURIComponent(key)}`;

export const projectService = {
  spaces: (params: { q?: string; client_id?: number }) => items(api<Items<Space>>("/projects", { query: params })),
  clientOptions: () => items(api<Items<{ id: number; name: string }>>("/projects/client-options")),
  keyAvailable: (key: string) => api<{ key: string; available: boolean }>("/projects/key-available", { query: { key } }),
  createSpace: (body: { name: string; space_key: string; template: Template; client_id: number | null; description: string | null }) =>
    api<Space>("/projects", { method: "POST", body }),
  space: (key: string) => api<SpaceDetail>(base(key)),
  updateSpace: (key: string, body: { name?: string; client_id?: number | null; description?: string | null }) => api<SpaceDetail>(base(key), { method: "PATCH", body }),
  /** Permanent. The server checks that confirm_key repeats the space key. */
  deleteSpace: (key: string, confirmKey: string) => api<void>(base(key), { method: "DELETE", body: { confirm_key: confirmKey } }),
  summary: (key: string, assigneeId?: number) => api<Summary>(`${base(key)}/summary`, { query: { assignee_id: assigneeId } }),

  createStatus: (key: string, body: { name: string; category: StatusCategory }) => items(api<Items<Status>>(`${base(key)}/statuses`, { method: "POST", body })),
  updateStatus: (key: string, id: number, body: { name?: string; category?: StatusCategory }) => items(api<Items<Status>>(`${base(key)}/statuses/${id}`, { method: "PATCH", body })),
  deleteStatus: (key: string, id: number, moveTo: number) => items(api<Items<Status>>(`${base(key)}/statuses/${id}`, { method: "DELETE", body: { move_to_status_id: moveTo } })),
  reorderStatuses: (key: string, ids: number[]) => items(api<Items<Status>>(`${base(key)}/statuses/reorder`, { method: "POST", body: { ids } })),

  members: (key: string) => items(api<Items<Member>>(`${base(key)}/members`)),
  staffSearch: (key: string, q: string) => items(api<Items<StaffOption>>(`${base(key)}/staff-search`, { query: { q } })),
  addMembers: (key: string, user_ids: number[], role: SpaceRole) => items(api<Items<Member>>(`${base(key)}/members`, { method: "POST", body: { user_ids, role } })),
  changeRole: (key: string, userId: number, role: SpaceRole) => items(api<Items<Member>>(`${base(key)}/members/${userId}`, { method: "PATCH", body: { role } })),
  removeMember: (key: string, userId: number) => items(api<Items<Member>>(`${base(key)}/members/${userId}`, { method: "DELETE" })),

  sprints: (key: string) => items(api<Items<Sprint>>(`${base(key)}/sprints`)),
  createSprint: (key: string, body: { name?: string; goal?: string | null; start_date?: string | null; end_date?: string | null }) =>
    api<Sprint>(`${base(key)}/sprints`, { method: "POST", body }),
  updateSprint: (key: string, id: number, body: { name?: string; goal?: string | null; start_date?: string | null; end_date?: string | null }) =>
    api<Sprint>(`${base(key)}/sprints/${id}`, { method: "PATCH", body }),
  startSprint: (key: string, id: number) => api<Sprint>(`${base(key)}/sprints/${id}/start`, { method: "POST" }),
  completeSprint: (key: string, id: number, moveTo: number | null) => api<Sprint>(`${base(key)}/sprints/${id}/complete`, { method: "POST", body: { move_to_sprint_id: moveTo } }),
  deleteSprint: (key: string, id: number) => api<void>(`${base(key)}/sprints/${id}`, { method: "DELETE" }),

  items: (key: string, f: ItemFilters) => api<Paged<Item>>(`${base(key)}/items`, { query: { ...f } }),
  item: (key: string, n: number) => api<ItemDetail>(`${base(key)}/items/${n}`),
  createItem: (key: string, body: NewItem) => api<ItemDetail>(`${base(key)}/items`, { method: "POST", body }),
  updateItem: (key: string, n: number, body: ItemPatch) => api<ItemDetail>(`${base(key)}/items/${n}`, { method: "PATCH", body }),
  moveItem: (key: string, n: number, body: { status_id?: number; sprint_id?: number | null; prev_number?: number | null; next_number?: number | null }) =>
    api<ItemDetail>(`${base(key)}/items/${n}/move`, { method: "POST", body }),
  deleteItem: (key: string, n: number) => api<void>(`${base(key)}/items/${n}`, { method: "DELETE" }),

  worklogs: (key: string, n: number) => items(api<Items<Worklog>>(`${base(key)}/items/${n}/worklogs`)),
  addWorklog: (key: string, n: number, body: { minutes: number; work_date: string; note: string | null }) => items(api<Items<Worklog>>(`${base(key)}/items/${n}/worklogs`, { method: "POST", body })),
  deleteWorklog: (key: string, n: number, id: number) => items(api<Items<Worklog>>(`${base(key)}/items/${n}/worklogs/${id}`, { method: "DELETE" })),
  activity: (key: string, n: number) => items(api<Items<Activity>>(`${base(key)}/items/${n}/activity`)),
  comments: (key: string, n: number) => items(api<Items<Comment>>(`${base(key)}/items/${n}/comments`)),
  addComment: (key: string, n: number, body: string) => items(api<Items<Comment>>(`${base(key)}/items/${n}/comments`, { method: "POST", body: { body } })),
  editComment: (key: string, n: number, id: number, body: string) => items(api<Items<Comment>>(`${base(key)}/items/${n}/comments/${id}`, { method: "PATCH", body: { body } })),
  deleteComment: (key: string, n: number, id: number) => items(api<Items<Comment>>(`${base(key)}/items/${n}/comments/${id}`, { method: "DELETE" })),

  uploadAttachment: (key: string, n: number, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return items(api<Items<Attachment>>(`${base(key)}/items/${n}/attachments`, { method: "POST", body: form }));
  },
  attachmentUrl: (key: string, n: number, id: number) => `/api${base(key)}/items/${n}/attachments/${id}`,
  deleteAttachment: (key: string, n: number, id: number) => items(api<Items<Attachment>>(`${base(key)}/items/${n}/attachments/${id}`, { method: "DELETE" })),
};
