import { Eye, FileText, Brain, Loader2, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AnalysisProgress as AnalysisProgressType } from '@/types'

interface AnalysisProgressProps {
  progress: AnalysisProgressType
}

const steps = [
  {
    key: 'detection',
    label: 'Detecting Objects',
    shortLabel: 'Detection',
    icon: Eye,
    activeColor: 'text-blue-400',
    activeBg: 'bg-blue-500/20',
    activeBorder: 'border-blue-400/40',
    activeShadow: 'shadow-blue-500/20'
  },
  {
    key: 'ocr',
    label: 'Extracting Text',
    shortLabel: 'OCR',
    icon: FileText,
    activeColor: 'text-purple-400',
    activeBg: 'bg-purple-500/20',
    activeBorder: 'border-purple-400/40',
    activeShadow: 'shadow-purple-500/20'
  },
  {
    key: 'nlp',
    label: 'Analyzing Evidence',
    shortLabel: 'Analysis',
    icon: Brain,
    activeColor: 'text-amber-400',
    activeBg: 'bg-amber-500/20',
    activeBorder: 'border-amber-400/40',
    activeShadow: 'shadow-amber-500/20'
  },
]

export function AnalysisProgress({ progress }: AnalysisProgressProps) {
  if (progress.step === 'idle' || progress.step === 'complete') {
    return null
  }

  const currentStepIndex = steps.findIndex((s) => s.key === progress.step)

  return (
    <div className="animate-fade-in">
      {/* Progress bar container */}
      <div className="glass-card rounded-2xl p-4 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-medium text-muted-foreground">Analysis in progress</p>
          {progress.image && progress.totalImages && (
            <p className="text-xs text-primary font-medium">
              Image {progress.image} of {progress.totalImages}
            </p>
          )}
        </div>

        {/* Steps */}
        <div className="flex gap-2">
          {steps.map((step, index) => {
            const Icon = step.icon
            const isActive = step.key === progress.step
            const isComplete = index < currentStepIndex
            const isPending = index > currentStepIndex

            return (
              <div
                key={step.key}
                className={cn(
                  'flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-all duration-300',
                  isActive && cn(
                    step.activeBg,
                    step.activeBorder,
                    step.activeColor,
                    'shadow-lg',
                    step.activeShadow
                  ),
                  isComplete && 'bg-success/20 border-success/40 text-success shadow-lg shadow-success/10',
                  isPending && 'glass-subtle border-border/20 text-muted-foreground/40'
                )}
              >
                <div className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all',
                  isActive && cn(step.activeBg, 'border', step.activeBorder),
                  isComplete && 'bg-success/30 border border-success/50',
                  isPending && 'bg-muted/20'
                )}>
                  {isActive ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isComplete ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={cn(
                    'text-xs font-medium truncate',
                    isPending && 'text-muted-foreground/40'
                  )}>
                    {step.shortLabel}
                  </p>
                  {isActive && (
                    <p className="text-[10px] text-muted-foreground/60 truncate">
                      {step.label}...
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Progress line */}
        <div className="mt-4 h-1 rounded-full bg-muted/20 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-amber-500 transition-all duration-500"
            style={{
              width: `${((currentStepIndex + 1) / steps.length) * 100}%`
            }}
          />
        </div>
      </div>
    </div>
  )
}
