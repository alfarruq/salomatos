import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Switch } from './Switch'

describe('Switch', () => {
  it('is exposed as a switch, not a checkbox', () => {
    render(<Switch label="SMS eslatma" />)

    expect(screen.getByRole('switch', { name: 'SMS eslatma' })).toBeInTheDocument()
  })

  it('toggles from the label as well as the track', async () => {
    const onCheckedChange = vi.fn()
    render(<Switch label="SMS eslatma" onCheckedChange={onCheckedChange} />)

    await userEvent.click(screen.getByText('SMS eslatma'))

    expect(onCheckedChange).toHaveBeenCalledWith(true)
  })

  it('respects a controlled value instead of drifting to its own state', async () => {
    const onCheckedChange = vi.fn()
    render(<Switch checked={false} label="SMS eslatma" onCheckedChange={onCheckedChange} />)

    await userEvent.click(screen.getByRole('switch'))

    // The caller owns the value: it reports the intent but stays off until told.
    expect(onCheckedChange).toHaveBeenCalledWith(true)
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false')
  })

  it('toggles with the keyboard', async () => {
    const onCheckedChange = vi.fn()
    render(<Switch label="SMS eslatma" onCheckedChange={onCheckedChange} />)

    await userEvent.tab()
    expect(screen.getByRole('switch')).toHaveFocus()

    await userEvent.keyboard(' ')
    expect(onCheckedChange).toHaveBeenCalledWith(true)
  })
})
