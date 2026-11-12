import { z } from "zod";
import { PROVIDERS } from "../types/integration.types";

export const connectionFormSchema = z.object({
  client_id: z.string().min(1, "Pick a client"),
  provider: z.enum(PROVIDERS),
  external_org_name: z.string().trim().max(200),
  external_org_id: z.string().trim().max(100),
});

export type ConnectionFormValues = z.infer<typeof connectionFormSchema>;
