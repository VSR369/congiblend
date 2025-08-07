import * as React from "react";
import { X, Image, Video, FileText, Calendar, Briefcase, BarChart3, Hash, AtSign, Smile, Music } from "lucide-react";
import { Modal, ModalHeader, ModalBody, ModalFooter, ModalTitle } from "./modal";
import { Button } from "./button";
import { Input } from "./input";
import { Textarea } from "./textarea";
import { Badge } from "./badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";
import { Progress } from "./progress";
import { PostTypeSelector } from "./post-type-selector";
import { MediaUploadArea } from "./media-upload-area";
import { useFeedStore } from "@/stores/feedStore";
import { postSchema } from "@/schemas/post";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePostCreationReducer } from "@/hooks/usePostCreationReducer";
import type { PostType, CreatePostData } from "@/types/feed";

interface PostCreationModalProps {
  open: boolean;
  onClose: () => void;
}

// Optimized post creation modal with useReducer state management
export const PostCreationModal = React.memo(({ open, onClose }: PostCreationModalProps) => {
  // Performance monitoring
  const renderCountRef = React.useRef(0);
  const lastRenderTime = React.useRef(Date.now());
  
  React.useEffect(() => {
    renderCountRef.current++;
    const now = Date.now();
    console.log('📝 PostCreationModal re-render:', {
      count: renderCountRef.current,
      timeSinceLastRender: now - lastRenderTime.current,
      open,
      timestamp: now
    });
    lastRenderTime.current = now;
  });

  const { state, dispatch } = usePostCreationReducer();
  const { createPost } = useFeedStore();
  
  // Destructure state for cleaner access
  const {
    activeTab,
    content,
    hashtags,
    mentions,
    isPosting,
    selectedFiles,
    pollOptions,
    eventData,
    jobData
  } = state;

  const postTypes: { type: PostType; label: string; icon: React.ComponentType<any>; description: string }[] = [
    { type: "text", label: "Text", icon: FileText, description: "Share your thoughts" },
    { type: "image", label: "Photo", icon: Image, description: "Share images" },
    { type: "video", label: "Video", icon: Video, description: "Upload videos" },
    { type: "audio", label: "Audio", icon: Music, description: "Share audio files" },
    { type: "article", label: "Article", icon: FileText, description: "Write long-form content" },
    { type: "poll", label: "Poll", icon: BarChart3, description: "Ask your network" },
    { type: "event", label: "Event", icon: Calendar, description: "Announce events" },
    { type: "job", label: "Job", icon: Briefcase, description: "Post job openings" },
  ];

  // Get file type restrictions based on active tab
  const getAcceptedFileTypes = (): string[] => {
    switch (activeTab) {
      case "image":
        return ["image/jpeg", "image/png", "image/gif", "image/webp"];
      case "video":
        return ["video/mp4", "video/webm", "video/mov", "video/avi"];
      case "audio":
        return ["audio/mp3", "audio/wav", "audio/ogg", "audio/m4a"];
      default:
        return [];
    }
  };

  // Get max file size based on active tab
  const getMaxFileSize = (): number => {
    switch (activeTab) {
      case "image":
        return 10 * 1024 * 1024; // 10MB
      case "video":
        return 100 * 1024 * 1024; // 100MB
      case "audio":
        return 50 * 1024 * 1024; // 50MB
      default:
        return 10 * 1024 * 1024; // 10MB default
    }
  };

  const handleFileSelection = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    console.log('📁 Files selected:', event.target.files?.length);
    const files = Array.from(event.target.files || []);
    dispatch({ type: 'SET_SELECTED_FILES', payload: files });
  }, [dispatch]);

  const handleFileRemoval = React.useCallback((index: number) => {
    console.log('🗑️ Removing file at index:', index);
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    dispatch({ type: 'SET_SELECTED_FILES', payload: newFiles });
  }, [selectedFiles, dispatch]);

  const handleSubmit = React.useCallback(async () => {
    if (!content.trim()) return;

    console.log('📤 Starting post submission...');
    dispatch({ type: 'SET_IS_POSTING', payload: true });
    
    try {
      // Upload files using the media edge function for better handling
      let mediaUrls: string[] = [];
      if (selectedFiles.length > 0) {
        console.log('📤 Uploading files:', selectedFiles.length);
        
        const uploadPromises = selectedFiles.map(async (file) => {
          const formData = new FormData();
          formData.append('file', file);
          
          // Get the session token for authentication
          const { data: { session } } = await supabase.auth.getSession();
          if (!session?.access_token) {
            throw new Error('Not authenticated');
          }
          
          // Make direct HTTP request to the media function with proper headers
          const response = await fetch(`https://cmtehutbazgfjoksmkly.supabase.co/functions/v1/media`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: formData,
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error('Upload error:', response.status, errorText);
            throw new Error(`Failed to upload ${file.name}: ${response.status} ${errorText}`);
          }

          const data = await response.json();
          
          if (!data?.url) {
            throw new Error(`Failed to get upload URL for ${file.name}`);
          }

          console.log('✅ File uploaded:', file.name, '-> URL:', data.url);
          return data.url;
        });

        mediaUrls = await Promise.all(uploadPromises);
        console.log('✅ All files uploaded:', mediaUrls);
      }

      const postData: CreatePostData = {
        content: content.trim(),
        post_type: activeTab,
        visibility: "public",
        media_urls: mediaUrls, // Include uploaded media URLs
      };

      // Add poll data if it's a poll post
      if (activeTab === 'poll' && pollOptions.some(opt => opt.trim())) {
        postData.poll_data = {
          options: pollOptions
            .filter(opt => opt.trim())
            .map(text => ({ text: text.trim(), votes: 0 })),
          multiple_choice: false
        };
      }

      // Add event data if it's an event post
      if (activeTab === 'event') {
        // Validate required event fields
        if (!eventData.title.trim()) {
          throw new Error('Event title is required');
        }
        if (!eventData.description.trim()) {
          throw new Error('Event description is required');
        }
        if (!eventData.start_date) {
          throw new Error('Event start date is required');
        }

        postData.event_data = {
          title: eventData.title.trim(),
          description: eventData.description.trim(),
          start_date: eventData.start_date,
          end_date: eventData.end_date || null,
          location: eventData.location.trim() || null,
          max_attendees: eventData.max_attendees ? parseInt(eventData.max_attendees) : null,
          is_virtual: eventData.is_virtual,
          is_hybrid: eventData.is_hybrid
        };
      }

      await createPost(postData);
      
      // Reset form using reducer
      dispatch({ type: 'RESET_FORM' });
      onClose();
      
      toast.success("Post created successfully!");
    } catch (error) {
      console.error("Failed to create post:", error);
      
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Failed to create post. Please try again.");
      }
    } finally {
      dispatch({ type: 'SET_IS_POSTING', payload: false });
    }
  }, [content, selectedFiles, activeTab, pollOptions, eventData, jobData, hashtags, mentions, createPost, onClose, dispatch]);

  const extractHashtags = React.useCallback((text: string) => {
    const start = performance.now();
    const hashtagRegex = /#[\w]+/g;
    const matches = text.match(hashtagRegex) || [];
    const result = [...new Set(matches)];
    const end = performance.now();
    if (end - start > 1) {
      console.log('⚡ Hashtag extraction took:', end - start, 'ms');
    }
    return result;
  }, []);

  const extractMentions = React.useCallback((text: string) => {
    const start = performance.now();
    const mentionRegex = /@[\w]+/g;
    const matches = text.match(mentionRegex) || [];
    const result = [...new Set(matches.map(m => m.substring(1)))];
    const end = performance.now();
    if (end - start > 1) {
      console.log('⚡ Mention extraction took:', end - start, 'ms');
    }
    return result;
  }, []);

  React.useEffect(() => {
    const hashtags = extractHashtags(content);
    const mentions = extractMentions(content);
    dispatch({ type: 'SET_HASHTAGS', payload: hashtags });
    dispatch({ type: 'SET_MENTIONS', payload: mentions });
  }, [content, extractHashtags, extractMentions, dispatch]);

  // Clear files when switching post types
  React.useEffect(() => {
    if (!['image', 'video', 'audio'].includes(activeTab)) {
      dispatch({ type: 'SET_SELECTED_FILES', payload: [] });
    }
  }, [activeTab, dispatch]);

  const characterLimit = 3000;
  const characterCount = content.length;
  const progressPercentage = (characterCount / characterLimit) * 100;

  const renderContentEditor = () => {
    switch (activeTab) {
      case "poll":
        return (
          <div className="space-y-4">
            <Textarea
              placeholder="Ask a question..."
              value={content}
              onChange={(e) => dispatch({ type: 'SET_CONTENT', payload: e.target.value })}
              className="min-h-24"
            />
            <div className="space-y-2">
              <label className="text-sm font-medium">Poll Options</label>
              {pollOptions.map((option, i) => (
                <Input
                  key={i}
                  value={option}
                  onChange={(e) => {
                    const newOptions = [...pollOptions];
                    newOptions[i] = e.target.value;
                    dispatch({ type: 'SET_POLL_OPTIONS', payload: newOptions });
                  }}
                  placeholder={`Option ${i + 1}`}
                  className="w-full"
                />
              ))}
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => dispatch({ type: 'SET_POLL_OPTIONS', payload: [...pollOptions, ''] })}
              >
                Add Option
              </Button>
            </div>
          </div>
        );

      case "event":
        return (
          <div className="space-y-4">
            <Input 
              placeholder="Event title *"
              value={eventData.title}
              onChange={(e) => dispatch({ type: 'SET_EVENT_DATA', payload: { title: e.target.value } })}
              className="w-full"
            />
            <Textarea
              placeholder="Event description *"
              value={eventData.description}
              onChange={(e) => dispatch({ type: 'SET_EVENT_DATA', payload: { description: e.target.value } })}
              className="min-h-24"
            />
            <div className="grid grid-cols-2 gap-4">
              <Input 
                placeholder="Location"
                value={eventData.location}
                onChange={(e) => dispatch({ type: 'SET_EVENT_DATA', payload: { location: e.target.value } })}
              />
              <Input 
                type="number" 
                placeholder="Max attendees"
                value={eventData.max_attendees}
                onChange={(e) => dispatch({ type: 'SET_EVENT_DATA', payload: { max_attendees: e.target.value } })}
              />
              <Input 
                type="datetime-local"
                placeholder="Start date & time *"
                value={eventData.start_date}
                onChange={(e) => dispatch({ type: 'SET_EVENT_DATA', payload: { start_date: e.target.value } })}
              />
              <Input 
                type="datetime-local"
                placeholder="End date & time"
                value={eventData.end_date}
                onChange={(e) => dispatch({ type: 'SET_EVENT_DATA', payload: { end_date: e.target.value } })}
              />
            </div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={eventData.is_virtual}
                  onChange={(e) => dispatch({ type: 'SET_EVENT_DATA', payload: { is_virtual: e.target.checked } })}
                />
                <span className="text-sm">Virtual Event</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={eventData.is_hybrid}
                  onChange={(e) => dispatch({ type: 'SET_EVENT_DATA', payload: { is_hybrid: e.target.checked } })}
                />
                <span className="text-sm">Hybrid Event</span>
              </label>
            </div>
          </div>
        );

      case "job":
        return (
          <div className="space-y-4">
            <Textarea
              placeholder="Describe the job opportunity..."
              value={content}
              onChange={(e) => dispatch({ type: 'SET_CONTENT', payload: e.target.value })}
              className="min-h-24"
            />
            <div className="grid grid-cols-2 gap-4">
              <Input 
                placeholder="Job title"
                value={jobData.title}
                onChange={(e) => dispatch({ type: 'SET_JOB_DATA', payload: { title: e.target.value } })}
              />
              <Input 
                placeholder="Company"
                value={jobData.company}
                onChange={(e) => dispatch({ type: 'SET_JOB_DATA', payload: { company: e.target.value } })}
              />
              <Input 
                placeholder="Location"
                value={jobData.location}
                onChange={(e) => dispatch({ type: 'SET_JOB_DATA', payload: { location: e.target.value } })}
              />
              <Input 
                placeholder="Salary range"
                value={jobData.salary}
                onChange={(e) => dispatch({ type: 'SET_JOB_DATA', payload: { salary: e.target.value } })}
              />
            </div>
          </div>
        );

      case "image":
      case "video":
      case "audio":
        return (
          <div className="space-y-4">
            <Textarea
              placeholder={`What would you like to say about ${
                activeTab === "image" ? "these photos" : 
                activeTab === "video" ? "this video" : 
                "this audio"
              }?`}
              value={content}
              onChange={(e) => dispatch({ type: 'SET_CONTENT', payload: e.target.value })}
              className="min-h-24"
            />
            <div className="space-y-4">
              <input
                type="file"
                accept={getAcceptedFileTypes().join(',')}
                multiple={activeTab === "image"}
                onChange={handleFileSelection}
                className="w-full p-2 border border-border rounded-md"
              />
              {selectedFiles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {selectedFiles.length} file(s) selected
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                        <span className="text-sm truncate">{file.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleFileRemoval(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return (
          <Textarea
            placeholder="What would you like to share?"
            value={content}
            onChange={(e) => dispatch({ type: 'SET_CONTENT', payload: e.target.value })}
            className="min-h-32 resize-none"
          />
        );
    }
  };

  return (
    <Modal open={open} onClose={onClose} size="lg">
      <ModalHeader>
        <ModalTitle>Create a post</ModalTitle>
      </ModalHeader>

      <ModalBody className="space-y-6">
        {/* Post Type Selector */}
        <Tabs value={activeTab} onValueChange={(value) => dispatch({ type: 'SET_ACTIVE_TAB', payload: value as PostType })}>
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
            {postTypes.map((type) => {
              const Icon = type.icon;
              return (
                <TabsTrigger
                  key={type.type}
                  value={type.type}
                  className="flex flex-col items-center space-y-1 h-auto py-3"
                  title={type.description}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-xs hidden sm:inline">{type.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {renderContentEditor()}
          </TabsContent>
        </Tabs>

        {/* Character Count */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {hashtags.length > 0 && (
              <div className="flex items-center space-x-1">
                <Hash className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {hashtags.length} hashtag{hashtags.length !== 1 ? "s" : ""}
                </span>
              </div>
            )}
            {mentions.length > 0 && (
              <div className="flex items-center space-x-1">
                <AtSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {mentions.length} mention{mentions.length !== 1 ? "s" : ""}
                </span>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8">
              <Progress
                value={progressPercentage}
              />
            </div>
            <span className={cn(
              "text-xs",
              characterCount > characterLimit * 0.9 ? "text-destructive" : "text-muted-foreground"
            )}>
              {characterLimit - characterCount}
            </span>
          </div>
        </div>

        {/* Preview Tags */}
        {(hashtags.length > 0 || mentions.length > 0) && (
          <div className="space-y-2">
            {hashtags.length > 0 && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Hashtags</label>
                <div className="flex flex-wrap gap-1">
                  {hashtags.map((hashtag) => (
                    <Badge key={hashtag} variant="secondary" className="text-xs">
                      {hashtag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {mentions.length > 0 && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Mentions</label>
                <div className="flex flex-wrap gap-1">
                  {mentions.map((mention) => (
                    <Badge key={mention} variant="outline" className="text-xs">
                      @{mention}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </ModalBody>

      <ModalFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={
            !content.trim() || 
            characterCount > characterLimit || 
            isPosting
          }
          loading={isPosting}
          loadingText="Posting..."
        >
          Post
        </Button>
      </ModalFooter>
      </Modal>
    );
  }, (prevProps, nextProps) => {
    return prevProps.open === nextProps.open;
  });

PostCreationModal.displayName = "PostCreationModal";