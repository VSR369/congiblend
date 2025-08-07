import { z } from 'zod';

export const postSchema = z.object({
  content: z.string().min(1, "Content cannot be empty").max(5000, "Content too long"),
  visibility: z.enum(['public', 'connections', 'private']),
  type: z.enum(['text', 'image', 'video', 'article', 'poll', 'event']),
  media_urls: z.array(z.string().url()).optional(),
  hashtags: z.array(z.string()).optional(),
  mentions: z.array(z.string()).optional(),
});

export const commentSchema = z.object({
  content: z.string().min(1, "Comment cannot be empty").max(1000, "Comment too long"),
  post_id: z.string().uuid(),
  parent_id: z.string().uuid().optional(),
});

export const reactionSchema = z.object({
  target_type: z.enum(['post', 'comment']),
  target_id: z.string().uuid(),
  reaction_type: z.enum(['like', 'love', 'insightful', 'support', 'celebrate', 'curious']),
});

export type PostFormData = z.infer<typeof postSchema>;
export type CommentFormData = z.infer<typeof commentSchema>;
export type ReactionFormData = z.infer<typeof reactionSchema>;