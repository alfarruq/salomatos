import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { type CommandGroup, CommandPalette, useCommandShortcut } from './CommandPalette'

const labels = {
  placeholder: 'Buyruq yoki sahifa',
  emptyLabel: 'Hech narsa topilmadi',
  label: 'Buyruqlar',
}

function groupsWith(onSelect = vi.fn()): CommandGroup[] {
  return [
    {
      label: 'Sahifalar',
      items: [
        { id: 'patients', label: 'Bemorlar', keywords: ['patients'], onSelect },
        { id: 'appointments', label: 'Uchrashuvlar', hint: '⌘2', onSelect: vi.fn() },
      ],
    },
  ]
}

describe('CommandPalette', () => {
  it('lists the groups it was given', () => {
    render(<CommandPalette groups={groupsWith()} onOpenChange={vi.fn()} open {...labels} />)

    expect(screen.getByRole('option', { name: /Bemorlar/ })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /Uchrashuvlar/ })).toBeInTheDocument()
  })

  it('filters as the user types', async () => {
    render(<CommandPalette groups={groupsWith()} onOpenChange={vi.fn()} open {...labels} />)

    await userEvent.type(screen.getByRole('combobox'), 'Bemor')

    expect(screen.getByRole('option', { name: /Bemorlar/ })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /Uchrashuvlar/ })).not.toBeInTheDocument()
  })

  it('matches on keywords so a second language still finds the page', async () => {
    render(<CommandPalette groups={groupsWith()} onOpenChange={vi.fn()} open {...labels} />)

    await userEvent.type(screen.getByRole('combobox'), 'patients')

    expect(screen.getByRole('option', { name: /Bemorlar/ })).toBeInTheDocument()
  })

  it('says so when nothing matches', async () => {
    render(<CommandPalette groups={groupsWith()} onOpenChange={vi.fn()} open {...labels} />)

    await userEvent.type(screen.getByRole('combobox'), 'zzzzz')

    expect(screen.getByText('Hech narsa topilmadi')).toBeInTheDocument()
  })

  it('runs the item and closes on Enter', async () => {
    const onSelect = vi.fn()
    const onOpenChange = vi.fn()
    render(
      <CommandPalette groups={groupsWith(onSelect)} onOpenChange={onOpenChange} open {...labels} />,
    )

    await userEvent.keyboard('{Enter}')

    expect(onSelect).toHaveBeenCalledOnce()
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})

describe('useCommandShortcut', () => {
  function Subject() {
    const [count, setCount] = useState(0)
    useCommandShortcut(() => setCount((value) => value + 1))
    return (
      <div>
        <span>opened {count}</span>
        <input aria-label="Izoh" />
      </div>
    )
  }

  it('opens on Ctrl+K', async () => {
    render(<Subject />)

    await userEvent.keyboard('{Control>}k{/Control}')

    expect(screen.getByText('opened 1')).toBeInTheDocument()
  })

  it('stays out of the way while the user is typing in a field', async () => {
    render(<Subject />)

    await userEvent.click(screen.getByLabelText('Izoh'))
    await userEvent.keyboard('{Control>}k{/Control}')

    // Losing half a typed address to a stray modifier is worse than missing
    // the shortcut.
    expect(screen.getByText('opened 0')).toBeInTheDocument()
  })
})
