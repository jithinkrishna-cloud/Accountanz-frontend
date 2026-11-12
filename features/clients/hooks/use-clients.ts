"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ClientFormOutput } from "../schemas/client.schema";
import { clientService, type ClientListParams } from "../services/client-service";

const KEY = ["admin", "clients"] as const;

export const useClients = (params: ClientListParams) =>
  useQuery({ queryKey: [...KEY, "list", params], queryFn: () => clientService.list(params), placeholderData: keepPreviousData });

export const useClient = (id: number) => useQuery({ queryKey: [...KEY, "detail", id], queryFn: () => clientService.get(id) });

export function useSaveClient(id?: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (values: ClientFormOutput) => (id ? clientService.update(id, values) : clientService.create(values)),
    onSuccess: (client) => {
      qc.setQueryData([...KEY, "detail", client.id], client);
      void qc.invalidateQueries({ queryKey: [...KEY, "list"] });
      void qc.invalidateQueries({ queryKey: ["admin", "dashboard"] });
    },
  });
}
