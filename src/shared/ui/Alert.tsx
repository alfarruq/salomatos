import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'

export type AlertTone = 'info' | 'success' | 'warning' | 'danger'

export interface AlertProps {
  tone?: AlertTone
  title: string
  children?: ReactNode
  className?: string
}

const tones: Record<AlertTone, { container: string; icon: typeof Info }> = {
  info: { container: 'bg-accent-soft text-accent-text', icon: Info },
  success: { container: 'bg-success/10 text-success', icon: CheckCircle2 },
  warning: { container: 'bg-warning/10 text-warning', icon: AlertTriangle },
  danger: { container: 'bg-danger/10 text-danger', icon: XCircle },
}

export function Alert({ tone = 'info', title, children, className }: AlertProps) {
  const { container, icon: Icon } = tones[tone]

  return (
    <div
      /*
       * Only the danger tone interrupts a screen reader. An informational
       * banner that announces itself over whatever the user was reading is
       * worse than one they find on their own.
       */
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn('flex gap-3 rounded-control p-4', container, className)}
    >
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <div className="flex flex-col gap-1">
        <p className="text-callout font-medium">{title}</p>
        {children ? <div className="text-callout opacity-90">{children}</div> : null}
      </div>
    </div>
  )
}
