import { z } from "zod";
import { TEAM_ROLES, type TeamRole } from "../types/assignment.types";

// Mirrors backend/src/modules/assignments/assignment.validation.ts.
export const assignmentFormSchema = z
  .object({
    client_id: z.string().min(1, "Choose a client").transform(Number),
    user_id: z.string().min(1, "Choose a staff member").transform(Number),
    team_role: z
      .union([z.enum(TEAM_ROLES), z.literal("")])
      .refine((v) => v !== "", "Choose a team role")
      .transform((v) => v as TeamRole),
    valid_from: z.string().min(1, "Choose a start date"),
    valid_to: z.string().transform((v) => v || null),
    journl_access: z.boolean(),
  })
  .refine((v) => !v.valid_to || v.valid_to >= v.valid_from, { message: "End date can't be before the start date", path: ["valid_to"] });

export const assignmentEditSchema = z.object({
  valid_to: z.string().transform((v) => v || null),
  journl_access: z.boolean(),
});

export type AssignmentFormValues = z.input<typeof assignmentFormSchema>;
export type AssignmentFormOutput = z.output<typeof assignmentFormSchema>;
export type AssignmentEditValues = z.input<typeof assignmentEditSchema>;
export type AssignmentEditOutput = z.output<typeof assignmentEditSchema>;
