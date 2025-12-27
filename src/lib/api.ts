import type { Conversation, ConversationWithImages, Message } from '@/types'

const API_BASE = '/api/v1'

export async function createConversation(name: string, description?: string): Promise<Conversation> {
  const response = await fetch(`${API_BASE}/conversations/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, description }),
  })
  if (!response.ok) throw new Error('Failed to create conversation')
  return response.json()
}

export async function getConversations(): Promise<ConversationWithImages[]> {
  const response = await fetch(`${API_BASE}/conversations/`)
  if (!response.ok) throw new Error('Failed to fetch conversations')
  return response.json()
}

export async function getConversation(id: string): Promise<Conversation> {
  const response = await fetch(`${API_BASE}/conversations/${id}`)
  if (!response.ok) throw new Error('Failed to fetch conversation')
  return response.json()
}

export async function updateConversation(id: string, data: { name?: string; description?: string }): Promise<Conversation> {
  const response = await fetch(`${API_BASE}/conversations/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!response.ok) throw new Error('Failed to update conversation')
  return response.json()
}

export async function deleteConversation(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/conversations/${id}`, { method: 'DELETE' })
  if (!response.ok) throw new Error('Failed to delete conversation')
}

export async function getMessages(conversationId: string): Promise<Message[]> {
  const response = await fetch(`${API_BASE}/conversations/${conversationId}/messages`)
  if (!response.ok) throw new Error('Failed to fetch messages')
  return response.json()
}

export async function uploadImage(conversationId: string, file: File): Promise<{ image: { id: string } }> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('conversation_id', conversationId)

  const response = await fetch(`${API_BASE}/upload/`, {
    method: 'POST',
    body: formData,
  })
  if (!response.ok) throw new Error('Failed to upload image')
  return response.json()
}

export async function deleteImage(imageId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/upload/${imageId}`, { method: 'DELETE' })
  if (!response.ok) throw new Error('Failed to delete image')
}

export interface AnalyzeStreamEvent {
  event: string
  data: {
    step?: string
    image?: number
    total_images?: number
    text?: string
    hypothesis?: string
    error?: string
    message_id?: string
  }
}

export function analyzeStream(
  conversationId: string,
  context?: string,
  onEvent: (event: AnalyzeStreamEvent) => void = () => {},
  onError: (error: Error) => void = () => {},
  onComplete: () => void = () => {}
): () => void {
  const url = `${API_BASE}/analyze/stream`

  const body = JSON.stringify({
    conversation_id: conversationId,
    context: context || null,
  })

  const controller = new AbortController()

  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error('Failed to start analysis')
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body')
      }

      const decoder = new TextDecoder()
      let buffer = ''
      let currentEvent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmedLine = line.trim()

          if (trimmedLine.startsWith('event:')) {
            currentEvent = trimmedLine.slice(6).trim()
          } else if (trimmedLine.startsWith('data:')) {
            try {
              const jsonStr = trimmedLine.slice(5).trim()
              if (jsonStr) {
                const data = JSON.parse(jsonStr)
                onEvent({ event: currentEvent || 'message', data })
              }
            } catch {
              // Skip malformed JSON
            }
            currentEvent = '' // Reset after processing data
          }
        }
      }

      onComplete()
    })
    .catch((error) => {
      if (error.name !== 'AbortError') {
        onError(error)
      }
    })

  return () => controller.abort()
}
