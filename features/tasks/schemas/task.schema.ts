import { z } from "zod";
import { RECURRENCES } from "../types/task.types";

// Mirrors backend tasks/task.validation.ts and task-templates/task-template.validation.ts.
export const generateFormSchema = z.object({
  period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Pick a month"),
});

export const templateFormSchema = z.object({
  name: z.string().trim().min(2, "Enter a template name").max(150),
  service_id: z.string().min(1, "Pick a service"),
  recurrence: z.enum(RECURRENCES),
  due_day_of_period: z.coerce.number<string | number>({ message: "Enter a day" }).int("Use a whole day").min(1, "Use a day from 1 to 31").max(31, "Use a day from 1 to 31"),
});

/** Checklist is typed one point per line. */
export const itemFormSchema = z.object({
  title: z.string().trim().min(2, "Enter a title").max(200),
  checklist: z
    .string()
    .transform((text) => text.split("\n").map((l) => l.trim()).filter(Boolean))
    .pipe(z.array(z.string().max(200, "Keep each point under 200 characters")).min(1, "Add at least one checklist point").max(30, "Use at most 30 points")),
  client_visible: z.boolean(),
});

/** One-off task form (mirrors backend tasks/task.validation.ts createTaskSchema). */
export const taskFormSchema = z
  .object({
    client_id: z.string().min(1, "Pick a client"),
    engagement_id: z.string().min(1, "Pick an engagement"),
    title: z.string().trim().min(2, "Enter a title").max(200),
    description: z.string().trim().max(5000),
    assignee_id: z.string().min(1, "Pick an assignee"),
    reviewer_id: z.string().min(1, "Pick a reviewer"),
    period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Pick a month"),
    due_date: z.iso.date("Pick a due date"),
    client_visible: z.boolean(),
    checklist: z
      .string()
      .transform((text) => text.split("\n").map((l) => l.trim()).filter(Boolean))
      .pipe(z.array(z.string().max(200, "Keep each point under 200 characters")).min(1, "Add at least one checklist point").max(30, "Use at most 30 points")),
  })
  .refine((v) => v.assignee_id !== v.reviewer_id, { path: ["reviewer_id"], message: "The reviewer must be someone other than the assignee" });

export const workLogFormSchema = z.object({
  minutes: z.coerce.number<string | number>({ message: "Enter minutes" }).int("Use whole minutes").min(1, "Log at least 1 minute").max(720, "At most 12 hours per entry"),
  note: z.string().trim().max(500),
  logged_on: z.iso.date("Pick the date"),
});

export type TaskFormValues = z.input<typeof taskFormSchema>;
export type TaskFormOutput = z.output<typeof taskFormSchema>;
export type WorkLogFormValues = z.input<typeof workLogFormSchema>;
export type WorkLogFormOutput = z.output<typeof workLogFormSchema>;
export type GenerateFormValues = z.infer<typeof generateFormSchema>;
export type TemplateFormValues = z.input<typeof templateFormSchema>;
export type TemplateFormOutput = z.output<typeof templateFormSchema>;
export type ItemFormValues = z.input<typeof itemFormSchema>;
export type ItemFormOutput = z.output<typeof itemFormSchema>;
