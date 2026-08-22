import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Button } from './Button'
import { Dialog, DialogClose } from './Dialog'

describe('Dialog', () => {
  it('opens from its trigger and is named by its title', async () => {
    render(<Dialog title="Bemorni o'chirish" trigger={<Button>Ochish</Button>} />)

    await userEvent.click(screen.getByRole('button', { name: 'Ochish' }))

    expect(screen.getByRole('dialog', { name: "Bemorni o'chirish" })).toBeInTheDocument()
  })

  it('describes itself with the supporting line', async () => {
    render(
      <Dialog
        description="Bu amalni qaytarib bo'lmaydi."
        title="Bemorni o'chirish"
        trigger={<Button>Ochish</Button>}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Ochish' }))

    expect(screen.getByRole('dialog')).toHaveAccessibleDescription("Bu amalni qaytarib bo'lmaydi.")
  })

  it('closes on Escape', async () => {
    const onOpenChange = vi.fn()
    render(<Dialog onOpenChange={onOpenChange} open title="Bemorni o'chirish" />)

    await userEvent.keyboard('{Escape}')

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('refuses to close when dismissal is disabled', async () => {
    const onOpenChange = vi.fn()
    render(<Dialog isDismissDisabled onOpenChange={onOpenChange} open title="To'lov" />)

    await userEvent.keyboard('{Escape}')

    expect(onOpenChange).not.toHaveBeenCalled()
    // The close affordance is gone too, not merely inert.
    expect(screen.queryByRole('button', { name: 'Yopish' })).not.toBeInTheDocument()
  })

  it('closes from a footer button', async () => {
    const onOpenChange = vi.fn()
    render(
      <Dialog
        footer={
          <DialogClose asChild>
            <Button>Bekor qilish</Button>
          </DialogClose>
        }
        onOpenChange={onOpenChange}
        open
        title="Bemorni o'chirish"
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Bekor qilish' }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('keeps focus inside while it is open', async () => {
    render(
      <Dialog
        footer={<Button>Tasdiqlash</Button>}
        open
        title="Bemorni o'chirish"
        trigger={<Button>Ochish</Button>}
      />,
    )

    const dialog = screen.getByRole('dialog')

    // Tab through more elements than the dialog holds; focus must never escape
    // to the page behind it.
    for (let index = 0; index < 6; index += 1) {
      await userEvent.tab()
      expect(dialog).toContainElement(document.activeElement as HTMLElement)
    }
  })
})
