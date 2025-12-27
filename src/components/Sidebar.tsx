import { useState } from 'react'
import {
  MessageSquare,
  Plus,
  Trash2,
  Pencil,
  MoreVertical,
  Search,
  X,
  Check,
  Fingerprint,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ThemeToggle } from '@/components/ThemeToggle'
import { cn } from '@/lib/utils'
import type { ConversationWithImages } from '@/types'

interface SidebarProps {
  conversations: ConversationWithImages[]
  selectedId: string | null
  onSelect: (id: string) => void
  onNew: () => void
  onDelete: (id: string) => void
  onRename: (id: string, name: string) => void
  isCollapsed: boolean
  onToggleCollapse: () => void
}

export function Sidebar({
  conversations,
  selectedId,
  onSelect,
  onNew,
  onDelete,
  onRename,
  isCollapsed,
  onToggleCollapse,
}: SidebarProps) {
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const filtered = conversations.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  const handleStartEdit = (conv: ConversationWithImages) => {
    setEditingId(conv.id)
    setEditName(conv.name)
  }

  const handleSaveEdit = () => {
    if (editingId && editName.trim()) {
      onRename(editingId, editName.trim())
    }
    setEditingId(null)
    setEditName('')
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditName('')
  }

  // Collapsed sidebar
  if (isCollapsed) {
    return (
      <div className="flex h-full w-16 flex-col items-center glass border-r-0 rounded-none transition-all duration-300">
        {/* Collapse Toggle */}
        <div className="p-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleCollapse}
                className="h-10 w-10 rounded-xl hover:bg-primary/10"
              >
                <PanelLeft className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Expand sidebar</TooltipContent>
          </Tooltip>
        </div>

        {/* Logo */}
        <div className="p-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 border border-primary/30 shadow-lg shadow-primary/10">
            <Fingerprint className="h-5 w-5 text-primary" />
          </div>
        </div>

        {/* New Case Button */}
        <div className="p-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={onNew}
                variant="outline"
                size="icon"
                className="h-10 w-10 rounded-xl glass-subtle hover:bg-primary/20 border-dashed border-primary/30"
              >
                <Plus className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">New Investigation</TooltipContent>
          </Tooltip>
        </div>

        {/* Conversations Icons */}
        <ScrollArea className="flex-1 w-full">
          <div className="flex flex-col items-center gap-1 p-2">
            {filtered.slice(0, 10).map((conv) => (
              <Tooltip key={conv.id}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onSelect(conv.id)}
                    className={cn(
                      'h-10 w-10 rounded-xl transition-all',
                      selectedId === conv.id
                        ? 'bg-primary/20 text-primary'
                        : 'text-muted-foreground hover:bg-muted/50'
                    )}
                  >
                    <MessageSquare className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">{conv.name}</TooltipContent>
              </Tooltip>
            ))}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-3">
          <ThemeToggle />
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full w-72 flex-col glass border-r-0 rounded-none transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 border border-primary/30 shadow-lg shadow-primary/10">
            <Fingerprint className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-semibold text-sm text-foreground">Forensic AI</h1>
            <p className="text-[10px] text-muted-foreground">Case Analysis</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleCollapse}
                className="h-8 w-8 rounded-lg hover:bg-muted/50"
              >
                <PanelLeftClose className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Collapse sidebar</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* New Case Button */}
      <div className="p-3">
        <Button
          onClick={onNew}
          className="w-full justify-start gap-2 glass-subtle hover:bg-primary/20 border-dashed border-primary/30 text-muted-foreground hover:text-primary transition-all"
          variant="outline"
        >
          <Plus className="h-4 w-4" />
          New Investigation
        </Button>
      </div>

      {/* Search */}
      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
          <Input
            placeholder="Search cases..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 glass-subtle border-border/30 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 placeholder:text-muted-foreground/40"
          />
        </div>
      </div>

      {/* Conversations List */}
      <ScrollArea className="flex-1 px-2">
        <div className="space-y-1 pb-4">
          {filtered.length === 0 ? (
            <div className="px-3 py-12 text-center">
              <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-muted/30 flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-muted-foreground/50" />
              </div>
              <p className="text-sm text-muted-foreground/60">
                {search ? 'No cases found' : 'No cases yet'}
              </p>
              {!search && (
                <p className="text-xs text-muted-foreground/40 mt-1">
                  Start a new investigation above
                </p>
              )}
            </div>
          ) : (
            filtered.map((conv, index) => (
              <div
                key={conv.id}
                className={cn(
                  'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all cursor-pointer animate-fade-in',
                  selectedId === conv.id
                    ? 'glass-card bg-primary/10 text-foreground shadow-lg shadow-primary/5'
                    : 'text-muted-foreground hover:glass-subtle hover:text-foreground'
                )}
                style={{ animationDelay: `${index * 50}ms` }}
                onClick={() => editingId !== conv.id && onSelect(conv.id)}
              >
                <div
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors',
                    selectedId === conv.id
                      ? 'bg-primary/20 text-primary'
                      : 'bg-muted/30 text-muted-foreground group-hover:bg-muted/50'
                  )}
                >
                  <MessageSquare className="h-4 w-4" />
                </div>

                {editingId === conv.id ? (
                  <div className="flex flex-1 items-center gap-1">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-7 text-sm glass-subtle"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit()
                        if (e.key === 'Escape') handleCancelEdit()
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-success hover:text-success hover:bg-success/10"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSaveEdit()
                      }}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleCancelEdit()
                      }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium">{conv.name}</p>
                      <p className="text-[10px] text-muted-foreground/60">
                        {conv.images.length} {conv.images.length === 1 ? 'image' : 'images'}
                      </p>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-36 glass">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            handleStartEdit(conv)
                          }}
                          className="gap-2"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation()
                            onDelete(conv.id)
                          }}
                          className="gap-2 text-destructive focus:text-destructive focus:bg-destructive/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t border-border/50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="relative">
              <div className="h-2 w-2 rounded-full bg-success" />
              <div className="absolute inset-0 h-2 w-2 rounded-full bg-success animate-ping opacity-75" />
            </div>
            <span>System Ready</span>
          </div>
          <span className="text-[10px] text-muted-foreground/40">v1.0</span>
        </div>
      </div>
    </div>
  )
}
