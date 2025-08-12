import { useMemo } from 'react';
import type { Post } from '@/types/feed';

interface AdaptiveHeightConfig {
  baseHeight: number;
  headerHeight: number;
  actionsHeight: number;
  textLineHeight: number;
  maxTextLines: number;
  mediaHeights: {
    portrait: number;
    landscape: number;
    video: number;
  };
  pollOptionHeight: number;
  padding: number;
}

const DEFAULT_CONFIG: AdaptiveHeightConfig = {
  baseHeight: 50,
  headerHeight: 64,
  actionsHeight: 56,
  textLineHeight: 24,
  maxTextLines: 4,
  mediaHeights: {
    portrait: 400,
    landscape: 300,
    video: 350,
  },
  pollOptionHeight: 40,
  padding: 24,
};

export function useAdaptivePostHeight(post: Post, expanded: boolean = false, config: Partial<AdaptiveHeightConfig> = {}) {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };

  const calculatedHeight = useMemo(() => {
    let height = fullConfig.baseHeight + fullConfig.headerHeight + fullConfig.actionsHeight;

    // Calculate text content height
    if (post.content) {
      const estimatedLines = Math.ceil(post.content.length / 50); // rough character count per line
      const visibleLines = expanded ? estimatedLines : Math.min(estimatedLines, fullConfig.maxTextLines);
      height += visibleLines * fullConfig.textLineHeight;
    }

    // Add media height
    if (post.media && post.media.length > 0) {
      const firstMedia = post.media[0];
      if (firstMedia.type === 'video') {
        height += fullConfig.mediaHeights.video;
      } else if (firstMedia.type === 'image') {
        // Default to landscape layout - we don't have metadata in current schema
        height += fullConfig.mediaHeights.landscape;
      }
    }

    if (post.event) {
      height += 120; // estimated event content height
    }

    // Add hashtags height if present
    if (post.hashtags && post.hashtags.length > 0) {
      height += 40; // estimated hashtags height
    }

    return Math.max(height, 250); // minimum height
  }, [post, expanded, fullConfig]);

  const shouldTruncateText = useMemo(() => {
    if (!post.content) return false;
    const estimatedLines = Math.ceil(post.content.length / 50);
    return estimatedLines > fullConfig.maxTextLines;
  }, [post.content, fullConfig.maxTextLines]);

  const truncatedContent = useMemo(() => {
    if (!post.content || !shouldTruncateText || expanded) return post.content;
    
    // Smart truncation - cut at word boundaries
    const maxChars = fullConfig.maxTextLines * 50;
    if (post.content.length <= maxChars) return post.content;
    
    const truncated = post.content.substring(0, maxChars);
    const lastSpaceIndex = truncated.lastIndexOf(' ');
    return lastSpaceIndex > maxChars * 0.8 ? truncated.substring(0, lastSpaceIndex) : truncated;
  }, [post.content, shouldTruncateText, expanded, fullConfig.maxTextLines]);

  return {
    height: calculatedHeight,
    shouldTruncateText,
    truncatedContent,
    estimateSize: () => calculatedHeight,
  };
}