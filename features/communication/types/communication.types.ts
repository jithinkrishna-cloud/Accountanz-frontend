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
  last_author_id: number | null;
  last_from_client: 0 | 1 | null;
  /** How many times you're @mentioned in this conversation. */
  mentions_me?: number;
}

export interface Message {
  id: number;
  body: string;
  created_at: string;
  author: string | null;
  author_id: number | null;
  from_client: 0 | 1;
  mentions: { user_id: number; full_name: string }[];
}

export interface ThreadDetail extends Thread {
  items: Message[];
}

export type MeetingRequestStatus = "pending" | "scheduled" | "declined" | "withdrawn";

/** A client's request for a meeting. preferred_times are ISO strings (UTC). */
export interface MeetingRequest {
  id: number;
  client_id: number;
  client_name: string;
  requested_by: number | null;
  requester: string | null;
  topic: string;
  notes: string | null;
  preferred_times: string[];
  duration_minutes: number;
  status: MeetingRequestStatus;
  meeting_id: number | null;
  decided_by_name: string | null;
  decided_at: string | null;
  decline_reason: string | null;
  created_at: string;
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
