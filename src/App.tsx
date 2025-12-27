import { useState, useEffect, useCallback } from 'react'
import { Sidebar } from '@/components/Sidebar'
import { ChatInterface } from '@/components/ChatInterface'
import { TooltipProvider } from '@/components/ui/tooltip'
import * as api from '@/lib/api'
import type { Conversation, ConversationWithImages, Message } from '@/types'

function App() {
  const [conversations, setConversations] = useState<ConversationWithImages[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const selectedConversation = conversations.find((c) => c.id === selectedId) || null

  // Load conversations on mount
  useEffect(() => {
    loadConversations()
  }, [])

  // Load messages when conversation changes
  useEffect(() => {
    if (selectedId) {
      loadMessages(selectedId)
    } else {
      setMessages([])
    }
  }, [selectedId])

  const loadConversations = async () => {
    try {
      const data = await api.getConversations()
      setConversations(data)
    } catch (error) {
      console.error('Failed to load conversations:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadMessages = async (conversationId: string) => {
    try {
      const data = await api.getMessages(conversationId)
      setMessages(data)
    } catch (error) {
      console.error('Failed to load messages:', error)
    }
  }

  const handleNewConversation = useCallback(async (name: string): Promise<Conversation> => {
    const conv = await api.createConversation(name)
    const convWithImages: ConversationWithImages = { ...conv, images: [] }
    setConversations((prev) => [convWithImages, ...prev])
    setSelectedId(conv.id)
    return conv
  }, [])

  const handleSelectConversation = useCallback((id: string) => {
    setSelectedId(id)
  }, [])

  const handleDeleteConversation = useCallback(async (id: string) => {
    try {
      await api.deleteConversation(id)
      setConversations((prev) => prev.filter((c) => c.id !== id))
      if (selectedId === id) {
        setSelectedId(null)
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error)
    }
  }, [selectedId])

  const handleRenameConversation = useCallback(async (id: string, name: string) => {
    try {
      await api.updateConversation(id, { name })
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, name } : c))
      )
    } catch (error) {
      console.error('Failed to rename conversation:', error)
    }
  }, [])

  const handleMessagesUpdate = useCallback((newMessages: Message[]) => {
    setMessages(newMessages)
  }, [])

  const handleConversationCreated = useCallback((conv: Conversation) => {
    setSelectedId(conv.id)
  }, [])

  const handleStartNewChat = useCallback(() => {
    setSelectedId(null)
    setMessages([])
  }, [])

  const handleToggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => !prev)
  }, [])

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Loading cases...</p>
        </div>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="flex h-screen bg-background">
        <Sidebar
          conversations={conversations}
          selectedId={selectedId}
          onSelect={handleSelectConversation}
          onNew={handleStartNewChat}
          onDelete={handleDeleteConversation}
          onRename={handleRenameConversation}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={handleToggleSidebar}
        />
        <main className="flex-1">
          <ChatInterface
            conversation={selectedConversation}
            messages={messages}
            onNewConversation={handleNewConversation}
            onMessagesUpdate={handleMessagesUpdate}
            onConversationCreated={handleConversationCreated}
          />
        </main>
      </div>
    </TooltipProvider>
  )
}

export default App
