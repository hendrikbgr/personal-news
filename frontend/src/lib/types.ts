export interface Feed {
  id: string;
  name: string;
  url: string;
  category: string;
  source: string;
  emoji: string;
  is_active: boolean;
  created: string;
  updated: string;
}

export interface Article {
  id: string;
  title: string;
  description: string;
  content: string;
  summary: string;
  keywords: string;
  url: string;
  image_url: string;
  published_at: string;
  feed_id: string;
  category: string;
  author: string;
  word_count: number;
  is_read: boolean;
  is_saved: boolean;
  fetch_status: string;
  created: string;
  updated: string;
  expand?: {
    feed_id?: Feed;
  };
}

export interface PaginatedResult<T> {
  page: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
  items: T[];
}

export interface Category {
  id: string;
  name: string;
  emoji: string;
  color: string;
}

export interface FetchStatus {
  scheduler_running: boolean;
  fetch_interval_minutes: number;
  last_run: string | null;
  last_stats: { feeds_processed: number; new_articles: number } | null;
  is_fetching: boolean;
}

export type CategoryColor =
  | "blue"
  | "purple"
  | "green"
  | "amber"
  | "rose"
  | "orange"
  | "pink"
  | "indigo";
