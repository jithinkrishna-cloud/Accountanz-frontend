import { z } from "zod";

export const articleFormSchema = z.object({
  title: z.string().trim().min(2, "Enter a title").max(200),
  category: z.string().trim().min(2, "Enter a category").max(80),
  summary: z.string().trim().max(500),
  body: z.string().trim().min(1, "Write the article").max(60000),
});

export type ArticleFormValues = z.infer<typeof articleFormSchema>;
