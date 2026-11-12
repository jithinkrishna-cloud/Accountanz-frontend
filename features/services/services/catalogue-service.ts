import { api } from "@/lib/api-client";
import type { PackageFormOutput, ServiceFormOutput } from "../schemas/service.schema";
import type { Service, ServicePackage } from "../types/service.types";

export const catalogueService = {
  listServices: () => api<{ items: Service[] }>("/admin/services").then((r) => r.items),
  saveService: (values: ServiceFormOutput, id?: number) =>
    api<Service>(id ? `/admin/services/${id}` : "/admin/services", { method: id ? "PATCH" : "POST", body: values }),
  listPackages: () => api<{ items: ServicePackage[] }>("/admin/packages").then((r) => r.items),
  savePackage: (values: PackageFormOutput, id?: number) =>
    api<ServicePackage>(id ? `/admin/packages/${id}` : "/admin/packages", { method: id ? "PATCH" : "POST", body: values }),
};
