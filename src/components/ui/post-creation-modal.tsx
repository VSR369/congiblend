import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Image, Video, FileText, Calendar, Briefcase, BarChart3, Hash, AtSign, Smile } from "lucide-react";
import { Modal, ModalHeader, ModalBody, ModalFooter, ModalTitle } from "./modal";
import { Button } from "./button";
import { Input } from "./input";
import { Textarea } from "./textarea";
import { Badge } from "./badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";
import { Progress } from "./loading";
import { useFeedStore } from "@/stores/feedStore";
import { postSchema } from "@/schemas/post";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { PostType, CreatePostData } from "@/types/feed";

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
  const [selectedFiles, setSelectedFiles] = React.useState<File[]>([]);

  const { createPost } = useFeedStore();

  const postTypes: { type: PostType; label: string; icon: React.ComponentType<any>; description: string }[] = [
    { type: "text", label: "Text", icon: FileText, description: "Share your thoughts" },
    { type: "image", label: "Photo", icon: Image, description: "Share images" },
    { type: "video", label: "Video", icon: Video, description: "Upload videos" },
    { type: "article", label: "Article", icon: FileText, description: "Write long-form content" },
    { type: "poll", label: "Poll", icon: BarChart3, description: "Ask your network" },
    { type: "event", label: "Event", icon: Calendar, description: "Announce events" },
    { type: "job", label: "Job", icon: Briefcase, description: "Post job openings" },
  ];

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
        media: selectedFiles.length > 0 ? selectedFiles : undefined,
      };

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
      setSelectedFiles([]);
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
              {Array.from({ length: 2 }).map((_, i) => (
                <Input
                  key={i}
                  placeholder={`Option ${i + 1}`}
                  className="w-full"
                />
              ))}
              <Button variant="outline" size="sm" className="w-full">
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
              <Input placeholder="Event title" />
              <Input placeholder="Location" />
              <Input type="datetime-local" />
              <Input type="number" placeholder="Max attendees" />
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
              <Input placeholder="Job title" />
              <Input placeholder="Company" />
              <Input placeholder="Location" />
              <Input placeholder="Salary range" />
            </div>
          </div>
        );

      case "image":
      case "video":
        return (
          <div className="space-y-4">
            <Textarea
              placeholder={`What would you like to say about ${activeTab === "image" ? "these photos" : "this video"}?`}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-24"
            />
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
              <div className="space-y-2">
                <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                  {activeTab === "image" ? (
                    <Image className="h-6 w-6 text-muted-foreground" />
                  ) : (
                    <Video className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  Drag and drop {activeTab === "image" ? "images" : "videos"} here, or click to browse
                </p>
                <Button variant="outline" size="sm">
                  Choose Files
                </Button>
              </div>
            </div>
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
          disabled={!content.trim() || characterCount > characterLimit || isPosting}
          loading={isPosting}
          loadingText="Posting..."
        >
          Post
        </Button>
      </ModalFooter>
    </Modal>
  );
};