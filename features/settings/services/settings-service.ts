import { api } from "@/lib/api-client";
import type { AppSettings } from "../types/settings.types";

export const settingsService = {
  get: () => api<AppSettings>("/admin/settings"),
  update: (body: Partial<Omit<AppSettings, "updated_at">>) => api<AppSettings>("/admin/settings", { method: "PATCH", body }),
};
