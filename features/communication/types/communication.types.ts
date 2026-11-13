export type ThreadVisibility = "client" | "internal";

export interface Thread {
  id: number;
  client_id: number;
  client_name: string;
  subject: string | null;
  visibility: ThreadVisibility;
  created_at: string;
  messages: number;
  last_at: string | null;
  last_body: string | null;
  last_author: string | null;
  last_from_client: 0 | 1 | null;
}

export interface Message {
  id: number;
  body: string;
  created_at: string;
  author: string | null;
  author_id: number | null;
  from_client: 0 | 1;
}

export interface ThreadDetail extends Thread {
  items: Message[];
}

export interface Meeting {
  id: number;
  client_id: number;
  client_name: string;
  title: string;
  starts_at: string;
  ends_at: string;
  meeting_link: string | null;
  organiser_id: number | null;
  organiser: string | null;
  attendees: string | null;
}
