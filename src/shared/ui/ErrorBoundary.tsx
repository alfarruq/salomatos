import { Component, type ErrorInfo, type ReactNode } from 'react'

export interface ErrorBoundaryFallbackProps {
  error: Error
  /** Clears the error and re-renders the subtree. */
  reset: () => void
}

export interface ErrorBoundaryProps {
  fallback: (props: ErrorBoundaryFallbackProps) => ReactNode
  /**
   * Reported to Sentry by the caller. Scrub before sending — a render error
   * can carry patient data in its props (§13.4).
   */
  onError?: (error: Error, componentStack: string) => void
  /**
   * Changing any value here clears the error. Pass the route path so navigating
   * away from a broken screen does not leave the fallback stuck on the new one.
   */
  resetKeys?: unknown[]
  children: ReactNode
}

interface State {
  error: Error | null
}

/**
 * §15 places three of these, and the placement is the point:
 *
 *   Root    — "the app failed to start" instead of a white screen
 *   Route   — one page dies, the sidebar and navigation keep working
 *   Widget  — a table dies, the rest of the page is still usable
 *
 * In a medical system a partly working app beats a dead one: a receptionist
 * who cannot see today's chart can still look up a phone number.
 *
 * A class because React exposes no hook for this.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, State> {
  override state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.onError?.(error, info.componentStack ?? '')
  }

  override componentDidUpdate(previous: ErrorBoundaryProps) {
    if (this.state.error === null) return

    const previousKeys = previous.resetKeys ?? []
    const currentKeys = this.props.resetKeys ?? []

    const changed =
      previousKeys.length !== currentKeys.length ||
      previousKeys.some((key, index) => !Object.is(key, currentKeys[index]))

    if (changed) this.reset()
  }

  reset = () => {
    this.setState({ error: null })
  }

  override render() {
    const { error } = this.state
    if (error !== null) {
      return this.props.fallback({ error, reset: this.reset })
    }
    return this.props.children
  }
}
