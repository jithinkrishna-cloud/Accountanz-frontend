import { z } from "zod";

// Mirrors backend/src/modules/reviews/review.validation.ts.
export const reviewFormSchema = z.object({
  decision: z.enum(["approved", "returned"]),
  comments: z.string().trim().max(2000, "Keep comments under 2,000 characters"),
});

export type ReviewFormValues = z.infer<typeof reviewFormSchema>;
