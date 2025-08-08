import { 
  Lightbulb,
  Wrench,
  BookOpen
} from 'lucide-react';
import type { ReactionType } from '@/types/feed';

export const REACTION_CONFIG = {
  innovative: {
    icon: Lightbulb,
    label: 'Innovative',
    color: 'text-primary',
    hoverColor: 'hover:text-primary',
    bgHover: 'hover:bg-primary/10',
  },
  practical: {
    icon: Wrench,
    label: 'Practical',
    color: 'text-accent',
    hoverColor: 'hover:text-accent',
    bgHover: 'hover:bg-accent/10',
  },
  well_researched: {
    icon: BookOpen,
    label: 'Well-Researched',
    color: 'text-foreground',
    hoverColor: 'hover:text-foreground',
    bgHover: 'hover:bg-muted/30',
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