import { api } from "@/lib/api-client";
import type { ReviewFormValues } from "../schemas/review.schema";
import type { ReviewOverview, ReviewQueueItem } from "../types/review.types";

/** Admin and accountant portals share the review rules; only the API prefix differs. */
export type ReviewPortal = "admin" | "team";

export const reviewService = {
  overview: () => api<ReviewOverview>("/admin/reviews"),
  staffQueue: () => api<{ queue: ReviewQueueItem[] }>("/team/reviews").then((r) => r.queue),
  decide: (portal: ReviewPortal, taskId: number, values: ReviewFormValues) =>
    api<void>(`/${portal}/reviews/${taskId}`, { method: "POST", body: { decision: values.decision, comments: values.comments || null } }),
};
