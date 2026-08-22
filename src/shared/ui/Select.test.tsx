import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Field } from './Field'
import { Select, type SelectOption } from './Select'

const OPTIONS: SelectOption[] = [
  { value: 'active', label: 'Faol' },
  { value: 'archived', label: 'Arxivlangan' },
  { value: 'blocked', label: 'Bloklangan', disabled: true },
]

describe('Select', () => {
  it('shows the placeholder until something is chosen', () => {
    render(<Select options={OPTIONS} placeholder="Holatni tanlang" />)

    expect(screen.getByRole('combobox')).toHaveTextContent('Holatni tanlang')
  })

  it('selects an option with the keyboard alone', async () => {
    const onValueChange = vi.fn()
    render(<Select onValueChange={onValueChange} options={OPTIONS} placeholder="Holat" />)

    await userEvent.tab()
    expect(screen.getByRole('combobox')).toHaveFocus()

    await userEvent.keyboard('{Enter}')
    await userEvent.keyboard('{ArrowDown}{Enter}')

    expect(onValueChange).toHaveBeenCalledWith('archived')
  })

  it('does not offer a disabled option', async () => {
    render(<Select options={OPTIONS} placeholder="Holat" />)

    await userEvent.click(screen.getByRole('combobox'))

    expect(screen.getByRole('option', { name: 'Bloklangan' })).toHaveAttribute('data-disabled', '')
  })

  it('picks up the label and error wiring from a surrounding Field', () => {
    render(
      <Field error="Holat tanlanmagan" label="Holat">
        <Select options={OPTIONS} />
      </Field>,
    )

    const trigger = screen.getByRole('combobox', { name: 'Holat' })
    expect(trigger).toHaveAttribute('aria-invalid', 'true')
    expect(trigger).toHaveAccessibleDescription('Holat tanlanmagan')
  })
})
