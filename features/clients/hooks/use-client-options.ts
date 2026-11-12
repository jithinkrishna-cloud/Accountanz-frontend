"use client";

import { useQuery } from "@tanstack/react-query";
import { api, type Paged } from "@/lib/api-client";
import type { Client } from "../types/client.types";

/** Client id/name pairs for filters and pickers (the API caps a page at 100). */
export const useClientOptions = () =>
  useQuery({
    queryKey: ["admin", "clients", "options"],
    queryFn: () =>
      api<Paged<Client>>("/admin/clients", { query: { pageSize: 100 } }).then((r) =>
        r.items.map((c) => ({ value: String(c.id), label: c.trade_name ?? c.legal_name })).sort((a, b) => a.label.localeCompare(b.label)),
      ),
    staleTime: 60_000,
  });
