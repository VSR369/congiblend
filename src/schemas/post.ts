import { z } from 'zod';

export const postSchema = z.object({
  content: z.string().min(1, "Content cannot be empty").max(5000, "Content too long"),
  visibility: z.enum(['public', 'connections', 'private']),
  type: z.enum(['text', 'image', 'video', 'article', 'event', 'poll']),
  media_urls: z.array(z.string().url()).optional(),
  hashtags: z.array(z.string()).optional(),
  mentions: z.array(z.string()).optional(),
});

// Comment schema removed - comments functionality not implemented

export const reactionSchema = z.object({
  target_type: z.enum(['post']),
  target_id: z.string().uuid(),
  reaction_type: z.enum(['innovative', 'practical', 'well_researched']),
});

export type PostFormData = z.infer<typeof postSchema>;
// CommentFormData removed - comments functionality not implemented
export type ReactionFormData = z.infer<typeof reactionSchema>;