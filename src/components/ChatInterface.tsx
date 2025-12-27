import { useState, useRef, useEffect, useCallback, lazy, Suspense } from 'react'
import { Send, Volume2, VolumeX, StopCircle, Sparkles, Fingerprint } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ImageUpload } from '@/components/ImageUpload'
import { MessageBubble } from '@/components/MessageBubble'
import { StreamingMessage } from '@/components/StreamingMessage'
import { AnalysisProgress } from '@/components/AnalysisProgress'
import { VoiceIndicator } from '@/components/VoiceIndicator'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { useTextToSpeech } from '@/hooks/useTextToSpeech'

// Lazy load the 3D avatar to avoid blocking initial render
const DetectiveAvatar = lazy(() => import('@/components/DetectiveAvatar').then(m => ({ default: m.DetectiveAvatar })))
import { cn } from '@/lib/utils'
import * as api from '@/lib/api'
import type { Message, MessageImage, UploadedImage, AnalysisProgress as AnalysisProgressType, Conversation } from '@/types'

interface ChatInterfaceProps {
  conversation: Conversation | null
  messages: Message[]
  onNewConversation: (name: string) => Promise<Conversation>
  onMessagesUpdate: (messages: Message[]) => void
  onConversationCreated: (conv: Conversation) => void
}

