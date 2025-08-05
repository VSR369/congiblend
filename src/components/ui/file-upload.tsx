import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Upload, X, File, Image, FileText, Download } from "lucide-react"
import { Button } from "./button"
import { Progress } from "./loading"
import { cn } from "@/lib/utils"

export interface FileItem {
  id: string
  file: File
  preview?: string
  progress?: number
  status: 'uploading' | 'success' | 'error' | 'pending'
  error?: string
}

export interface FileUploadProps {
  onFilesSelect: (files: File[]) => void
  onFileRemove?: (id: string) => void
  onFileUpload?: (files: FileItem[]) => Promise<void>
  acceptedTypes?: string[]
  maxSize?: number
  maxFiles?: number
  multiple?: boolean
  disabled?: boolean
  className?: string
  showPreview?: boolean
  uploadFiles?: FileItem[]
}

export const FileUpload = ({
  onFilesSelect,
  onFileRemove,
  onFileUpload,
  acceptedTypes = ["image/*", "application/pdf", ".doc", ".docx", ".txt"],
  maxSize = 10 * 1024 * 1024, // 10MB
  maxFiles = 5,
  multiple = true,
  disabled = false,
  className,
  showPreview = true,
  uploadFiles = [],
}: FileUploadProps) => {
  const [isDragOver, setIsDragOver] = React.useState(false)
  const [files, setFiles] = React.useState<FileItem[]>(uploadFiles)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    setFiles(uploadFiles)
  }, [uploadFiles])

  const validateFile = (file: File): string | null => {
    if (file.size > maxSize) {
      return `File size must be less than ${formatFileSize(maxSize)}`
    }

    if (acceptedTypes.length > 0 && !acceptedTypes.some(type => 
      type === "*" || 
      file.type.match(type.replace("*", ".*")) ||
      file.name.toLowerCase().endsWith(type)
    )) {
      return "File type not supported"
    }

    return null
  }

  const handleFileSelection = (selectedFiles: File[]) => {
    const validFiles: File[] = []
    const errors: string[] = []

    selectedFiles.forEach(file => {
      const error = validateFile(file)
      if (error) {
        errors.push(`${file.name}: ${error}`)
      } else if (files.length + validFiles.length < maxFiles) {
        validFiles.push(file)
      } else {
        errors.push(`Maximum ${maxFiles} files allowed`)
      }
    })

    if (validFiles.length > 0) {
      const newFiles: FileItem[] = validFiles.map(file => ({
        id: Math.random().toString(36).substr(2, 9),
        file,
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
        status: 'pending' as const,
      }))

      setFiles(prev => [...prev, ...newFiles])
      onFilesSelect(validFiles)
    }

    if (errors.length > 0) {
      console.error("File upload errors:", errors)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    if (disabled) return

    const droppedFiles = Array.from(e.dataTransfer.files)
    handleFileSelection(droppedFiles)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    
    const selectedFiles = Array.from(e.target.files)
    handleFileSelection(selectedFiles)
    
    // Reset input
    e.target.value = ""
  }

  const removeFile = (id: string) => {
    setFiles(prev => {
      const updated = prev.filter(f => f.id !== id)
      const fileToRemove = prev.find(f => f.id === id)
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview)
      }
      return updated
    })
    onFileRemove?.(id)
  }

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return Image
    if (file.type.includes('pdf')) return FileText
    if (file.type.includes('document') || file.type.includes('text')) return FileText
    return File
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragOver(true)
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
          isDragOver && "border-primary bg-primary/5",
          !isDragOver && "border-muted-foreground/25 hover:border-muted-foreground/50",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <Upload className={cn(
          "mx-auto h-12 w-12 mb-4",
          isDragOver ? "text-primary" : "text-muted-foreground"
        )} />
        
        <div className="space-y-2">
          <p className="text-lg font-medium">
            {isDragOver ? "Drop files here" : "Drag & drop files here"}
          </p>
          <p className="text-sm text-muted-foreground">
            or{" "}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              className="font-medium text-primary hover:underline"
            >
              browse files
            </button>
          </p>
          <p className="text-xs text-muted-foreground">
            Supports: {acceptedTypes.join(", ")} • Max {formatFileSize(maxSize)} per file
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple={multiple}
          accept={acceptedTypes.join(",")}
          onChange={handleInputChange}
          disabled={disabled}
          className="hidden"
        />
      </div>

      {/* File List */}
      {files.length > 0 && showPreview && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Uploaded Files ({files.length})</h4>
          <AnimatePresence>
            {files.map((fileItem) => {
              const FileIcon = getFileIcon(fileItem.file)
              
              return (
                <motion.div
                  key={fileItem.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center space-x-3 p-3 border rounded-lg bg-card"
                >
                  {/* File Icon/Preview */}
                  <div className="flex-shrink-0">
                    {fileItem.preview ? (
                      <img
                        src={fileItem.preview}
                        alt={fileItem.file.name}
                        className="h-10 w-10 object-cover rounded"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                        <FileIcon className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{fileItem.file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(fileItem.file.size)}
                    </p>
                    
                    {/* Progress Bar */}
                    {fileItem.status === 'uploading' && fileItem.progress !== undefined && (
                      <div className="mt-2">
                        <Progress 
                          value={fileItem.progress} 
                          size="sm" 
                          className="h-1" 
                        />
                      </div>
                    )}
                    
                    {/* Error Message */}
                    {fileItem.status === 'error' && fileItem.error && (
                      <p className="text-xs text-destructive mt-1">{fileItem.error}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    {fileItem.status === 'success' && (
                      <Button variant="ghost" size="icon-sm" asChild>
                        <a href={URL.createObjectURL(fileItem.file)} download={fileItem.file.name}>
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeFile(fileItem.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>

          {/* Upload All Button */}
          {onFileUpload && files.some(f => f.status === 'pending') && (
            <Button 
              onClick={() => onFileUpload(files)}
              disabled={disabled}
              className="w-full"
            >
              Upload All Files
            </Button>
          )}
        </div>
      )}
    </div>
  )
}