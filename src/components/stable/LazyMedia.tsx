import React, { memo, useState, useCallback, useMemo } from 'react';
import { useLazyMedia } from '@/hooks/useAdvancedIntersectionObserver';
import { StableContainer } from './StableContainer';
import { cn } from '@/lib/utils';
import { Play, FileText, Download, Volume2, VolumeX } from 'lucide-react';
import type { Post } from '@/types/feed';

interface LazyMediaProps {
  media: Post['media'];
  postId: string;
  aspectRatio?: string;
  className?: string;
}

// Lazy Media Component with Optimized Loading
const LazyMedia = memo<LazyMediaProps>(({
  media,
  postId,
  aspectRatio = '16/9',
  className
}) => {
  const { ref, shouldLoad, wasVisible } = useLazyMedia();
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const [errorStates, setErrorStates] = useState<Record<string, boolean>>({});
  const [playingVideo, setPlayingVideo] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(true);

  // Handle media loading states
  const handleLoadStart = useCallback((mediaId: string) => {
    setLoadingStates(prev => ({ ...prev, [mediaId]: true }));
  }, []);

  const handleLoadEnd = useCallback((mediaId: string) => {
    setLoadingStates(prev => ({ ...prev, [mediaId]: false }));
  }, []);

  const handleError = useCallback((mediaId: string) => {
    setErrorStates(prev => ({ ...prev, [mediaId]: true }));
    setLoadingStates(prev => ({ ...prev, [mediaId]: false }));
  }, []);

  // Video play/pause handling
  const handleVideoToggle = useCallback((mediaId: string, videoElement: HTMLVideoElement) => {
    if (playingVideo === mediaId) {
      videoElement.pause();
      setPlayingVideo(null);
    } else {
      // Pause other videos first
      if (playingVideo) {
        const otherVideo = document.querySelector(`video[data-media-id="${playingVideo}"]`) as HTMLVideoElement;
        otherVideo?.pause();
      }
      
      videoElement.play();
      setPlayingVideo(mediaId);
    }
  }, [playingVideo]);

  // Mute toggle
  const handleMuteToggle = useCallback(() => {
    setIsMuted(prev => !prev);
    
    // Apply to all video elements in this media container
    const videos = document.querySelectorAll(`[data-post-id="${postId}"] video`);
    videos.forEach((video: HTMLVideoElement) => {
      video.muted = !isMuted;
    });
  }, [isMuted, postId]);

  // Download file
  const handleDownload = useCallback((url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  // Memoized media grid layout
  const gridLayout = useMemo(() => {
    if (!media || media.length === 0) return '';
    
    switch (media.length) {
      case 1:
        return 'grid-cols-1';
      case 2:
        return 'grid-cols-2';
      case 3:
        return 'grid-cols-2 [&>:first-child]:col-span-2';
      case 4:
        return 'grid-cols-2';
      default:
        return 'grid-cols-2';
    }
  }, [media?.length]);

  if (!media || media.length === 0) {
    return null;
  }

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      className={cn('lazy-media-container', 'relative w-full overflow-hidden rounded-lg', className)}
      style={{ aspectRatio: media.length === 1 ? aspectRatio : undefined }}
      data-post-id={postId}
    >
      {/* Loading placeholder */}
      {!shouldLoad && !wasVisible && (
        <div className="w-full h-48 bg-muted animate-pulse rounded-lg flex items-center justify-center">
          <div className="text-muted-foreground text-sm">Loading media...</div>
        </div>
      )}

      {/* Media grid */}
      {shouldLoad && (
        <div className={cn('grid gap-2 rounded-lg overflow-hidden', gridLayout)}>
          {media.slice(0, 4).map((item, index) => (
            <div key={item.id} className="relative group overflow-hidden rounded-lg bg-muted">
              {/* Show "+X more" overlay for excess items */}
              {index === 3 && media.length > 4 && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-semibold text-lg z-10">
                  +{media.length - 4} more
                </div>
              )}

              {/* Image */}
              {item.type === 'image' && (
                <img
                  src={item.url}
                  alt={item.alt}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                  onLoadStart={() => handleLoadStart(item.id)}
                  onLoad={() => handleLoadEnd(item.id)}
                  onError={() => handleError(item.id)}
                />
              )}

              {/* Video */}
              {item.type === 'video' && (
                <div className="relative w-full h-full">
                  <video
                    src={item.url}
                    poster={item.thumbnail}
                    className="w-full h-full object-cover"
                    muted={isMuted}
                    loop
                    playsInline
                    data-media-id={item.id}
                    onLoadStart={() => handleLoadStart(item.id)}
                    onLoadedData={() => handleLoadEnd(item.id)}
                    onError={() => handleError(item.id)}
                  />
                  
                  {/* Video controls overlay */}
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const video = e.currentTarget.parentElement?.querySelector('video') as HTMLVideoElement;
                        if (video) handleVideoToggle(item.id, video);
                      }}
                      className="bg-black/60 text-white p-3 rounded-full hover:bg-black/80 transition-colors"
                    >
                      <Play className="h-6 w-6" />
                    </button>
                  </div>

                  {/* Mute button */}
                  <button
                    onClick={handleMuteToggle}
                    className="absolute top-2 right-2 bg-black/60 text-white p-1.5 rounded-full hover:bg-black/80 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </button>

                  {/* Duration indicator */}
                  {item.duration && (
                    <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                      {Math.floor(item.duration / 60)}:{(item.duration % 60).toString().padStart(2, '0')}
                    </div>
                  )}
                </div>
              )}

              {/* Audio */}
              {item.type === 'audio' && (
                <div className="w-full h-32 bg-muted flex items-center justify-center p-4">
                  <audio
                    src={item.url}
                    controls
                    className="w-full"
                    onLoadStart={() => handleLoadStart(item.id)}
                    onLoadedData={() => handleLoadEnd(item.id)}
                    onError={() => handleError(item.id)}
                  />
                </div>
              )}

              {/* Document */}
              {item.type === 'document' && (
                <div className="w-full h-32 bg-muted flex items-center justify-center p-4 group cursor-pointer">
                  <div className="text-center">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm font-medium truncate">{item.alt}</p>
                    <button
                      onClick={() => handleDownload(item.url, item.alt || 'document')}
                      className="mt-2 inline-flex items-center text-xs text-primary hover:text-primary/80"
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Download
                    </button>
                  </div>
                </div>
              )}

              {/* Loading indicator */}
              {loadingStates[item.id] && (
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                  <div className="bg-white/90 text-gray-900 px-3 py-1 rounded-full text-sm">
                    Loading...
                  </div>
                </div>
              )}

              {/* Error indicator */}
              {errorStates[item.id] && (
                <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
                  <div className="bg-red-500 text-white px-3 py-1 rounded-full text-sm">
                    Failed to load
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

LazyMedia.displayName = 'LazyMedia';

export { LazyMedia };