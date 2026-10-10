import { Menu, MoreHorizontal } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { cn } from '@/shared/lib/cn'
import { Sheet } from './Sheet'

export interface AppShellProps {
  /** Navigation. Rendered in the fixed rail on desktop and in a sheet below it. */
  sidebar: ReactNode
  /** Right-hand side of the top bar: search, clinic switcher, account menu. */
  headerActions?: ReactNode
  /** Product or clinic name shown in the rail. */
  brand: ReactNode
  /**
   * Primary destinations for the bottom tab bar below `lg`. When given, the
   * bar replaces the header's menu button: a thumb reaches the bottom of a
   * phone, not its top-left corner. A trailing "more" tab opens the full
   * navigation in the sheet.
   */
  tabBar?: ReactNode
  children: ReactNode
  /** Accessible names — this layer holds no copy of its own. */
  labels: {
    skipToContent: string
    openNavigation: string
    navigation: string
    /** The tab bar's last item, which opens the full navigation. */
    more?: string
  }
  className?: string
}

/**
 * The frame every authenticated page sits in: a fixed navigation rail, a top
 * bar and a scrolling content column.
 *
 * Below `lg` the rail becomes a sheet — a clinic tablet at the reception desk
 * is a real device here, not a hypothetical.
 */
export function AppShell({
  sidebar,
  headerActions,
  brand,
  tabBar,
  children,
  labels,
  className,
}: AppShellProps) {
  const [isNavOpen, setIsNavOpen] = useState(false)

  return (
    <div className={cn('min-h-dvh bg-canvas', className)}>
      {/*
       * First thing in the tab order: a keyboard user should not have to walk
       * the whole navigation on every page to reach the content (§11.7).
       */}
      <a
        className={cn(
          'sr-only focus:not-sr-only',
          'focus:absolute focus:top-4 focus:left-4 focus:z-50',
          'focus:rounded-control focus:bg-accent focus:px-4 focus:py-2 focus:text-on-accent',
        )}
        href="#main"
      >
        {labels.skipToContent}
      </a>

      <div className="flex">
        <nav
          aria-label={labels.navigation}
          className={cn(
            'hidden lg:flex',
            'sticky top-0 h-dvh w-64 shrink-0 flex-col gap-6',
            'border-r border-border bg-surface p-4',
          )}
        >
          {brand}
          {sidebar}
        </nav>

        <div className="flex min-w-0 flex-1 flex-col">
          <header
            className={cn(
              'sticky top-0 z-40 flex h-16 items-center gap-3',
              'border-b border-border bg-surface/80 px-4 backdrop-blur',
            )}
          >
            <button
              aria-label={labels.openNavigation}
              className={cn(
                'flex size-11 items-center justify-center rounded-control lg:hidden',
                tabBar !== undefined && 'hidden',
                'text-text-secondary transition-colors duration-150 ease-out-apple',
                'hover:bg-sunken hover:text-text',
              )}
              onClick={() => setIsNavOpen(true)}
              type="button"
            >
              <Menu aria-hidden="true" className="size-5" />
            </button>

            <div className="lg:hidden">{brand}</div>

            <div className="ml-auto flex items-center gap-3">{headerActions}</div>
          </header>

          {/* `min-w-0` above and here so a wide table scrolls itself instead of
              stretching the whole layout. */}
          <main
            className={cn(
              'min-w-0 flex-1 p-4 lg:p-6',
              // Room for the fixed tab bar and the home indicator below it.
              tabBar !== undefined && 'pb-[calc(96px+env(safe-area-inset-bottom))] lg:pb-6',
            )}
            id="main"
          >
            {children}
          </main>
        </div>
      </div>

      {tabBar === undefined ? null : (
        <nav
          aria-label={labels.navigation}
          className={cn(
            'fixed inset-x-0 bottom-0 z-40 grid auto-cols-fr grid-flow-col lg:hidden',
            'border-t border-border bg-surface/90 px-2 pt-1 backdrop-blur',
            'pb-[calc(4px+env(safe-area-inset-bottom))]',
          )}
        >
          {tabBar}
          <button className={tabBarItemClassName} onClick={() => setIsNavOpen(true)} type="button">
            <MoreHorizontal aria-hidden="true" className="size-6" />
            {labels.more ?? labels.openNavigation}
          </button>
        </nav>
      )}

      <Sheet onOpenChange={setIsNavOpen} open={isNavOpen} title={labels.navigation}>
        {/*
         * Client-side navigation keeps this component mounted, so the sheet
         * would stay open over the page the user just asked for. Delegated so
         * the sidebar can stay plain links that know nothing about the sheet.
         */}
        {/* biome-ignore lint/a11y/noStaticElementInteractions: the links inside are the interactive elements; this only observes their clicks. */}
        {/* biome-ignore lint/a11y/useKeyWithClickEvents: Enter on a link fires click, so keyboard users are covered. */}
        <div
          onClick={(event) => {
            if (event.target instanceof Element && event.target.closest('a') !== null) {
              setIsNavOpen(false)
            }
          }}
        >
          {sidebar}
        </div>
      </Sheet>
    </div>
  )
}

/**
 * Shared by the "more" tab and the caller's links so every tab looks the same.
 * Callers mark the current page with `data-active="true"`.
 */
export const tabBarItemClassName = cn(
  'flex min-h-14 flex-col items-center justify-center gap-1 rounded-control',
  'text-caption font-medium text-text-tertiary',
  'transition-colors duration-150 ease-out-apple',
  'data-[active=true]:text-accent-text',
)
