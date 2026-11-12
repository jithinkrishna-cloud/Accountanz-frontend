export interface Article {
  id: number;
  title: string;
  category: string;
  summary: string | null;
  body: string;
  updated_by_email: string | null;
  updated_at: string;
}
