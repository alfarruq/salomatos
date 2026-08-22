import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorBoundary } from './ErrorBoundary'

function Boom({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error('Jadval yiqildi')
  return <p>Jadval</p>
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // React logs every caught error. Expected here, and it would drown the
    // real output of the run.
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  it('renders the fallback instead of crashing the tree', () => {
    render(
      <ErrorBoundary fallback={({ error }) => <p>{error.message}</p>}>
        <Boom shouldThrow />
      </ErrorBoundary>,
    )

    expect(screen.getByText('Jadval yiqildi')).toBeInTheDocument()
  })

  it('keeps the rest of the page alive', () => {
    render(
      <div>
        <nav>Yon panel</nav>
        <ErrorBoundary fallback={() => <p>Bu blok ochilmadi</p>}>
          <Boom shouldThrow />
        </ErrorBoundary>
      </div>,
    )

    // The point of a widget-level boundary: navigation still works.
    expect(screen.getByText('Yon panel')).toBeInTheDocument()
    expect(screen.getByText('Bu blok ochilmadi')).toBeInTheDocument()
  })

  it('reports the error so it can be scrubbed and sent on', () => {
    const onError = vi.fn()
    render(
      <ErrorBoundary fallback={() => <p>Xato</p>} onError={onError}>
        <Boom shouldThrow />
      </ErrorBoundary>,
    )

    expect(onError).toHaveBeenCalledOnce()
    expect(onError.mock.calls[0]?.[0]).toBeInstanceOf(Error)
  })

  it('recovers when the fallback asks it to', async () => {
    function Subject() {
      const [shouldThrow, setShouldThrow] = useState(true)
      return (
        <ErrorBoundary
          fallback={({ reset }) => (
            <button
              onClick={() => {
                setShouldThrow(false)
                reset()
              }}
              type="button"
            >
              Qayta urinish
            </button>
          )}
        >
          <Boom shouldThrow={shouldThrow} />
        </ErrorBoundary>
      )
    }

    render(<Subject />)
    await userEvent.click(screen.getByRole('button', { name: 'Qayta urinish' }))

    expect(screen.getByText('Jadval')).toBeInTheDocument()
  })

  it('clears itself when a reset key changes', async () => {
    function Subject() {
      const [route, setRoute] = useState('/patients')
      return (
        <div>
          <button onClick={() => setRoute('/appointments')} type="button">
            Boshqa sahifa
          </button>
          <ErrorBoundary fallback={() => <p>Xato</p>} resetKeys={[route]}>
            <Boom shouldThrow={route === '/patients'} />
          </ErrorBoundary>
        </div>
      )
    }

    render(<Subject />)
    expect(screen.getByText('Xato')).toBeInTheDocument()

    // Navigating away must not leave the fallback stuck on the new page.
    await userEvent.click(screen.getByRole('button', { name: 'Boshqa sahifa' }))
    expect(screen.getByText('Jadval')).toBeInTheDocument()
  })
})
