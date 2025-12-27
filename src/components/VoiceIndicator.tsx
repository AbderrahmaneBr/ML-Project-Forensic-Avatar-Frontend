import { cn } from '@/lib/utils'

interface VoiceIndicatorProps {
  isActive: boolean
  className?: string
}

export function VoiceIndicator({ isActive, className }: VoiceIndicatorProps) {
  return (
    <div className={cn('flex items-center gap-0.5 h-4', className)}>
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className={cn(
            'w-0.5 rounded-full transition-all duration-200',
            isActive
              ? 'bg-primary voice-bar h-full'
              : 'bg-muted-foreground/30 h-1'
          )}
          style={{
            animationDelay: isActive ? `${i * 0.1}s` : undefined,
          }}
        />
      ))}
    </div>
  )
}
