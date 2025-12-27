import { useCallback, useRef, useState } from 'react'
import { ImagePlus, X, Loader2, CheckCircle, AlertCircle, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { UploadedImage } from '@/types'

interface ImageUploadProps {
  images: UploadedImage[]
  onAdd: (files: FileList) => void
  onRemove: (id: string) => void
  disabled?: boolean
}

export function ImageUpload({ images, onAdd, onRemove, disabled }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      if (disabled) return
      const files = e.dataTransfer.files
      if (files.length > 0) {
        onAdd(files)
      }
    },
    [disabled, onAdd]
  )

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) {
      setIsDragging(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleClick = () => {
    if (!disabled) {
      inputRef.current?.click()
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      onAdd(files)
    }
    // Reset input
    if (inputRef.current) {
      inputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-3">
      {/* Upload Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
        className={cn(
          'relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 transition-all cursor-pointer',
          disabled
            ? 'border-border/20 bg-muted/5 cursor-not-allowed opacity-50'
            : isDragging
              ? 'border-primary bg-primary/10 scale-[1.02] shadow-lg shadow-primary/20'
              : 'glass-subtle border-border/30 hover:border-primary/50 hover:bg-primary/5 hover:shadow-md'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleChange}
          className="hidden"
          disabled={disabled}
        />

        <div className={cn(
          'mb-3 flex h-14 w-14 items-center justify-center rounded-2xl transition-all',
          isDragging
            ? 'bg-primary/20 text-primary scale-110'
            : 'glass-card text-muted-foreground'
        )}>
          {isDragging ? (
            <Upload className="h-7 w-7 animate-bounce" />
          ) : (
            <ImagePlus className="h-7 w-7" />
          )}
        </div>

        <p className={cn(
          'text-sm font-medium transition-colors',
          isDragging ? 'text-primary' : 'text-muted-foreground'
        )}>
          {isDragging ? 'Drop to upload' : 'Drop evidence images here'}
        </p>
        <p className="text-xs text-muted-foreground/50 mt-1">
          or click to browse • JPG, PNG, WebP, TIFF
        </p>
      </div>

      {/* Image Previews */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-4 pt-2 pl-2">
          {images.map((img, index) => (
            <div
              key={img.id}
              className="relative group animate-scale-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Image container with overflow hidden */}
              <div className="relative h-20 w-20 rounded-xl overflow-hidden glass-card shadow-lg">
                <img
                  src={img.preview}
                  alt={img.file.name}
                  className={cn(
                    'h-full w-full object-cover transition-all',
                    img.uploading && 'opacity-50 scale-95'
                  )}
                />

                {/* Status Overlay */}
                {img.uploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm">
                    <div className="relative">
                      <Loader2 className="h-6 w-6 text-primary animate-spin" />
                    </div>
                  </div>
                )}
                {img.uploaded && !img.uploading && (
                  <div className="absolute bottom-1.5 right-1.5 h-5 w-5 rounded-full bg-success flex items-center justify-center shadow-lg">
                    <CheckCircle className="h-3 w-3 text-success-foreground" />
                  </div>
                )}
                {img.error && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-destructive/80 backdrop-blur-sm">
                    <AlertCircle className="h-5 w-5 text-destructive-foreground" />
                    <span className="text-[8px] text-destructive-foreground mt-1">Failed</span>
                  </div>
                )}

                {/* Filename */}
                <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/80 via-black/40 to-transparent px-2 py-1.5">
                  <p className="text-[10px] text-white/90 truncate font-medium">{img.file.name}</p>
                </div>
              </div>

              {/* Remove Button - OUTSIDE overflow:hidden container */}
              {!img.uploading && (
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-lg z-10 hover:scale-110"
                  onClick={(e) => {
                    e.stopPropagation()
                    onRemove(img.id)
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
