import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Logo } from './Logo'

describe('Logo', () => {
  it('reads as one word, with the tooth hidden from assistive tech', () => {
    const { container } = render(<Logo />)

    expect(
      screen.getByText(
        (_, node) =>
          node?.textContent === 'SalomatOS' &&
          node.tagName === 'SPAN' &&
          node.childElementCount === 1,
      ),
    ).toBeInTheDocument()
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it('gives each mark its own mask so two logos on a page do not share one', () => {
    const { container } = render(
      <>
        <Logo />
        <Logo />
      </>,
    )

    const ids = [...container.querySelectorAll('mask')].map((mask) => mask.id)
    expect(new Set(ids).size).toBe(2)
    for (const id of ids) {
      expect(container.querySelector(`[mask="url(#${id})"]`)).not.toBeNull()
    }
  })
})
