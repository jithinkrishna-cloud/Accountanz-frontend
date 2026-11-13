"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { journlWorkspaceService as s } from "../services/journl-workspace-service";
import type { JournlViewQuery } from "../types/journl-workspace.types";

const KEY = ["team", "journl"] as const;

export const useJournlWorkspace = () => useQuery({ queryKey: [...KEY, "workspace"], queryFn: s.workspace, staleTime: 60_000 });

/** Live JournL rows. Not retried: an expired session or missing grant won't fix itself. */
export const useJournlView = (clientId: number | null, view: string | null, q: JournlViewQuery) =>
  useQuery({
    queryKey: [...KEY, "view", clientId, view, q],
    queryFn: () => s.view(clientId!, view!, q),
    enabled: clientId != null && view != null,
    retry: false,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
