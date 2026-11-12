import { api, type Paged } from "@/lib/api-client";
import type { ItemFormOutput, TaskFormOutput, TemplateFormOutput, WorkLogFormOutput } from "../schemas/task.schema";
import type { GenerationResult, TaskDetail, TaskListItem, TaskOptions, TaskSource, TaskStatus, TaskTemplate, TaskTemplateItem } from "../types/task.types";

/** Task screens exist in the admin and accountant portals; the API prefix picks the permission set. */
export type TaskPortal = "admin" | "team";

export interface TaskListParams {
  q?: string;
  status?: TaskStatus;
  period?: string;
  source?: TaskSource;
  scope?: "mine" | "clients";
  page?: number;
}

const toBody = (v: TaskFormOutput) => ({
  ...v,
  client_id: Number(v.client_id),
  engagement_id: Number(v.engagement_id),
  assignee_id: Number(v.assignee_id),
  reviewer_id: Number(v.reviewer_id),
  description: v.description || null,
});

export const taskService = {
  list: (portal: TaskPortal, params: TaskListParams) => api<Paged<TaskListItem>>(`/${portal}/tasks`, { query: { ...params } }),
  options: (portal: TaskPortal, clientId?: number) => api<TaskOptions>(`/${portal}/tasks/options`, { query: { client_id: clientId } }),
  get: (portal: TaskPortal, id: number) => api<TaskDetail>(`/${portal}/tasks/${id}`),
  create: (portal: TaskPortal, v: TaskFormOutput) => api<TaskDetail>(`/${portal}/tasks`, { method: "POST", body: toBody(v) }),
  /** Client and engagement are fixed once a task exists, so they're not sent. */
  update: (portal: TaskPortal, id: number, v: TaskFormOutput) => {
    const b = toBody(v);
    const body = { title: b.title, description: b.description, assignee_id: b.assignee_id, reviewer_id: b.reviewer_id, period: b.period, due_date: b.due_date, client_visible: b.client_visible, checklist: b.checklist };
    return api<TaskDetail>(`/${portal}/tasks/${id}`, { method: "PATCH", body });
  },
  setChecklist: (id: number, done: boolean[]) => api<TaskDetail>(`/team/tasks/${id}/checklist`, { method: "PUT", body: { done } }),
  logWork: (id: number, v: WorkLogFormOutput) => api<TaskDetail>(`/team/tasks/${id}/work-logs`, { method: "POST", body: { ...v, note: v.note || null } }),
  submit: (id: number) => api<TaskDetail>(`/team/tasks/${id}/submit`, { method: "POST" }),
  generate: (period: string) => api<GenerationResult>("/admin/tasks/generate", { method: "POST", body: { period } }),
};

export const templateService = {
  list: () => api<{ items: TaskTemplate[] }>("/admin/task-templates").then((r) => r.items),
  create: (v: TemplateFormOutput) =>
    api<TaskTemplate>("/admin/task-templates", { method: "POST", body: { ...v, service_id: Number(v.service_id) } }),
  addItem: (templateId: number, v: ItemFormOutput) => api<TaskTemplateItem>(`/admin/task-templates/${templateId}/items`, { method: "POST", body: v }),
  updateItem: (itemId: number, v: ItemFormOutput) => api<TaskTemplateItem>(`/admin/task-templates/items/${itemId}`, { method: "PATCH", body: v }),
  deleteItem: (itemId: number) => api<void>(`/admin/task-templates/items/${itemId}`, { method: "DELETE" }),
};
