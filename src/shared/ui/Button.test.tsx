import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Button } from './Button'

describe('Button', () => {
  it('defaults to type="button" so it cannot submit a form by accident', () => {
    render(<Button>Saqlash</Button>)

    expect(screen.getByRole('button', { name: 'Saqlash' })).toHaveAttribute('type', 'button')
  })

  it('blocks interaction while loading and announces the wait', async () => {
    const onClick = vi.fn()
    render(
      <Button isLoading onClick={onClick}>
        Saqlash
      </Button>,
    )

    const button = screen.getByRole('button', { name: 'Saqlash' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')

    await userEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('keeps the label visible while loading so the button does not resize', () => {
    render(<Button isLoading>Saqlash</Button>)

    expect(screen.getByRole('button', { name: 'Saqlash' })).toBeInTheDocument()
  })

  it('is reachable and activatable by keyboard', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Saqlash</Button>)

    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Saqlash' })).toHaveFocus()

    await userEvent.keyboard('{Enter}')
    expect(onClick).toHaveBeenCalledOnce()
  })

  it('lets a caller override a utility rather than stacking both', () => {
    render(<Button className="px-8">Saqlash</Button>)

    const className = screen.getByRole('button', { name: 'Saqlash' }).className
    expect(className).toContain('px-8')
    expect(className).not.toContain('px-4')
  })
})
