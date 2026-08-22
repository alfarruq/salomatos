import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Button } from './Button'
import { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator } from './DropdownMenu'

function Menu({ onArchive = vi.fn(), onDelete = vi.fn() }) {
  return (
    <DropdownMenu trigger={<Button>Amallar</Button>}>
      <DropdownMenuItem onSelect={onArchive}>Arxivlash</DropdownMenuItem>
      <DropdownMenuItem disabled>Nusxalash</DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem isDestructive onSelect={onDelete}>
        O&apos;chirish
      </DropdownMenuItem>
    </DropdownMenu>
  )
}

describe('DropdownMenu', () => {
  it('opens from the keyboard with the first item already focused', async () => {
    const onArchive = vi.fn()
    render(<Menu onArchive={onArchive} />)

    await userEvent.tab()
    await userEvent.keyboard('{Enter}')

    expect(screen.getByRole('menu')).toBeInTheDocument()
    // Opening by keyboard lands on the first item, so it takes no extra arrow
    // press to act — the whole point of reaching for the keyboard.
    expect(screen.getByRole('menuitem', { name: 'Arxivlash' })).toHaveFocus()

    await userEvent.keyboard('{Enter}')
    expect(onArchive).toHaveBeenCalledOnce()
  })

  it('skips a disabled item rather than selecting it', async () => {
    const onDelete = vi.fn()
    render(<Menu onDelete={onDelete} />)

    await userEvent.click(screen.getByRole('button', { name: 'Amallar' }))
    expect(screen.getByRole('menuitem', { name: 'Nusxalash' })).toHaveAttribute('data-disabled')

    // Two presses from the top would land on the disabled item if it took part.
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{Enter}')
    expect(onDelete).toHaveBeenCalledOnce()
  })

  it('closes on Escape', async () => {
    render(<Menu />)

    await userEvent.click(screen.getByRole('button', { name: 'Amallar' }))
    await userEvent.keyboard('{Escape}')

    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })
})
