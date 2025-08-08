import { 
  ThumbsUp, 
  Heart, 
  Lightbulb, 
  Target, 
  Award,
  Smile
} from 'lucide-react';
import type { ReactionType } from '@/types/feed';

export const REACTION_CONFIG = {
  like: {
    icon: ThumbsUp,
    label: 'Like',
    color: 'text-primary',
    hoverColor: 'hover:text-primary',
    bgHover: 'hover:bg-primary/10',
  },
  love: {
    icon: Heart,
    label: 'Love',
    color: 'text-red-600',
    hoverColor: 'hover:text-red-600',
    bgHover: 'hover:bg-red-50',
  },
  insightful: {
    icon: Lightbulb,
    label: 'Insightful',
    color: 'text-yellow-600',
    hoverColor: 'hover:text-yellow-600',
    bgHover: 'hover:bg-yellow-50',
  },
  support: {
    icon: Target,
    label: 'Support',
    color: 'text-accent',
    hoverColor: 'hover:text-accent',
    bgHover: 'hover:bg-accent/10',
  },
  celebrate: {
    icon: Award,
    label: 'Celebrate',
    color: 'text-purple-600',
    hoverColor: 'hover:text-purple-600',
    bgHover: 'hover:bg-purple-50',
  },
  curious: {
    icon: Smile,
    label: 'Curious',
    color: 'text-pink-600',
    hoverColor: 'hover:text-pink-600',
    bgHover: 'hover:bg-pink-50',
  },
} as const;

export const getReactionCounts = (reactions: { type: ReactionType }[]) => {
  return reactions.reduce((acc, reaction) => {
    acc[reaction.type] = (acc[reaction.type] || 0) + 1;
    return acc;
  }, {} as Record<ReactionType, number>);
};

export const getMostCommonReactions = (reactions: { type: ReactionType }[], limit = 3) => {
  const counts = getReactionCounts(reactions);
  return Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([type, count]) => ({ type: type as ReactionType, count }));
};