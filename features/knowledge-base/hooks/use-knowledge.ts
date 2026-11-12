"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ArticleFormValues } from "../schemas/knowledge.schema";
import { knowledgeService } from "../services/knowledge-service";

const KEY = ["admin", "knowledge"] as const;

export const useArticles = (params: { q?: string; page?: number }) =>
  useQuery({ queryKey: [...KEY, params], queryFn: () => knowledgeService.list(params), placeholderData: keepPreviousData });

export function useSaveArticle(id?: number) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: (v: ArticleFormValues) => knowledgeService.save(v, id), onSuccess: () => void qc.invalidateQueries({ queryKey: KEY }) });
}

export function useDeleteArticle() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: knowledgeService.remove, onSuccess: () => void qc.invalidateQueries({ queryKey: KEY }) });
}
