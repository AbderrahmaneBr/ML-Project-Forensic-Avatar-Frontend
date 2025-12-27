import { memo, useRef, useEffect } from 'react'
import { Search, Volume2 } from 'lucide-react'

interface StreamingMessageProps {
  content: string
  isSpeaking?: boolean
}

// Memoized component that only updates when content actually changes
export const StreamingMessage = memo(function StreamingMessage({
  content,
  isSpeaking,
}: StreamingMessageProps) {
  const contentRef = useRef<HTMLParagraphElement>(null)
  const lastContentRef = useRef('')

  // Use DOM manipulation for appending new content instead of React re-render
  useEffect(() => {
    if (!contentRef.current) return

    const newContent = content
    const oldContent = lastContentRef.current

    // Only append the difference
    if (newContent.startsWith(oldContent)) {
      const diff = newContent.slice(oldContent.length)
      if (diff) {
        // Append new text directly to DOM
        contentRef.current.textContent = newContent
      }
    } else {
      // Full content changed, replace entirely
      contentRef.current.textContent = newContent
    }

    lastContentRef.current = newContent
  }, [content])

  return (
    <div className="flex gap-3 justify-start animate-fade-in">
      <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl glass-card shadow-lg shadow-primary/10">
        <Search className="h-5 w-5 text-primary" />
        {isSpeaking && (
          <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-primary flex items-center justify-center animate-pulse">
            <Volume2 className="h-2.5 w-2.5 text-primary-foreground" />
          </div>
        )}
      </div>

      <div className="max-w-[75%] rounded-2xl px-4 py-3 shadow-lg transition-all glass-card rounded-tl-md shadow-primary/5">
        <p
          ref={contentRef}
          className="text-sm leading-relaxed whitespace-pre-wrap text-foreground"
        >
          {content}
        </p>
        <span className="inline-block w-2 h-4 ml-1 bg-primary animate-pulse-dot rounded-sm" />
      </div>
    </div>
  )
}, (prevProps, nextProps) => {
  // Custom comparison - only re-render if content length changed significantly
  // or if isSpeaking changed
  if (prevProps.isSpeaking !== nextProps.isSpeaking) return false
  if (prevProps.content === nextProps.content) return true

  // For small content additions, we handle via DOM in useEffect
  // Only force re-render for large changes or when content was reset
  if (nextProps.content.startsWith(prevProps.content)) {
    const diff = nextProps.content.length - prevProps.content.length
    // Allow DOM-based updates for small additions
    return diff < 100
  }

  return false
})
