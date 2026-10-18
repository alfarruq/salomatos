import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { storage } from '@/shared/lib/storage'
import { AppShell } from './AppShell'

const labels = {
  skipToContent: "Asosiy qismga o'tish",
  openNavigation: 'Menyuni ochish',
  navigation: 'Asosiy menyu',
  collapseNavigation: "Menyuni yig'ish",
  expandNavigation: 'Menyuni yoyish',
}

function shell() {
  return (
    <AppShell brand={<span>SalomatOS</span>} labels={labels} sidebar={<a href="/p">Bemorlar</a>}>
      <h1>Bemorlar</h1>
    </AppShell>
  )
}

afterEach(() => {
  storage.remove('sidebarCollapsed')
})

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

  it('collapses the rail and expands it again', async () => {
    render(shell())
    const rail = screen.getByRole('navigation', { name: 'Asosiy menyu' })

    await userEvent.click(within(rail).getByRole('button', { name: "Menyuni yig'ish" }))
    expect(rail).toHaveAttribute('data-collapsed', 'true')

    await userEvent.click(within(rail).getByRole('button', { name: 'Menyuni yoyish' }))
    expect(rail).toHaveAttribute('data-collapsed', 'false')
  })

  it('remembers the collapsed rail across reloads', async () => {
    const { unmount } = render(shell())
    await userEvent.click(screen.getByRole('button', { name: "Menyuni yig'ish" }))
    unmount()

    render(shell())

    expect(screen.getByRole('navigation', { name: 'Asosiy menyu' })).toHaveAttribute(
      'data-collapsed',
      'true',
    )
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

  it('replaces the menu button with a tab bar whose last tab opens the full menu', async () => {
    render(
      <AppShell
        brand={<span>SalomatOS</span>}
        labels={{ ...labels, more: 'Yana' }}
        sidebar={<a href="/p">Bemorlar</a>}
        tabBar={<a href="/d">Bugun</a>}
      >
        <h1>Bemorlar</h1>
      </AppShell>,
    )

    expect(screen.getByRole('button', { name: 'Menyuni ochish' })).toHaveClass('hidden')
    expect(screen.getByRole('link', { name: 'Bugun' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Yana' }))

    expect(screen.getByRole('dialog', { name: 'Asosiy menyu' })).toBeInTheDocument()
  })
})
