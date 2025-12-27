export interface Conversation {
  id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
  images?: MessageImage[]
}

export interface MessageImage {
  id: string
  url: string
  filename: string
}

export interface UploadedImage {
  id: string
  file: File
  preview: string
  uploading: boolean
  uploaded: boolean
  error?: string
  serverId?: string
}

export interface AnalysisProgress {
  step: 'idle' | 'detection' | 'ocr' | 'nlp' | 'complete' | 'error'
  image?: number
  totalImages?: number
  text?: string
  error?: string
}

export interface ConversationWithImages extends Conversation {
  images: ImageInfo[]
}

export interface ImageInfo {
  id: string
  filename: string
  status: string
  created_at: string
}
