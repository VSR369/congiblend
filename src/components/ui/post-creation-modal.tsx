import * as React from "react";
import { X, Image, Video, FileText, Calendar, Hash, AtSign, Smile, Music } from "lucide-react";
import { Modal, ModalHeader, ModalBody, ModalFooter, ModalTitle } from "./modal";
import { Button } from "./button";
import { Input } from "./input";
import { Textarea } from "./textarea";
import { Avatar, AvatarImage, AvatarFallback } from "./avatar";
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
import { EventDateTimeFields } from "./event-date-time-fields";

// Import poll composer
import { PollComposer } from './poll-composer';

interface PostCreationModalProps {
  open: boolean;
  onClose: () => void;
  allowedTypes?: PostType[];
  initialType?: PostType;
}

// Optimized post creation modal with useReducer state management
export const PostCreationModal = React.memo(({ open, onClose, allowedTypes, initialType }: PostCreationModalProps) => {

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
    eventData,
    eventSpeakers,
  } = state;

  // Poll state
  const [pollQuestion, setPollQuestion] = React.useState('');
  const [pollOptions, setPollOptions] = React.useState(['', '']);
  const [pollDuration, setPollDuration] = React.useState(7); // days

  // Local state for improved Event date/time UX (does not change global logic)
  const [startDate, setStartDate] = React.useState<Date | undefined>(undefined);
  const [startTime, setStartTime] = React.useState<string>("");
  const [hasEnd, setHasEnd] = React.useState<boolean>(false);
  const [endDate, setEndDate] = React.useState<Date | undefined>(undefined);
  const [endTime, setEndTime] = React.useState<string>("");


  // Ensure active tab aligns with provided initialType/allowedTypes
  React.useEffect(() => {
    if (!open) return;
    if (initialType) {
      dispatch({ type: 'SET_ACTIVE_TAB', payload: initialType });
    } else if (allowedTypes && allowedTypes.length > 0) {
      if (!allowedTypes.includes(state.activeTab)) {
        dispatch({ type: 'SET_ACTIVE_TAB', payload: allowedTypes[0] as PostType });
      }
    }
  }, [open, initialType, allowedTypes]);

  // Initialize local event date/time when opening modal or switching to event tab
  React.useEffect(() => {
    if (!open || activeTab !== "event") return;

    const parseDateTime = (dt?: string) => {
      if (!dt) return { d: undefined as Date | undefined, t: "" };
      // Accept both "YYYY-MM-DDTHH:mm" and ISO strings
      const iso = dt.includes("T") ? dt : `${dt}T00:00`;
      const dateObj = new Date(iso);
      // Extract HH:mm from the original if available; fallback to local from dateObj
      let hhmm = "00:00";
      const m = dt.match(/T(\d{2}:\d{2})/);
      if (m && m[1]) hhmm = m[1];
      else {
        const h = dateObj.getHours().toString().padStart(2, "0");
        const mi = dateObj.getMinutes().toString().padStart(2, "0");
        hhmm = `${h}:${mi}`;
      }
      // Ensure date part is accurate (ignore timezone offsets for input/display)
      return { d: new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate()), t: hhmm };
    };

    const s = parseDateTime(state.eventData.start_date);
    setStartDate(s.d);
    setStartTime(s.t);

    const hasEndExisting = !!state.eventData.end_date;
    setHasEnd(hasEndExisting);
    if (hasEndExisting) {
      const e = parseDateTime(state.eventData.end_date);
      setEndDate(e.d);
      setEndTime(e.t);
    } else {
      setEndDate(undefined);
      setEndTime("");
    }
  }, [open, activeTab, state.eventData.start_date, state.eventData.end_date]);

  // Helper to build the same local "YYYY-MM-DDTHH:mm" string semantics as before
  const toLocalTimestampString = React.useCallback((d?: Date, t?: string) => {
    if (!d || !t) return "";
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const [hh = "00", mi = "00"] = t.split(":");
    // Return without timezone suffix to keep existing DB semantics
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
  }, []);

  const allPostTypes: { type: PostType; label: string; icon: React.ComponentType<any>; description: string }[] = [
    { type: "text", label: "Text", icon: FileText, description: "Share your thoughts" },
    { type: "image", label: "Photo", icon: Image, description: "Share images" },
    { type: "video", label: "Video", icon: Video, description: "Upload videos" },
    { type: "audio", label: "Audio", icon: Music, description: "Share audio files" },
    { type: "article", label: "Article", icon: FileText, description: "Write long-form content" },
    { type: "event", label: "Event", icon: Calendar, description: "Announce events" },
    { type: "poll", label: "Poll", icon: Hash, description: "Create polls" },
  ];

  const postTypes = React.useMemo(() => {
    return allowedTypes && allowedTypes.length > 0
      ? allPostTypes.filter((t) => allowedTypes.includes(t.type))
      : allPostTypes;
  }, [allowedTypes]);

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

  // Speaker photo upload handler
  const handleSpeakerPhotoUpload = React.useCallback(async (index: number, file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not authenticated');

      const response = await fetch(`https://cmtehutbazgfjoksmkly.supabase.co/functions/v1/media`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session.access_token}` },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to upload speaker photo: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      if (!data?.url) throw new Error('Upload succeeded but no URL returned');

      dispatch({ type: 'UPDATE_EVENT_SPEAKER', index, payload: { photo_url: data.url } });
      toast.success('Speaker photo uploaded');
    } catch (e: any) {
      console.error('Speaker photo upload error', e);
      toast.error(e?.message || 'Failed to upload speaker photo');
    }
  }, [dispatch]);

  const handleSubmit = React.useCallback(async () => {
    // For event posts, content is not required but event fields are
    if (activeTab === 'event') {
      const missingBasics = !eventData.title?.trim() || !eventData.description?.trim();
      const missingStart = !startDate || !startTime;
      if (missingBasics || missingStart) {
        console.log('❌ Event submission blocked - missing required fields', {
          missingBasics, missingStart, startDate: !!startDate, startTime: !!startTime
        });
        return;
      }
    } else if (activeTab === 'poll') {
      // For polls, validate question and options
      const validOptions = pollOptions.filter(opt => opt.trim()).length;
      if (!pollQuestion.trim() || validOptions < 2) {
        console.log('❌ Poll submission blocked - missing required fields');
        return;
      }
    } else if (!content.trim()) {
      console.log('❌ Submission blocked - content required');
      return;
    }

    console.log('📤 Starting post submission...', { activeTab, eventData });
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
        content: activeTab === 'event' ? (content.trim() || `Event: ${eventData.title}`) : 
                 activeTab === 'poll' ? pollQuestion : content.trim(),
        post_type: activeTab,
        visibility: "public",
        media_urls: mediaUrls, // Include uploaded media URLs
      };


      // Add event data if it's an event post
      if (activeTab === 'event') {
        // Validate required event fields
        if (!eventData.title.trim()) {
          throw new Error('Event title is required');
        }
        if (!eventData.description.trim()) {
          throw new Error('Event description is required');
        }
        if (!startDate || !startTime) {
          throw new Error('Event start date is required');
        }

        const startLocal = toLocalTimestampString(startDate, startTime);
        const endLocal = hasEnd && endDate && endTime ? toLocalTimestampString(endDate, endTime) : null;

        postData.event_data = {
          title: eventData.title.trim(),
          description: eventData.description.trim(),
          start_date: startLocal,
          end_date: endLocal,
          location: eventData.location.trim() || null,
          max_attendees: eventData.max_attendees ? parseInt(eventData.max_attendees) : null,
          is_virtual: eventData.is_virtual,
          is_hybrid: eventData.is_hybrid,
          speakers: (eventSpeakers || [])
            .filter((s) => (s.name && s.name.trim()) || (s.profile && s.profile.trim()) || (s.description && s.description.trim()) || s.photo_url)
            .map((s) => ({
              name: s.name.trim(),
              profile: s.profile?.trim() || undefined,
              description: s.description?.trim() || undefined,
              photo_url: s.photo_url || undefined,
            })),
        };
      }

      // Add poll data if it's a poll post
      if (activeTab === 'poll') {
        const validOptions = pollOptions.filter(opt => opt.trim());
        postData.poll_data = {
          question: pollQuestion.trim(),
          options: validOptions,
          duration_days: pollDuration
        };
      }

      await createPost(postData);
      
      // Reset form using reducer
      dispatch({ type: 'RESET_FORM' });
      // Reset poll state
      setPollQuestion('');
      setPollOptions(['', '']);
      setPollDuration(7);
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
  }, [content, selectedFiles, activeTab, eventData, startDate, startTime, hasEnd, endDate, endTime, hashtags, mentions, createPost, onClose, dispatch, toLocalTimestampString, pollQuestion, pollOptions, pollDuration]);

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
          <PollComposer
            question={pollQuestion}
            onQuestionChange={setPollQuestion}
            options={pollOptions}
            onOptionsChange={setPollOptions}
            duration={pollDuration}
            onDurationChange={setPollDuration}
          />
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

            <div className="space-y-3 rounded-md border border-border p-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <EventDateTimeFields
                  label="Start date & time"
                  date={startDate}
                  time={startTime}
                  onDateChange={setStartDate}
                  onTimeChange={setStartTime}
                  required
                />

                {hasEnd && (
                  <EventDateTimeFields
                    label="End date & time"
                    date={endDate}
                    time={endTime}
                    onDateChange={setEndDate}
                    onTimeChange={setEndTime}
                  />
                )}
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={hasEnd}
                  onChange={(e) => setHasEnd(e.target.checked)}
                />
                <span className="text-sm">Add end date & time</span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            {/* Speakers Section */}
            <div className="space-y-3 rounded-md border border-border p-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Speakers</label>
                <Button variant="outline" size="sm" onClick={() => dispatch({ type: 'ADD_EVENT_SPEAKER' })}>
                  Add speaker
                </Button>
              </div>
              {eventSpeakers.length === 0 ? (
                <p className="text-xs text-muted-foreground">No speakers added yet.</p>
              ) : (
                <div className="space-y-4">
                  {eventSpeakers.map((sp, i) => (
                    <div key={i} className="grid grid-cols-[auto,1fr,auto] gap-3 items-start">
                      <div className="h-10 w-10 rounded-full overflow-hidden bg-muted flex items-center justify-center">
                        {sp.photo_url ? (
                          <img src={sp.photo_url} alt={sp.name || `Speaker ${i + 1}`} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-xs font-medium">{(sp.name || 'S').slice(0, 2).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Input
                          placeholder="Name *"
                          value={sp.name}
                          onChange={(e) => dispatch({ type: 'UPDATE_EVENT_SPEAKER', index: i, payload: { name: e.target.value } })}
                        />
                        <Input
                          placeholder="Profile URL (optional)"
                          type="url"
                          value={sp.profile || ''}
                          onChange={(e) => dispatch({ type: 'UPDATE_EVENT_SPEAKER', index: i, payload: { profile: e.target.value } })}
                        />
                        <Textarea
                          placeholder="Short description (optional)"
                          value={sp.description || ''}
                          onChange={(e) => dispatch({ type: 'UPDATE_EVENT_SPEAKER', index: i, payload: { description: e.target.value } })}
                          className="min-h-20"
                        />
                        <div>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleSpeakerPhotoUpload(i, file);
                            }}
                          />
                        </div>
                      </div>
                      <div className="pt-1">
                        <Button variant="ghost" size="sm" onClick={() => dispatch({ type: 'REMOVE_EVENT_SPEAKER', index: i })}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
              maxLength={3000}
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
            maxLength={3000}
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
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7">
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

        {/* Character Count + Preview Tags */}
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
          disabled={(() => {
            // Debug logging for button validation
            const isPostingCheck = isPosting;
            const characterCheck = characterCount > characterLimit;
            const textCheck = activeTab === 'text' && !content.trim();
            const pollCheck = activeTab === 'poll' && (!pollQuestion.trim() || pollOptions.filter(opt => opt.trim()).length < 2);
            // Updated event validation to use improved local fields (keeps original logic intent)
            const eventCheck = activeTab === 'event' && (
              !eventData.title || !eventData.title.trim() ||
              !eventData.description || !eventData.description.trim() ||
              !startDate || !startTime || (hasEnd && (!endDate || !endTime))
            );
            const mediaCheck = ['image', 'video', 'audio'].includes(activeTab) && selectedFiles.length === 0 && !content.trim();
            
            if (activeTab === 'event') {
              console.log('🔍 Event button validation:', {
                isPosting: isPostingCheck,
                characterCount,
                characterLimit,
                eventData: {
                  title: eventData.title,
                  titleTrimmed: eventData.title?.trim(),
                  description: eventData.description,
                  descriptionTrimmed: eventData.description?.trim(),
                },
                start: { date: !!startDate, time: !!startTime },
                endEnabled: hasEnd,
                end: { date: !!endDate, time: !!endTime },
                eventCheck,
                finalDisabled: isPostingCheck || characterCheck || eventCheck
              });
            }
            
            return isPostingCheck || characterCheck || textCheck || pollCheck || eventCheck || mediaCheck;
          })()}
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
