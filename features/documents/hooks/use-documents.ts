"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { StaffPortal } from "@/types/auth";
import { documentService, type DocumentListParams, type NewRequest, type RequestListParams } from "../services/document-service";
import type { DocumentCategory, DocumentStatus } from "../types/document.types";

const key = (portal: StaffPortal) => [portal, "documents"] as const;

export const useDocuments = (portal: StaffPortal, params: DocumentListParams) =>
  useQuery({ queryKey: [...key(portal), "list", params], queryFn: () => documentService.list(portal, params), placeholderData: keepPreviousData });

export const useDocumentRequests = (portal: StaffPortal, params: RequestListParams) =>
  useQuery({ queryKey: [...key(portal), "requests", params], queryFn: () => documentService.requests(portal, params), placeholderData: keepPreviousData });

/** Document changes also move workspace counts (dashboard, my clients, closing checklist). */
function useRefresh(portal: StaffPortal) {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: key(portal) });
    void qc.invalidateQueries({ queryKey: ["team", "workspace"] });
  };
}

export function useSetDocumentStatus(portal: StaffPortal) {
  const refresh = useRefresh(portal);
  return useMutation({ mutationFn: ({ id, status }: { id: number; status: DocumentStatus }) => documentService.setStatus(portal, id, status), onSettled: refresh });
}

export function useUploadDocument(portal: StaffPortal) {
  const refresh = useRefresh(portal);
  return useMutation({
    mutationFn: (v: { file: File; client_id: number; category: DocumentCategory; period?: string }) => documentService.upload(portal, v.file, v),
    onSuccess: refresh,
  });
}

export function useCreateRequest(portal: StaffPortal) {
  const refresh = useRefresh(portal);
  return useMutation({ mutationFn: (body: NewRequest) => documentService.createRequest(portal, body), onSuccess: refresh });
}

export function useCancelRequest(portal: StaffPortal) {
  const refresh = useRefresh(portal);
  return useMutation({ mutationFn: (id: number) => documentService.cancelRequest(portal, id), onSuccess: refresh });
}
