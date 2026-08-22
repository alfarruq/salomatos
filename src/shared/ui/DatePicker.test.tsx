import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DatePicker } from './DatePicker'

const labels = {
  placeholder: 'Sanani tanlang',
  previousMonthLabel: 'Oldingi oy',
  nextMonthLabel: 'Keyingi oy',
  locale: 'en-GB',
}

async function open() {
  await userEvent.click(screen.getByRole('button', { name: /Sanani tanlang|August|2026/ }))
}

/*
 * Movement and selection are sent as separate presses on purpose. Batching them
 * into one `keyboard()` call fires Enter inside the same tick as the arrow, before
 * React has flushed the cursor move — which is a property of the test harness, not
 * of how anyone actually uses a calendar.
 */
describe('DatePicker', () => {
  it('shows the placeholder until a date is chosen', () => {
    render(<DatePicker {...labels} />)

    expect(screen.getByRole('button', { name: 'Sanani tanlang' })).toBeInTheDocument()
  })

  it('formats the chosen date for the locale instead of showing the wire format', () => {
    render(<DatePicker {...labels} value="2026-08-21" />)

    // Never "2026-08-21" — §12.4 puts every date through Intl.
    expect(screen.getByRole('button', { name: '21 Aug 2026' })).toBeInTheDocument()
  })

  it('emits the calendar date on selection', async () => {
    const onChange = vi.fn()
    render(<DatePicker {...labels} onChange={onChange} value="2026-08-21" />)

    await open()
    await userEvent.click(screen.getByRole('button', { name: '15' }))

    expect(onChange).toHaveBeenCalledWith('2026-08-15')
  })

  it('moves a day at a time with the arrow keys', async () => {
    const onChange = vi.fn()
    render(<DatePicker {...labels} onChange={onChange} value="2026-08-21" />)

    await open()
    await userEvent.keyboard('{ArrowRight}')
    await userEvent.keyboard('{Enter}')

    expect(onChange).toHaveBeenCalledWith('2026-08-22')
  })

  it('moves a week at a time with up and down', async () => {
    const onChange = vi.fn()
    render(<DatePicker {...labels} onChange={onChange} value="2026-08-21" />)

    await open()
    await userEvent.keyboard('{ArrowDown}')
    await userEvent.keyboard('{Enter}')

    expect(onChange).toHaveBeenCalledWith('2026-08-28')
  })

  it('moves a month at a time with page up and down', async () => {
    const onChange = vi.fn()
    render(<DatePicker {...labels} onChange={onChange} value="2026-08-21" />)

    await open()
    await userEvent.keyboard('{PageDown}')
    await userEvent.keyboard('{Enter}')

    expect(onChange).toHaveBeenCalledWith('2026-09-21')
  })

  it('jumps to the start of the week with Home', async () => {
    const onChange = vi.fn()
    // 21 August 2026 is a Friday; the week starts Monday the 17th.
    render(<DatePicker {...labels} onChange={onChange} value="2026-08-21" />)

    await open()
    await userEvent.keyboard('{Home}')
    await userEvent.keyboard('{Enter}')

    expect(onChange).toHaveBeenCalledWith('2026-08-17')
  })

  it('disables days outside the allowed range', async () => {
    render(<DatePicker {...labels} min="2026-08-10" max="2026-08-20" value="2026-08-15" />)

    await open()

    expect(screen.getByRole('button', { name: '9' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '10' })).toBeEnabled()
    expect(screen.getByRole('button', { name: '20' })).toBeEnabled()
    expect(screen.getByRole('button', { name: '21' })).toBeDisabled()
  })

  it('keeps exactly one day focusable so Tab does not walk 42 buttons', async () => {
    render(<DatePicker {...labels} value="2026-08-21" />)

    await open()

    const focusable = document.querySelectorAll('[data-day][tabindex="0"]')

    expect(focusable).toHaveLength(1)
    expect(focusable[0]).toHaveTextContent('21')
  })
})
