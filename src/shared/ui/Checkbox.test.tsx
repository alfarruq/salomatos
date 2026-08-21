import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Checkbox } from './Checkbox'

describe('Checkbox', () => {
  it('makes the label part of the target', async () => {
    const onCheckedChange = vi.fn()
    render(<Checkbox label="Arxivlangan bemorlarni ko'rsatish" onCheckedChange={onCheckedChange} />)

    await userEvent.click(screen.getByText("Arxivlangan bemorlarni ko'rsatish"))

    expect(onCheckedChange).toHaveBeenCalledWith(true)
  })

  it('toggles with the keyboard', async () => {
    const onCheckedChange = vi.fn()
    render(<Checkbox label="Arxivlangan" onCheckedChange={onCheckedChange} />)

    await userEvent.tab()
    expect(screen.getByRole('checkbox')).toHaveFocus()

    await userEvent.keyboard(' ')
    expect(onCheckedChange).toHaveBeenCalledWith(true)
  })

  it('exposes the indeterminate state to assistive tech', () => {
    render(<Checkbox checked="indeterminate" label="Hammasi" />)

    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-checked', 'mixed')
  })

  it('cannot be toggled while disabled', async () => {
    const onCheckedChange = vi.fn()
    render(<Checkbox disabled label="Arxivlangan" onCheckedChange={onCheckedChange} />)

    await userEvent.click(screen.getByText('Arxivlangan'))

    expect(onCheckedChange).not.toHaveBeenCalled()
  })
})
