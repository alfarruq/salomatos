import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ErrorBoundary } from './ErrorBoundary'
import { QueryBoundary, type QueryLike } from './QueryBoundary'

function pending<T>(): QueryLike<T> {
  return { data: undefined, isPending: true, isError: false, error: null }
}

function failed<T>(error: unknown, refetch?: () => void): QueryLike<T> {
  return {
    data: undefined,
    isPending: false,
    isError: true,
    error,
    ...(refetch === undefined ? {} : { refetch }),
  }
}

function settled<T>(data: T): QueryLike<T> {
  return { data, isPending: false, isError: false, error: null }
}

describe('QueryBoundary', () => {
  it('shows the skeleton while pending', () => {
    render(
      <QueryBoundary loading={<p>Yuklanmoqda</p>} query={pending<string[]>()}>
        {(data) => <p>{data.join(', ')}</p>}
      </QueryBoundary>,
    )

    expect(screen.getByText('Yuklanmoqda')).toBeInTheDocument()
  })

  it('shows the empty state instead of an empty list', () => {
    render(
      <QueryBoundary
        empty={<p>Hali bemor qo&apos;shilmagan</p>}
        loading={<p>Yuklanmoqda</p>}
        query={settled<string[]>([])}
      >
        {(data) => <p>{data.join(', ')}</p>}
      </QueryBoundary>,
    )

    expect(screen.getByText("Hali bemor qo'shilmagan")).toBeInTheDocument()
  })

  it('renders the data once there is some', () => {
    render(
      <QueryBoundary
        empty={<p>Bo&apos;sh</p>}
        loading={<p>Yuklanmoqda</p>}
        query={settled(['Vali', 'Aziza'])}
      >
        {(data) => <p>{data.join(', ')}</p>}
      </QueryBoundary>,
    )

    expect(screen.getByText('Vali, Aziza')).toBeInTheDocument()
  })

  it('uses a custom emptiness rule for non-array shapes', () => {
    render(
      <QueryBoundary
        empty={<p>Bo&apos;sh</p>}
        isEmpty={(data) => data.results.length === 0}
        loading={<p>Yuklanmoqda</p>}
        query={settled({ results: [] as string[] })}
      >
        {(data) => <p>{data.results.length}</p>}
      </QueryBoundary>,
    )

    expect(screen.getByText("Bo'sh")).toBeInTheDocument()
  })

  it('renders the error slot and hands back a retry', async () => {
    const refetch = vi.fn()
    render(
      <QueryBoundary
        error={({ retry }) => (
          <button onClick={retry} type="button">
            Qayta urinish
          </button>
        )}
        loading={<p>Yuklanmoqda</p>}
        query={failed<string[]>(new Error('network'), refetch)}
      >
        {(data) => <p>{data.join(', ')}</p>}
      </QueryBoundary>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Qayta urinish' }))
    expect(refetch).toHaveBeenCalledOnce()
  })

  it('re-throws to the nearest boundary when no error slot is given', () => {
    // Without a slot the failure must reach an ErrorBoundary rather than being
    // silently swallowed — §15's whole hierarchy depends on it.
    render(
      <ErrorBoundary fallback={({ error }) => <p>Ushlandi: {(error as Error).message}</p>}>
        <QueryBoundary loading={<p>Yuklanmoqda</p>} query={failed<string[]>(new Error('5xx'))}>
          {(data) => <p>{data.join(', ')}</p>}
        </QueryBoundary>
      </ErrorBoundary>,
    )

    expect(screen.getByText('Ushlandi: 5xx')).toBeInTheDocument()
  })
})
