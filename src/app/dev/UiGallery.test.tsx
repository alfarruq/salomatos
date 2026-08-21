import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { UiGallery } from './UiGallery'

/**
 * The gallery is the place regressions are supposed to become visible, so it
 * has to survive every token and component change itself.
 */
describe('UiGallery', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('data-theme')
  })

  it('renders every section', () => {
    render(<UiGallery />)

    for (const title of ['Typography', 'Surfaces and text levels', 'Button', 'Field and Input']) {
      expect(screen.getByRole('heading', { name: title })).toBeInTheDocument()
    }
  })

  it('switches the document theme so both palettes can be reviewed', async () => {
    render(<UiGallery />)

    await userEvent.click(screen.getByRole('button', { name: 'Dark' }))
    expect(document.documentElement.dataset['theme']).toBe('dark')

    await userEvent.click(screen.getByRole('button', { name: 'Light' }))
    expect(document.documentElement.dataset['theme']).toBe('light')
  })
})
