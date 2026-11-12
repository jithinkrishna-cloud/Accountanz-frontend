"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PackageFormOutput, ServiceFormOutput } from "../schemas/service.schema";
import { catalogueService } from "../services/catalogue-service";

const SERVICES = ["admin", "services"] as const;
const PACKAGES = ["admin", "packages"] as const;

export const useServices = () => useQuery({ queryKey: SERVICES, queryFn: catalogueService.listServices });
export const usePackages = () => useQuery({ queryKey: PACKAGES, queryFn: catalogueService.listPackages });

export function useSaveService(id?: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (values: ServiceFormOutput) => catalogueService.saveService(values, id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: SERVICES });
      void qc.invalidateQueries({ queryKey: PACKAGES }); // packages show service names
    },
  });
}

export function useSavePackage(id?: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (values: PackageFormOutput) => catalogueService.savePackage(values, id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: PACKAGES }),
  });
}
