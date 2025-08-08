import type { User } from "@/types/feed";

export interface CommentRecord {
  id: string;
  post_id: string;
  user_id: string;
  parent_id?: string | null;
  content: string;
  content_type: string;
  metadata: any;
  is_deleted: boolean;
  reactions_count: number;
  replies_count: number;
  created_at: string;
  updated_at: string;
}

export interface Comment extends CommentRecord {
  author?: Partial<User> | null;
  children?: Comment[];
}
