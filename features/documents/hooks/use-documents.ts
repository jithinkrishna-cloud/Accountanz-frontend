"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { documentService, type DocumentListParams } from "../services/document-service";
import type { DocumentStatus } from "../types/document.types";

const KEY = ["admin", "documents"] as const;

export const useDocuments = (params: DocumentListParams) =>
  useQuery({ queryKey: [...KEY, "list", params], queryFn: () => documentService.list(params), placeholderData: keepPreviousData });

export const useOpenRequests = (params: { q?: string; page?: number }) =>
  useQuery({ queryKey: [...KEY, "requests", params], queryFn: () => documentService.openRequests(params), placeholderData: keepPreviousData });

export function useSetDocumentStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: DocumentStatus }) => documentService.setStatus(id, status),
    onSettled: () => void qc.invalidateQueries({ queryKey: [...KEY, "list"] }),
  });
}
