import type { ReactNode } from 'react'
import { Card } from '@/shared/ui'

export function Section({
  title,
  description,
  className,
  children,
}: {
  title: string
  description?: string
  className?: string
  children: ReactNode
}) {
  return (
    <Card {...(className === undefined ? {} : { className })}>
      <section className="flex flex-col gap-4 p-4 sm:p-6">
        <header className="flex flex-col gap-1">
          <h3 className="text-body font-medium text-text">{title}</h3>
          {description === undefined ? null : (
            <p className="text-caption text-text-secondary">{description}</p>
          )}
        </header>
        {children}
      </section>
    </Card>
  )
}
