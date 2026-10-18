import { useId } from 'react'
import { cn } from '@/shared/lib/cn'

export type LogoSize = 'md' | 'lg'

export interface LogoProps {
  size?: LogoSize
  /**
   * Show only the tooth below `lg`, where the top bar is short of room. The
   * name stays in the accessibility tree, so the landmark is still announced.
   */
  compactBelowLg?: boolean
  className?: string
}

const sizes: Record<LogoSize, { mark: string; text: string }> = {
  md: { mark: 'size-8', text: 'text-title2' },
  lg: { mark: 'size-12', text: 'text-title1' },
}

/** Same drawing as public/favicon.svg — keep the two in step. */
export function LogoMark({ className }: { className?: string }) {
  // AppShell renders the brand twice (rail and top bar); a fixed id would
  // make the second mask resolve to the first. Stripped to plain characters
  // because React's ids carry punctuation that `url(#...)` does not accept.
  const maskId = `logo-mask-${useId().replace(/[^\w-]/g, '')}`

  return (
    <svg aria-hidden="true" className={cn('shrink-0 text-brand', className)} viewBox="0 0 100 100">
      <mask id={maskId}>
        <rect fill="white" height="100" width="100" />
        <path
          d="M61.42 27.64A12.5 9.5 0 1 0 50 41A14 10.5 0 1 1 37.21 55.77"
          fill="none"
          stroke="black"
          strokeWidth="11.5"
        />
      </mask>
      <path
        d="M29 8C17 8 9 17.5 9 31C9 44 15 52 18 64C21 78 24 94 32 94C39 94 40 76 50 76C60 76 61 94 68 94C76 94 79 78 82 64C85 52 91 44 91 31C91 17.5 83 8 71 8C62 8 57 12.5 50 12.5C43 12.5 38 8 29 8Z"
        fill="currentColor"
        mask={`url(#${maskId})`}
      />
    </svg>
  )
}

/** The tooth and the product name, set as live text so it stays sharp and follows the theme. */
export function Logo({ size = 'md', compactBelowLg = false, className }: LogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <LogoMark className={sizes[size].mark} />
      <span
        className={cn(
          sizes[size].text,
          'font-bold tracking-tight text-brand-ink',
          compactBelowLg && 'max-lg:sr-only',
        )}
      >
        Salomat<span className="text-brand">OS</span>
      </span>
    </span>
  )
}
