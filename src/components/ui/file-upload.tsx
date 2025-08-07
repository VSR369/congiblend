import * as React from "react"
import { Upload, X, File, Image, FileText, Download } from "lucide-react"
import { Button } from "./button"
import { Progress } from "./progress"
import { cn } from "@/lib/utils"

export interface FileItem {
  id: string
  file: File
  preview?: string
  uploadProgress?: number
  error?: string
}

export interface FileUploadProps {
  accept?: string
  multiple?: boolean
  maxSize?: number // in bytes
  maxFiles?: number
  onFilesSelect?: (files: FileItem[]) => void
  onFileRemove?: (fileId: string) => void
  onUpload?: (files: FileItem[]) => Promise<void>
  disabled?: boolean
  className?: string
  showPreview?: boolean
  files?: FileItem[]
}

const getFileIcon = (file: File) => {
  const type = file.type.split('/')[0]
  switch (type) {
    case 'image':
      return Image
    case 'text':
    case 'application':
      return FileText
    default:
      return File
  }
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export const FileUpload = React.forwardRef<HTMLDivElement, FileUploadProps>(
  ({
    accept,
    multiple = false,
    maxSize,
    maxFiles,
    onFilesSelect,
    onFileRemove,
    onUpload,
    disabled = false,
    className,
    showPreview = true,
    files = [],
    ...props
  }, ref) => {
    const [isDragOver, setIsDragOver] = React.useState(false)
    const [isUploading, setIsUploading] = React.useState(false)
    const fileInputRef = React.useRef<HTMLInputElement>(null)

    const handleFileSelect = (selectedFiles: FileList | null) => {
      if (!selectedFiles || selectedFiles.length === 0) return

      const newFiles: FileItem[] = Array.from(selectedFiles).map(file => ({
        id: Math.random().toString(36).substring(7),
        file,
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
        uploadProgress: 0
      }))

      // Validate file size
      if (maxSize) {
        const validFiles = newFiles.filter(fileItem => {
          if (fileItem.file.size > maxSize) {
            fileItem.error = `File size exceeds ${formatFileSize(maxSize)}`
            return false
          }
          return true
        })
        onFilesSelect?.(validFiles)
      } else {
        onFilesSelect?.(newFiles)
      }
    }

    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault()
      if (!disabled) {
        setIsDragOver(true)
      }
    }

    const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
    }

    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      if (!disabled) {
        handleFileSelect(e.dataTransfer.files)
      }
    }

    const handleUpload = async () => {
      if (!onUpload || files.length === 0) return
      
      setIsUploading(true)
      try {
        await onUpload(files)
      } catch (error) {
        console.error('Upload failed:', error)
      } finally {
        setIsUploading(false)
      }
    }

    const canAddMoreFiles = !maxFiles || files.length < maxFiles

    return (
      <div ref={ref} className={cn("space-y-4", className)} {...props}>
        {/* Upload Area */}
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-6 text-center transition-colors",
            isDragOver
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-muted-foreground/50",
            disabled && "opacity-50 cursor-not-allowed",
            !disabled && "cursor-pointer"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !disabled && canAddMoreFiles && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            multiple={multiple}
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
            disabled={disabled || !canAddMoreFiles}
          />
          
          <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">
            {isDragOver ? "Drop files here" : "Upload files"}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Drag and drop files here, or click to select files
          </p>
          
          {accept && (
            <p className="text-xs text-muted-foreground">
              Supported formats: {accept}
            </p>
          )}
          
          {maxSize && (
            <p className="text-xs text-muted-foreground">
              Max file size: {formatFileSize(maxSize)}
            </p>
          )}
          
          {maxFiles && (
            <p className="text-xs text-muted-foreground">
              Max files: {maxFiles} {files.length > 0 && `(${files.length}/${maxFiles} selected)`}
            </p>
          )}
        </div>

        {/* File Preview */}
        {files.length > 0 && showPreview && (
          <div className="space-y-2 animate-fade-in">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">Selected Files ({files.length})</h4>
              {onUpload && (
                <Button
                  onClick={handleUpload}
                  disabled={isUploading || files.some(f => f.error)}
                  size="sm"
                >
                  {isUploading ? "Uploading..." : "Upload All"}
                </Button>
              )}
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {files.map((fileItem) => {
                const FileIcon = getFileIcon(fileItem.file)
                
                return (
                  <div
                    key={fileItem.id}
                    className="flex items-center space-x-3 p-3 border rounded-lg bg-muted/30 animate-fade-in"
                  >
                    {fileItem.preview ? (
                      <img
                        src={fileItem.preview}
                        alt="Preview"
                        className="h-10 w-10 object-cover rounded"
                      />
                    ) : (
                      <FileIcon className="h-10 w-10 text-muted-foreground" />
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {fileItem.file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(fileItem.file.size)}
                      </p>
                      
                      {fileItem.error && (
                        <p className="text-xs text-red-500 mt-1">
                          {fileItem.error}
                        </p>
                      )}
                      
                      {fileItem.uploadProgress !== undefined && fileItem.uploadProgress > 0 && (
                        <div className="mt-2">
                          <Progress
                            value={fileItem.uploadProgress}
                          />
                        </div>
                      )}
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onFileRemove?.(fileItem.id)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    )
  }
)
FileUpload.displayName = "FileUpload"