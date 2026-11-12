"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { FormField } from "@/components/shared/form-field";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { applyApiError } from "@/lib/form-errors";
import { useSaveArticle } from "../hooks/use-knowledge";
import { articleFormSchema, type ArticleFormValues } from "../schemas/knowledge.schema";
import type { Article } from "../types/knowledge.types";

/** `article`: undefined = closed, null = new, otherwise the article being edited. */
export function ArticleFormDialog({ article, onClose }: { article: Article | null | undefined; onClose: () => void }) {
  const open = article !== undefined;
  const save = useSaveArticle(article?.id);
  const { register, handleSubmit, reset, setError, formState: { errors } } = useForm<ArticleFormValues>({ resolver: zodResolver(articleFormSchema) });

  useEffect(() => {
    if (open) reset({ title: article?.title ?? "", category: article?.category ?? "", summary: article?.summary ?? "", body: article?.body ?? "" });
  }, [open, article, reset]);

  const onSubmit = handleSubmit(async (v) => {
    try {
      await save.mutateAsync(v);
      toast.success(article ? "Article updated" : "Article published");
      onClose();
    } catch (err) {
      applyApiError(err, setError, ["title", "category", "summary", "body"]);
    }
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{article ? "Edit article" : "New article"}</DialogTitle>
          <DialogDescription>Accountants read these in their workspace; only administrators can edit them.</DialogDescription>
        </DialogHeader>
        <form id="article-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
          <FormField id="title" label="Title" error={errors.title?.message}>
            <Input id="title" autoFocus aria-invalid={!!errors.title} {...register("title")} />
          </FormField>
          <FormField id="category" label="Category" error={errors.category?.message}>
            <Input id="category" placeholder="Month-end, Documents…" aria-invalid={!!errors.category} {...register("category")} />
          </FormField>
          <FormField id="summary" label="Summary" error={errors.summary?.message} className="sm:col-span-2">
            <Input id="summary" {...register("summary")} />
          </FormField>
          <FormField id="body" label="Article" error={errors.body?.message} className="sm:col-span-2">
            <Textarea id="body" rows={12} aria-invalid={!!errors.body} {...register("body")} />
          </FormField>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <SubmitButton form="article-form" pending={save.isPending}>Save article</SubmitButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