export function ChatInterface({
  conversation,
  messages,
  onNewConversation,
  onMessagesUpdate,
  onConversationCreated,
}: ChatInterfaceProps) {
  const [inputValue, setInputValue] = useState('')
  const [images, setImages] = useState<UploadedImage[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [progress, setProgress] = useState<AnalysisProgressType>({ step: 'idle' })
  const [streamingMessage, setStreamingMessage] = useState<string>('')
  const [ttsEnabled, setTtsEnabled] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<(() => void) | null>(null)
  const messagesRef = useRef<Message[]>(messages)
  const userMessageRef = useRef<Message | null>(null)
  const streamingContentRef = useRef<string>('')
  const streamingUpdateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { speakToken, stop: stopTts, flush: flushTts, isSpeaking } = useTextToSpeech()

  // Keep messages ref updated
  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      const scrollElement = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight
      }
    }
  }, [messages, streamingMessage, progress])

  // Stop TTS when conversation changes
  useEffect(() => {
    stopTts()
  }, [conversation?.id, stopTts])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortRef.current) {
        abortRef.current()
      }
      stopTts()
    }
  }, [stopTts])

  const handleAddImages = useCallback(async (files: FileList) => {
    const newImages: UploadedImage[] = Array.from(files).map((file) => ({
      id: uuidv4(),
      file,
      preview: URL.createObjectURL(file),
      uploading: false,
      uploaded: false,
    }))
    setImages((prev) => [...prev, ...newImages])
  }, [])

  const handleRemoveImage = useCallback((id: string) => {
    setImages((prev) => {
      const img = prev.find((i) => i.id === id)
      if (img) {
        URL.revokeObjectURL(img.preview)
      }
      return prev.filter((i) => i.id !== id)
    })
  }, [])

  const uploadImages = async (conversationId: string) => {
    const uploads = images.map(async (img) => {
      if (img.uploaded) return img

      setImages((prev) =>
        prev.map((i) => (i.id === img.id ? { ...i, uploading: true } : i))
      )

      try {
        const result = await api.uploadImage(conversationId, img.file)
        setImages((prev) =>
          prev.map((i) =>
            i.id === img.id
              ? { ...i, uploading: false, uploaded: true, serverId: result.image.id }
              : i
          )
        )
        return { ...img, uploaded: true, serverId: result.image.id }
      } catch (error) {
        setImages((prev) =>
          prev.map((i) =>
            i.id === img.id
              ? { ...i, uploading: false, error: 'Upload failed' }
              : i
          )
        )
        throw error
      }
    })

    await Promise.all(uploads)
  }

  const handleStop = useCallback(() => {
    // Abort the stream
    if (abortRef.current) {
      abortRef.current()
      abortRef.current = null
    }
    // Stop TTS
    stopTts()

    // Save current streaming message if any
    if (streamingMessage && userMessageRef.current) {
      const assistantMessage: Message = {
        id: uuidv4(),
        role: 'assistant',
        content: streamingMessage + ' [Stopped]',
        created_at: new Date().toISOString(),
      }
      onMessagesUpdate([...messagesRef.current, assistantMessage])
    }

    setStreamingMessage('')
    streamingContentRef.current = ''
    if (streamingUpdateTimeoutRef.current) {
      clearTimeout(streamingUpdateTimeoutRef.current)
      streamingUpdateTimeoutRef.current = null
    }
    setProgress({ step: 'idle' })
    setIsAnalyzing(false)
  }, [streamingMessage, stopTts, onMessagesUpdate])

  const handleSubmit = async () => {
    if (!inputValue.trim() && images.length === 0) return
    if (isAnalyzing) return

    let activeConversation = conversation

    // Create conversation if needed
    if (!activeConversation) {
      const name = `case-${uuidv4().slice(0, 8)}`
      activeConversation = await onNewConversation(name)
      onConversationCreated(activeConversation)
    }

    // Upload images first
    if (images.length > 0) {
      try {
        await uploadImages(activeConversation.id)
      } catch {
        return // Stop if upload fails
      }
    }

    // Build message images from uploaded images
    const messageImages: MessageImage[] = images
      .filter((img) => img.uploaded && img.serverId)
      .map((img) => ({
        id: img.serverId!,
        url: img.preview,
        filename: img.file.name,
      }))

    // Add user message with images
    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: inputValue || 'Analyze this evidence',
      created_at: new Date().toISOString(),
      images: messageImages.length > 0 ? messageImages : undefined,
    }
    userMessageRef.current = userMessage
    const updatedMessages = [...messages, userMessage]
    onMessagesUpdate(updatedMessages)
    messagesRef.current = updatedMessages
    setInputValue('')
    setIsAnalyzing(true)
    setProgress({ step: 'idle' })
    setStreamingMessage('')
    streamingContentRef.current = ''

    // Start analysis stream
    abortRef.current = api.analyzeStream(
      activeConversation.id,
      inputValue || undefined,
      (event) => {
        const data = event.data

        if (event.event === 'start') {
          setProgress({ step: 'detection', totalImages: data.total_images })
        } else if (event.event === 'progress') {
          setProgress({
            step: data.step as AnalysisProgressType['step'],
            image: data.image,
            totalImages: data.total_images,
          })
        } else if (event.event === 'text') {
          const token = data.text || ''
          // Accumulate in ref to avoid re-renders per token
          streamingContentRef.current += token

          // Batch state updates - only update every 50ms
          if (!streamingUpdateTimeoutRef.current) {
            streamingUpdateTimeoutRef.current = setTimeout(() => {
              setStreamingMessage(streamingContentRef.current)
              streamingUpdateTimeoutRef.current = null
            }, 50)
          }

          if (ttsEnabled && token) {
            speakToken(token)
          }
        } else if (event.event === 'complete') {
          // Clear any pending timeout
          if (streamingUpdateTimeoutRef.current) {
            clearTimeout(streamingUpdateTimeoutRef.current)
            streamingUpdateTimeoutRef.current = null
          }

          const assistantMessage: Message = {
            id: data.message_id || uuidv4(),
            role: 'assistant',
            content: data.hypothesis || '',
            created_at: new Date().toISOString(),
          }
          onMessagesUpdate([...messagesRef.current, assistantMessage])
          setStreamingMessage('')
          streamingContentRef.current = ''
          setProgress({ step: 'complete' })
          setIsAnalyzing(false)
          setImages([])
          userMessageRef.current = null
          flushTts()
        } else if (event.event === 'error') {
          setProgress({ step: 'error', error: data.error })
          setIsAnalyzing(false)
          userMessageRef.current = null
        }
      },
      (error) => {
        console.error('Analysis error:', error)
        setProgress({ step: 'error', error: error.message })
        setIsAnalyzing(false)
        userMessageRef.current = null
      },
      () => {
        // Stream complete
      }
    )
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (isAnalyzing) {
        handleStop()
      } else {
        handleSubmit()
      }
    }
  }

  const toggleTts = () => {
    if (isSpeaking) {
      stopTts()
    }
    setTtsEnabled((prev) => !prev)
  }

  return (
    <div className="flex h-full flex-col transition-theme">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 glass border-b-0">
        <div className="flex items-center gap-3">
          <div className={cn(
            'flex h-10 w-10 items-center justify-center rounded-xl transition-all',
            conversation
              ? 'bg-primary/20 border border-primary/30'
              : 'bg-muted/30 border border-border/50'
          )}>
            <Fingerprint className={cn(
              'h-5 w-5',
              conversation ? 'text-primary' : 'text-muted-foreground'
            )} />
          </div>
          <div>
            <h1 className="font-semibold text-lg text-foreground">
              {conversation?.name || 'New Investigation'}
            </h1>
            <p className="text-xs text-muted-foreground flex items-center gap-2">
              {conversation ? (
                <>
                  <span className="flex h-1.5 w-1.5 rounded-full bg-success" />
                  Active Case
                </>
              ) : (
                <>
                  <Sparkles className="h-3 w-3" />
                  Upload evidence to begin
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isSpeaking && <VoiceIndicator isActive className="mr-2" />}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTts}
            className={cn(
              'h-10 w-10 rounded-xl transition-all',
              ttsEnabled
                ? 'text-primary hover:bg-primary/10'
                : 'text-muted-foreground hover:bg-muted/50'
            )}
          >
            {ttsEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Main Content - Split Layout */}
      <div className="flex-1 flex gap-4 p-4 overflow-hidden">
        {/* 3D Avatar Section - 60% */}
        <div className="w-[60%] flex flex-col">
          <div className="flex-1 rounded-2xl glass-card overflow-hidden relative">
            {/* Glassmorphism overlay */}
            <div className="absolute inset-0 bg-linear-to-br from-primary/5 via-transparent to-primary/10 pointer-events-none" />

            <ErrorBoundary fallback={
              <div className="flex h-full w-full items-center justify-center bg-muted/30">
                <div className="text-center">
                  <Fingerprint className={cn('h-16 w-16 text-primary mx-auto mb-4', isSpeaking && 'animate-pulse')} />
                  <p className="text-sm text-muted-foreground">3D Avatar</p>
                </div>
              </div>
            }>
              <Suspense fallback={
                <div className="flex h-full w-full items-center justify-center bg-muted/30">
                  <div className="text-center">
                    <Fingerprint className="h-16 w-16 text-muted-foreground animate-pulse mx-auto mb-4" />
                    <p className="text-sm text-muted-foreground">Loading avatar...</p>
                  </div>
                </div>
              }>
                <DetectiveAvatar
                  isSpeaking={isSpeaking}
                  className="h-full w-full"
                  onStop={stopTts}
                />
              </Suspense>
            </ErrorBoundary>

            {/* Speaking indicator overlay */}
            {isSpeaking && (
              <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-linear-to-r from-primary/50 via-primary to-primary/50 animate-pulse" />
            )}

            {/* Avatar info overlay */}
            <div className="absolute bottom-4 left-4 right-4">
              <div className="glass rounded-xl px-4 py-2 backdrop-blur-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      'h-2 w-2 rounded-full',
                      isSpeaking ? 'bg-primary animate-pulse' : 'bg-success'
                    )} />
                    <span className="text-xs text-foreground font-medium">
                      {isSpeaking ? 'Speaking...' : 'Ready'}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    Forensic AI Assistant
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Messages Section - 40% */}
        <div className="w-[40%] flex flex-col rounded-2xl glass-card overflow-hidden">
          {/* Messages Header */}
          <div className="px-4 py-3 border-b border-border/30 glass">
            <h2 className="text-sm font-medium text-foreground">Analysis Log</h2>
            <p className="text-[10px] text-muted-foreground">
              {messages.length} {messages.length === 1 ? 'message' : 'messages'}
            </p>
          </div>

          {/* Messages Area */}
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.length === 0 && !isAnalyzing && (
                <div className="flex flex-col items-center justify-center py-12 text-center animate-fade-in">
                  <div className="mb-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl glass-subtle">
                      <Fingerprint className="h-8 w-8 text-primary" />
                    </div>
                  </div>
                  <h3 className="mb-2 text-sm font-medium text-foreground">
                    No Messages Yet
                  </h3>
                  <p className="max-w-50 text-xs text-muted-foreground leading-relaxed">
                    Upload evidence and start your investigation below.
                  </p>
                </div>
              )}

              {messages.map((msg, i) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  style={{ animationDelay: `${i * 50}ms` }}
                />
              ))}

              {/* Analysis Progress */}
              {isAnalyzing && progress.step !== 'idle' && progress.step !== 'complete' && progress.step !== 'error' && (
                <AnalysisProgress progress={progress} />
              )}

              {/* Streaming Message - Using optimized component */}
              {streamingMessage && (
                <StreamingMessage
                  content={streamingMessage}
                  isSpeaking={isSpeaking}
                />
              )}

              {/* Error State */}
              {progress.step === 'error' && (
                <div className="rounded-xl glass-card border-destructive/30 bg-destructive/5 p-4 text-center animate-scale-in">
                  <div className="mx-auto mb-2 h-10 w-10 rounded-full bg-destructive/20 flex items-center justify-center">
                    <StopCircle className="h-5 w-5 text-destructive" />
                  </div>
                  <p className="text-xs text-destructive font-medium">{progress.error || 'An error occurred'}</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4 glass border-t-0">
        <div className="mx-auto max-w-4xl space-y-4">
          {/* Image Upload */}
          <ImageUpload
            images={images}
            onAdd={handleAddImages}
            onRemove={handleRemoveImage}
            disabled={isAnalyzing}
          />

          {/* Text Input */}
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  images.length > 0
                    ? 'Add context about the evidence (optional)...'
                    : 'Describe what you want to investigate...'
                }
                disabled={isAnalyzing}
                className="h-12 pl-4 pr-4 glass-subtle border-border/30 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 rounded-xl placeholder:text-muted-foreground/50"
              />
            </div>
            <Button
              onClick={isAnalyzing ? handleStop : handleSubmit}
              disabled={!isAnalyzing && (images.length === 0 && !inputValue.trim())}
              className={cn(
                'h-12 px-6 rounded-xl font-medium transition-all',
                isAnalyzing
                  ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground'
                  : 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20'
              )}
            >
              {isAnalyzing ? (
                <>
                  <StopCircle className="mr-2 h-4 w-4" />
                  Stop
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Analyze
                </>
              )}
            </Button>
          </div>

          {/* Helper text */}
          <p className="text-center text-[10px] text-muted-foreground/50">
            Press Enter to {isAnalyzing ? 'stop' : 'send'} • AI-powered forensic analysis
          </p>
        </div>
      </div>
    </div>
  )
}
