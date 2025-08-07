import React from 'react';
import { Upload, X, Image, Video, Music, FileText } from 'lucide-react';
import { Button } from './button';
import { Progress } from './progress';
import { cn } from '@/lib/utils';
import type { PostType } from '@/types/feed';

interface MediaUploadAreaProps {
  postType: PostType;
  files: File[];
  onFilesSelect: (files: File[]) => void;
  onFileRemove: (index: number) => void;
  uploading?: boolean;
  uploadProgress?: number;
  className?: string;
}

const getAcceptedFileTypes = (postType: PostType): string[] => {
  switch (postType) {
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

const getMaxFileSize = (postType: PostType): number => {
  switch (postType) {
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

const getFileIcon = (file: File) => {
  const type = file.type.split('/')[0];
  switch (type) {
    case 'image':
      return Image;
    case 'video':
      return Video;
    case 'audio':
      return Music;
    default:
      return FileText;
  }
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const MediaUploadArea: React.FC<MediaUploadAreaProps> = ({
  postType,
  files,
  onFilesSelect,
  onFileRemove,
  uploading = false,
  uploadProgress = 0,
  className
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const acceptedTypes = getAcceptedFileTypes(postType);
  const maxFileSize = getMaxFileSize(postType);
  const allowsMedia = ['image', 'video', 'audio'].includes(postType);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    
    // Validate files
    const validFiles = selectedFiles.filter(file => {
      if (file.size > maxFileSize) {
        console.warn(`File ${file.name} exceeds size limit`);
        return false;
      }
      if (acceptedTypes.length > 0 && !acceptedTypes.includes(file.type)) {
        console.warn(`File ${file.name} has unsupported type`);
        return false;
      }
      return true;
    });

    onFilesSelect(validFiles);
    
    // Reset input
    if (event.target) {
      event.target.value = '';
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const droppedFiles = Array.from(event.dataTransfer.files);
    
    // Validate files
    const validFiles = droppedFiles.filter(file => {
      if (file.size > maxFileSize) return false;
      if (acceptedTypes.length > 0 && !acceptedTypes.includes(file.type)) return false;
      return true;
    });

    onFilesSelect(validFiles);
  };

  if (!allowsMedia) {
    return null;
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Upload Area */}
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer",
          "border-muted-foreground/25 hover:border-muted-foreground/50",
          uploading && "opacity-50 cursor-not-allowed"
        )}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => !uploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedTypes.join(',')}
          multiple={postType === "image"}
          onChange={handleFileSelect}
          className="hidden"
          disabled={uploading}
        />
        
        <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">
          Upload {postType === 'image' ? 'images' : postType}
        </h3>
        <p className="text-sm text-muted-foreground mb-2">
          Drag and drop files here, or click to select
        </p>
        <p className="text-xs text-muted-foreground">
          Max size: {formatFileSize(maxFileSize)}
          {acceptedTypes.length > 0 && ` • Types: ${acceptedTypes.join(', ')}`}
        </p>
      </div>

      {/* Upload Progress */}
      {uploading && uploadProgress > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span>Uploading...</span>
            <span>{Math.round(uploadProgress)}%</span>
          </div>
          <Progress value={uploadProgress} />
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">
            Selected Files ({files.length})
          </h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {files.map((file, index) => {
              const FileIcon = getFileIcon(file);
              
              return (
                <div
                  key={`${file.name}-${index}`}
                  className="flex items-center space-x-3 p-3 border rounded-lg bg-muted/30"
                >
                  {file.type.startsWith('image/') ? (
                    <img
                      src={URL.createObjectURL(file)}
                      alt="Preview"
                      className="h-10 w-10 object-cover rounded"
                    />
                  ) : (
                    <FileIcon className="h-10 w-10 text-muted-foreground" />
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onFileRemove(index)}
                    className="text-muted-foreground hover:text-foreground"
                    disabled={uploading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};