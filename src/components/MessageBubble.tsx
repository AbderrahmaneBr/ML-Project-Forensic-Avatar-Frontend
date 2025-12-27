import { useState } from 'react'
import { User, Search, Volume2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Message } from '@/types'
import type { CSSProperties } from 'react'

interface MessageBubbleProps {
  message: Message
  isStreaming?: boolean
  isSpeaking?: boolean
  style?: CSSProperties
}

export function MessageBubble({ message, isStreaming, isSpeaking, style }: MessageBubbleProps) {
  const isAssistant = message.role === 'assistant'
  const [expandedImage, setExpandedImage] = useState<string | null>(null)

  return (
    <>
      <div
        className={cn(
          'flex gap-3 animate-fade-in',
          isAssistant ? 'justify-start' : 'justify-end'
        )}
        style={style}
      >
        {isAssistant && (
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl glass-card shadow-lg shadow-primary/10">
            <Search className="h-5 w-5 text-primary" />
            {isSpeaking && (
              <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-primary flex items-center justify-center animate-pulse">
                <Volume2 className="h-2.5 w-2.5 text-primary-foreground" />
              </div>
            )}
          </div>
        )}

        <div
          className={cn(
            'max-w-[75%] rounded-2xl px-4 py-3 shadow-lg transition-all',
            isAssistant
              ? 'glass-card rounded-tl-md shadow-primary/5'
              : 'bg-linear-to-br from-primary/30 to-primary/20 border border-primary/30 rounded-tr-md shadow-primary/10'
          )}
        >
          {/* Images Grid */}
          {message.images && message.images.length > 0 && (
            <div className={cn(
              'grid gap-2 mb-3',
              message.images.length === 1 ? 'grid-cols-1' :
              message.images.length === 2 ? 'grid-cols-2' :
              'grid-cols-3'
            )}>
              {message.images.map((img) => (
                <div
                  key={img.id}
                  className="relative group cursor-pointer rounded-lg overflow-hidden"
                  onClick={() => setExpandedImage(img.url)}
                >
                  <img
                    src={img.url}
                    alt={img.filename}
                    className="w-full h-20 object-cover transition-transform group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                  <div className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/60 to-transparent p-1">
                    <p className="text-[9px] text-white/80 truncate">{img.filename}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <p
            className={cn(
              'text-sm leading-relaxed whitespace-pre-wrap',
              isAssistant ? 'text-foreground' : 'text-foreground'
            )}
          >
            {message.content}
            {isStreaming && (
              <span className="inline-block w-2 h-4 ml-1 bg-primary animate-pulse-dot rounded-sm" />
            )}
          </p>

          {!isStreaming && (
            <p className="mt-2 text-[10px] text-muted-foreground/60 flex items-center gap-1.5">
              <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
              {new Date(message.created_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              })}
              {message.images && message.images.length > 0 && (
                <>
                  <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
                  {message.images.length} {message.images.length === 1 ? 'image' : 'images'}
                </>
              )}
            </p>
          )}
        </div>

        {!isAssistant && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl glass-subtle border border-border/50 shadow-lg">
            <User className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Image Lightbox */}
      {expandedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in"
          onClick={() => setExpandedImage(null)}
        >
          <button
            className="absolute top-4 right-4 h-10 w-10 rounded-full glass flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            onClick={() => setExpandedImage(null)}
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={expandedImage}
            alt="Expanded evidence"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  )
}
