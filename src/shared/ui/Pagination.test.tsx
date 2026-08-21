import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Pagination } from './Pagination'

const labels = { previousLabel: 'Oldingi', nextLabel: 'Keyingi' }

describe('Pagination', () => {
  it('disables the direction that has nowhere to go', () => {
    render(
      <Pagination hasNext hasPrevious={false} onNext={vi.fn()} onPrevious={vi.fn()} {...labels} />,
    )

    expect(screen.getByRole('button', { name: /Oldingi/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Keyingi/ })).toBeEnabled()
  })

  it('blocks both directions while a page is in flight', () => {
    render(
      <Pagination
        hasNext
        hasPrevious
        isLoading
        onNext={vi.fn()}
        onPrevious={vi.fn()}
        {...labels}
      />,
    )

    expect(screen.getByRole('button', { name: /Oldingi/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Keyingi/ })).toBeDisabled()
  })

  it('moves forward on request', async () => {
    const onNext = vi.fn()
    render(<Pagination hasNext hasPrevious onNext={onNext} onPrevious={vi.fn()} {...labels} />)

    await userEvent.click(screen.getByRole('button', { name: /Keyingi/ }))
    expect(onNext).toHaveBeenCalledOnce()
  })

  it('announces the position change without the user re-reading the table', () => {
    render(
      <Pagination
        hasNext
        hasPrevious
        onNext={vi.fn()}
        onPrevious={vi.fn()}
        summary="1–25"
        {...labels}
      />,
    )

    expect(screen.getByText('1–25')).toHaveAttribute('aria-live', 'polite')
  })
})
