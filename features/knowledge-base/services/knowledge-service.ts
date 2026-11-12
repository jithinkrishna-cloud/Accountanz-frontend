import { api, type Paged } from "@/lib/api-client";
import type { ArticleFormValues } from "../schemas/knowledge.schema";
import type { Article } from "../types/knowledge.types";

const toBody = (v: ArticleFormValues) => ({ ...v, summary: v.summary || null });

export const knowledgeService = {
  list: (params: { q?: string; page?: number }) => api<Paged<Article>>("/admin/knowledge", { query: params }),
  save: (v: ArticleFormValues, id?: number) => api<Article>(id ? `/admin/knowledge/${id}` : "/admin/knowledge", { method: id ? "PUT" : "POST", body: toBody(v) }),
  remove: (id: number) => api<void>(`/admin/knowledge/${id}`, { method: "DELETE" }),
};
