"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { DataTable, type Column } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { SubmitButton } from "@/components/shared/submit-button";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { applyApiError } from "@/lib/form-errors";
import { formatDate } from "@/lib/format";
import { useArticles, useDeleteArticle } from "../hooks/use-knowledge";
import type { Article } from "../types/knowledge.types";
import { ArticleFormDialog } from "./article-form-dialog";

function DeleteArticleDialog({ article, onClose }: { article: Article | null; onClose: () => void }) {
  const remove = useDeleteArticle();
  if (!article) return null;
  const confirm = async () => {
    try {
      await remove.mutateAsync(article.id);
      toast.success("Article deleted");
      onClose();
    } catch (err) {
      applyApiError(err);
    }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete “{article.title}”?</DialogTitle>
          <DialogDescription>Accountants will no longer see this SOP. This can&apos;t be undone.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <SubmitButton type="button" variant="destructive" pending={remove.isPending} onClick={confirm}>Delete article</SubmitButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ArticleList() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Article | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<Article | null>(null);
  const query = useArticles({ q, page });

  const columns: Column<Article>[] = [
    {
      key: "title",
      header: "Title",
      cell: (a) => (
        <div className="min-w-0">
          <p className="font-medium">{a.title}</p>
          {a.summary && <p className="text-muted-foreground truncate text-xs">{a.summary}</p>}
        </div>
      ),
    },
    { key: "category", header: "Category", hideOnMobile: true, cell: (a) => <span className="bg-secondary rounded px-1.5 py-0.5 text-xs">{a.category}</span> },
    { key: "edit", header: "Last edit", hideOnMobile: true, cell: (a) => <span className="text-muted-foreground whitespace-nowrap">{formatDate(a.updated_at)} · {a.updated_by_email ?? "system"}</span> },
    {
      key: "actions",
      header: "",
      className: "text-right whitespace-nowrap",
      cell: (a) => (
        <>
          <Button variant="outline" size="sm" onClick={() => setEditing(a)}>Edit</Button>
          <Button variant="ghost" size="icon" aria-label={`Delete ${a.title}`} onClick={() => setDeleting(a)}><Trash2 className="size-4" /></Button>
        </>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Knowledge Base"
        description="SOPs the accounting team reads. Only administrators can edit them."
        actions={<Button onClick={() => setEditing(null)}><Plus className="size-4" /> New article</Button>}
      />
      <div className="bg-card rounded-xl border shadow-xs">
        <div className="border-b p-4">
          <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search articles…" />
        </div>
        <DataTable
          columns={columns}
          rows={query.data?.items}
          rowKey={(a) => a.id}
          isLoading={query.isLoading}
          error={query.error}
          onRetry={() => void query.refetch()}
          empty={{ title: q ? "No articles match" : "No articles yet", description: q ? undefined : "Write the SOPs your accountants follow." }}
          pagination={query.data && { ...query.data, onPageChange: setPage }}
        />
      </div>
      <ArticleFormDialog article={editing} onClose={() => setEditing(undefined)} />
      <DeleteArticleDialog article={deleting} onClose={() => setDeleting(null)} />
    </>
  );
}
