import { z } from "zod";

// Mirrors backend/src/modules/engagements/engagement.validation.ts.
export const engagementFormSchema = z
  .object({
    client_id: z.string().min(1, "Choose a client").transform(Number),
    package_id: z.string().min(1, "Choose a package").transform(Number),
    start_date: z.string().transform((v) => v || null),
    renewal_date: z.string().transform((v) => v || null),
  })
  .refine((v) => !v.start_date || !v.renewal_date || v.renewal_date > v.start_date, {
    message: "Renewal date must be after the start date",
    path: ["renewal_date"],
  });

export type EngagementFormValues = z.input<typeof engagementFormSchema>;
export type EngagementFormOutput = z.output<typeof engagementFormSchema>;
