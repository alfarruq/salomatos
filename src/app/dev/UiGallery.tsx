import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/shared/lib/cn'
import { Button, Field, Input } from '@/shared/ui'

/**
 * The component reference from §15 of CLAUDE.md, reachable at /dev/ui in dev
 * builds only.
 *
 * Its job is to make regressions visible: every variant and state on one page,
 * in both themes, so a token change cannot quietly break a control nobody
 * happened to open that week. Text here is intentionally not translated — this
 * page never ships to a user.
 */

type Theme = 'light' | 'dark'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-title2 text-text">{title}</h2>
      <div className="rounded-card border border-border bg-surface p-6">{children}</div>
    </section>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 py-3">
      <span className="text-caption text-text-tertiary">{label}</span>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  )
}

const TYPE_SCALE = [
  ['text-display', 'Display 40/44'],
  ['text-title1', 'Title 1 28/34'],
  ['text-title2', 'Title 2 22/28'],
  ['text-body', 'Body 15/22'],
  ['text-callout', 'Callout 14/20'],
  ['text-caption', 'Caption 12/16'],
] as const

/*
 * Written out rather than composed — Tailwind scans for literal class strings,
 * so `bg-${name}` would produce no CSS at all.
 */
const SURFACES = [
  { name: 'canvas', className: 'bg-canvas' },
  { name: 'surface', className: 'bg-surface' },
  { name: 'elevated', className: 'bg-elevated' },
  { name: 'sunken', className: 'bg-sunken' },
] as const

const TEXT_LEVELS = [
  { name: 'text', className: 'text-text' },
  { name: 'text-secondary', className: 'text-text-secondary' },
  { name: 'text-tertiary', className: 'text-text-tertiary' },
] as const

export function UiGallery() {
  const [theme, setTheme] = useState<Theme>('light')

  const toggleTheme = () => {
    const next: Theme = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    document.documentElement.dataset['theme'] = next
  }

  return (
    <div className="min-h-dvh bg-canvas px-6 py-12">
      <div className="mx-auto flex max-w-3xl flex-col gap-12">
        <header className="flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-title1 text-text">Component reference</h1>
            <p className="text-callout text-text-secondary">
              Every variant and state, both themes. Dev builds only.
            </p>
          </div>
          <Button onClick={toggleTheme} variant="secondary">
            {theme === 'light' ? 'Dark' : 'Light'}
          </Button>
        </header>

        <Section title="Typography">
          <div className="flex flex-col gap-4">
            {TYPE_SCALE.map(([className, label]) => (
              <p className={`${className} text-text`} key={className}>
                {label}
              </p>
            ))}
          </div>
        </Section>

        <Section title="Surfaces and text levels">
          <div className="flex flex-col gap-3">
            {SURFACES.map((surface) => (
              <div
                className={cn(
                  surface.className,
                  'flex flex-wrap gap-4 rounded-control border border-border p-4',
                )}
                key={surface.name}
              >
                <span className="w-20 text-caption text-text-tertiary">{surface.name}</span>
                {TEXT_LEVELS.map((level) =>
                  // text-tertiary is deliberately absent on sunken — it cannot
                  // reach AA there (see check:contrast).
                  surface.name === 'sunken' && level.name === 'text-tertiary' ? null : (
                    <span className={cn('text-callout', level.className)} key={level.name}>
                      {level.name}
                    </span>
                  ),
                )}
              </div>
            ))}
          </div>
        </Section>

        <Section title="Button">
          <Row label="Variants (md)">
            <Button variant="primary">Bemorni saqlash</Button>
            <Button variant="secondary">Bekor qilish</Button>
            <Button variant="ghost">Batafsil</Button>
            <Button iconLeft={<Trash2 aria-hidden="true" className="size-4" />} variant="danger">
              O&apos;chirish
            </Button>
          </Row>

          <Row label="Dense (sm) — tables and toolbars">
            <Button size="sm" variant="primary">
              Qo&apos;shish
            </Button>
            <Button size="sm" variant="secondary">
              Filtr
            </Button>
            <Button size="sm" variant="ghost">
              Tahrirlash
            </Button>
          </Row>

          <Row label="States">
            <Button isLoading variant="primary">
              Saqlanmoqda
            </Button>
            <Button disabled variant="primary">
              Disabled
            </Button>
            <Button disabled variant="secondary">
              Disabled
            </Button>
          </Row>
        </Section>

        <Section title="Field and Input">
          <div className="flex max-w-sm flex-col gap-6">
            <Field isRequired label="Ism">
              <Input placeholder="Vali" />
            </Field>

            <Field description="+998 bilan boshlanadi" label="Telefon">
              <Input placeholder="+998901234567" />
            </Field>

            <Field error="Telefon raqami noto'g'ri" label="Telefon">
              <Input defaultValue="12345" />
            </Field>

            <Field label="Dense">
              <Input placeholder="Qidiruv" size="sm" />
            </Field>

            <Field label="Disabled">
              <Input disabled placeholder="O'zgartirib bo'lmaydi" />
            </Field>
          </div>
        </Section>
      </div>
    </div>
  )
}
