import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { AppShell } from './AppShell'

const labels = {
  skipToContent: "Asosiy qismga o'tish",
  openNavigation: 'Menyuni ochish',
  navigation: 'Asosiy menyu',
}

function shell() {
  return (
    <AppShell brand={<span>SalomatOS</span>} labels={labels} sidebar={<a href="/p">Bemorlar</a>}>
      <h1>Bemorlar</h1>
    </AppShell>
  )
}

describe('AppShell', () => {
  it('puts a skip link first in the tab order', async () => {
    render(shell())

    await userEvent.tab()

    const skip = screen.getByRole('link', { name: "Asosiy qismga o'tish" })
    expect(skip).toHaveFocus()
    expect(skip).toHaveAttribute('href', '#main')
  })

  it('gives the content an id the skip link can reach', () => {
    render(shell())

    expect(screen.getByRole('main')).toHaveAttribute('id', 'main')
  })

  it('names the navigation landmark', () => {
    render(shell())

    expect(screen.getByRole('navigation', { name: 'Asosiy menyu' })).toBeInTheDocument()
  })

  it('opens the navigation sheet on small screens', async () => {
    render(shell())

    await userEvent.click(screen.getByRole('button', { name: 'Menyuni ochish' }))

    expect(screen.getByRole('dialog', { name: 'Asosiy menyu' })).toBeInTheDocument()
  })

  it('closes the navigation sheet once a link in it is followed', async () => {
    render(shell())

    await userEvent.click(screen.getByRole('button', { name: 'Menyuni ochish' }))
    const sheet = screen.getByRole('dialog', { name: 'Asosiy menyu' })
    await userEvent.click(within(sheet).getByRole('link', { name: 'Bemorlar' }))

    expect(screen.queryByRole('dialog', { name: 'Asosiy menyu' })).not.toBeInTheDocument()
  })
})
