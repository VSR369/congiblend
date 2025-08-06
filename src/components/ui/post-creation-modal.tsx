import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Image, Video, FileText, Calendar, Briefcase, BarChart3, Hash, AtSign, Smile, Music } from "lucide-react";
import { Modal, ModalHeader, ModalBody, ModalFooter, ModalTitle } from "./modal";
import { Button } from "./button";
import { Input } from "./input";
import { Textarea } from "./textarea";
import { Badge } from "./badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";
import { Progress } from "./loading";
import { FileUpload } from "./file-upload";
import { useFeedStore } from "@/stores/feedStore";
import { postSchema } from "@/schemas/post";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { PostType, CreatePostData } from "@/types/feed";

// Import the standardized FileItem interface from FileUpload
import type { FileItem } from './file-upload';

interface PostCreationModalProps {
  open: boolean;
  onClose: () => void;
}

export const PostCreationModal = ({ open, onClose }: PostCreationModalProps) => {
  const [activeTab, setActiveTab] = React.useState<PostType>("text");
  const [content, setContent] = React.useState("");
  const [hashtags, setHashtags] = React.useState<string[]>([]);
  const [mentions, setMentions] = React.useState<string[]>([]);
  const [isPosting, setIsPosting] = React.useState(false);
  const [uploadedFiles, setUploadedFiles] = React.useState<FileItem[]>([]);
  const [pollOptions, setPollOptions] = React.useState<string[]>(['', '']);
  const [eventData, setEventData] = React.useState({
    title: '',
    location: '',
    start_date: '',
    max_attendees: ''
  });
  const [jobData, setJobData] = React.useState({
    title: '',
    company: '',
    location: '',
    salary: ''
  });

  const { createPost } = useFeedStore();

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

  const handleFileSelection = React.useCallback((files: File[]) => {
    console.log('Files selected:', files.length, files.map(f => f.name));
    const newFiles: FileItem[] = files.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
      status: 'pending'
    }));
    setUploadedFiles(newFiles);
  }, []);

  const handleFileRemoval = React.useCallback((id: string) => {
    setUploadedFiles(prev => {
      const fileToRemove = prev.find(f => f.id === id);
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prev.filter(f => f.id !== id);
    });
  }, []);

  const handleFileUpload = React.useCallback(async (filesToUpload: FileItem[]) => {
    console.log('Upload triggered for files:', filesToUpload.length);
    if (filesToUpload.length === 0) return;

    setUploadedFiles(prev => prev.map(file => ({ ...file, status: 'uploading' as const })));

    try {
      const uploadPromises = filesToUpload.map(async (fileItem) => {
        const formData = new FormData();
        formData.append('file', fileItem.file);

        const { data, error } = await supabase.functions.invoke('media', {
          body: formData,
        });

        if (error) {
          throw new Error(`Upload failed: ${error.message}`);
        }

        return {
          ...fileItem,
          status: 'success' as const,
          progress: 100,
          url: data.url
        };
      });

      const completedFiles = await Promise.all(uploadPromises);
      setUploadedFiles(completedFiles);
      toast.success(`${completedFiles.length} file(s) uploaded successfully!`);
    } catch (error) {
      console.error('Upload error:', error);
      setUploadedFiles(prev => prev.map(file => ({ 
        ...file, 
        status: 'error' as const, 
        error: error instanceof Error ? error.message : 'Upload failed' 
      })));
      toast.error('Failed to upload files. Please try again.');
    }
  }, []);

  const handleSubmit = async () => {
    if (!content.trim()) return;

    setIsPosting(true);
    
    try {
      const postData: CreatePostData = {
        type: activeTab,
        content: content.trim(),
        hashtags,
        mentions,
        visibility: "public",
        media: uploadedFiles.filter(f => f.status === 'success').map(f => f.file),
      };

      // Add poll data if it's a poll post
      if (activeTab === 'poll' && pollOptions.some(opt => opt.trim())) {
        postData.poll = {
          question: content.trim(),
          options: pollOptions
            .filter(opt => opt.trim())
            .map(text => ({ id: '', text: text.trim(), votes: 0, percentage: 0 })),
          allowMultiple: false
        };
      }

      // Add event data if it's an event post
      if (activeTab === 'event') {
        postData.event = {
          title: eventData.title,
          description: content.trim(),
          startDate: new Date(eventData.start_date),
          location: eventData.location,
          maxAttendees: eventData.max_attendees ? parseInt(eventData.max_attendees) : undefined
        };
      }

      // Add job data if it's a job post
      if (activeTab === 'job') {
        postData.job = {
          title: jobData.title,
          company: jobData.company,
          location: jobData.location,
          type: 'full-time',
          description: content.trim(),
          requirements: [],
          salary: jobData.salary
        };
      }

      // Validate data before submitting
      const validatedData = postSchema.parse({
        content: postData.content,
        visibility: postData.visibility,
        type: postData.type,
        hashtags: postData.hashtags,
        mentions: postData.mentions,
      });

      await createPost(postData);
      
      // Reset form
      setContent("");
      setHashtags([]);
      setMentions([]);
      // Clean up file previews
      uploadedFiles.forEach(file => {
        if (file.preview) URL.revokeObjectURL(file.preview);
      });
      setUploadedFiles([]);
      setPollOptions(['', '']);
      setEventData({ title: '', location: '', start_date: '', max_attendees: '' });
      setJobData({ title: '', company: '', location: '', salary: '' });
      setActiveTab("text");
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
      setIsPosting(false);
    }
  };

  const extractHashtags = (text: string) => {
    const hashtagRegex = /#[\w]+/g;
    const matches = text.match(hashtagRegex) || [];
    return [...new Set(matches)];
  };

  const extractMentions = (text: string) => {
    const mentionRegex = /@[\w]+/g;
    const matches = text.match(mentionRegex) || [];
    return [...new Set(matches.map(m => m.substring(1)))];
  };

  React.useEffect(() => {
    setHashtags(extractHashtags(content));
    setMentions(extractMentions(content));
  }, [content]);

  // Clear files when switching post types
  React.useEffect(() => {
    if (!['image', 'video', 'audio'].includes(activeTab)) {
      uploadedFiles.forEach(file => {
        if (file.preview) URL.revokeObjectURL(file.preview);
      });
      setUploadedFiles([]);
    }
  }, [activeTab]);

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
              onChange={(e) => setContent(e.target.value)}
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
                    setPollOptions(newOptions);
                  }}
                  placeholder={`Option ${i + 1}`}
                  className="w-full"
                />
              ))}
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => setPollOptions([...pollOptions, ''])}
              >
                Add Option
              </Button>
            </div>
          </div>
        );

      case "event":
        return (
          <div className="space-y-4">
            <Textarea
              placeholder="Tell people about your event..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-24"
            />
            <div className="grid grid-cols-2 gap-4">
              <Input 
                placeholder="Event title"
                value={eventData.title}
                onChange={(e) => setEventData({...eventData, title: e.target.value})}
              />
              <Input 
                placeholder="Location"
                value={eventData.location}
                onChange={(e) => setEventData({...eventData, location: e.target.value})}
              />
              <Input 
                type="datetime-local"
                value={eventData.start_date}
                onChange={(e) => setEventData({...eventData, start_date: e.target.value})}
              />
              <Input 
                type="number" 
                placeholder="Max attendees"
                value={eventData.max_attendees}
                onChange={(e) => setEventData({...eventData, max_attendees: e.target.value})}
              />
            </div>
          </div>
        );

      case "job":
        return (
          <div className="space-y-4">
            <Textarea
              placeholder="Describe the job opportunity..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-24"
            />
            <div className="grid grid-cols-2 gap-4">
              <Input 
                placeholder="Job title"
                value={jobData.title}
                onChange={(e) => setJobData({...jobData, title: e.target.value})}
              />
              <Input 
                placeholder="Company"
                value={jobData.company}
                onChange={(e) => setJobData({...jobData, company: e.target.value})}
              />
              <Input 
                placeholder="Location"
                value={jobData.location}
                onChange={(e) => setJobData({...jobData, location: e.target.value})}
              />
              <Input 
                placeholder="Salary range"
                value={jobData.salary}
                onChange={(e) => setJobData({...jobData, salary: e.target.value})}
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
              onChange={(e) => setContent(e.target.value)}
              className="min-h-24"
            />
            <FileUpload
              acceptedTypes={getAcceptedFileTypes()}
              maxSize={getMaxFileSize()}
              multiple={activeTab === "image"}
              onFilesSelect={handleFileSelection}
              onFileRemove={handleFileRemoval}
              onFileUpload={handleFileUpload}
              uploadFiles={uploadedFiles}
              showPreview={true}
            />
          </div>
        );

      default:
        return (
          <Textarea
            placeholder="What would you like to share?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
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
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as PostType)}>
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
                variant={progressPercentage > 90 ? "error" : progressPercentage > 75 ? "warning" : "default"}
                size="sm"
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
            isPosting ||
            (uploadedFiles.length > 0 && uploadedFiles.some(f => f.status !== 'success'))
          }
          loading={isPosting}
          loadingText="Posting..."
        >
          Post
        </Button>
      </ModalFooter>
    </Modal>
  );
};