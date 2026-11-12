"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReviewFormValues } from "../schemas/review.schema";
import { reviewService, type ReviewPortal } from "../services/review-service";

export const useReviewOverview = () => useQuery({ queryKey: ["admin", "reviews"], queryFn: reviewService.overview });

export const useStaffReviewQueue = () => useQuery({ queryKey: ["team", "reviews"], queryFn: reviewService.staffQueue });

export function useDecideReview(portal: ReviewPortal = "admin") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, values }: { taskId: number; values: ReviewFormValues }) => reviewService.decide(portal, taskId, values),
    onSettled: () => {
      // Refresh even on failure: a 409 means someone else already decided this task.
      for (const key of [["admin", "reviews"], ["team", "reviews"], ["admin", "tasks"], ["team", "tasks"], ["admin", "dashboard"]]) {
        void qc.invalidateQueries({ queryKey: key });
      }
    },
  });
}
