import { Trash2, Users } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/shared/lib/cn'
import {
  Alert,
  Badge,
  Button,
  Card,
  Checkbox,
  Dialog,
  DialogClose,
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Popover,
  QueryBoundary,
  type QueryLike,
  Select,
  type SelectOption,
  Separator,
  Sheet,
  Skeleton,
  Switch,
  Textarea,
  Toaster,
  Tooltip,
  TooltipProvider,
  toast,
} from '@/shared/ui'

const STATUS_OPTIONS: SelectOption[] = [
  { value: 'active', label: 'Faol' },
  { value: 'archived', label: 'Arxivlangan' },
  { value: 'blocked', label: 'Bloklangan', disabled: true },
]

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

type DemoState = 'loading' | 'empty' | 'error' | 'data'

const DEMO_STATES: DemoState[] = ['loading', 'empty', 'error', 'data']

/** Builds the query shape QueryBoundary reads, without a real request. */
function demoQuery(state: DemoState): QueryLike<string[]> {
  return {
    data: state === 'data' ? ['Vali Aliyev', 'Aziza Karimova'] : state === 'empty' ? [] : undefined,
    isPending: state === 'loading',
    isError: state === 'error',
    error: state === 'error' ? new Error('network') : null,
    refetch: () => toast.info('refetch() chaqirildi'),
  }
}

function StatesDemo() {
  const [state, setState] = useState<DemoState>('loading')

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {DEMO_STATES.map((candidate) => (
          <Button
            key={candidate}
            onClick={() => setState(candidate)}
            size="sm"
            variant={state === candidate ? 'primary' : 'secondary'}
          >
            {candidate}
          </Button>
        ))}
      </div>

      <div className="rounded-control border border-border">
        <QueryBoundary
          empty={
            <EmptyState
              action={<Button variant="primary">Bemor qo&apos;shish</Button>}
              description="Birinchi bemorni qo'shsangiz, u shu yerda ko'rinadi."
              icon={<Users aria-hidden="true" className="size-8" />}
              title="Hali bemor qo'shilmagan"
            />
          }
          error={({ retry }) => (
            <ErrorState
              description="Internet aloqasini tekshirib, qayta urinib ko'ring."
              onRetry={retry ?? (() => {})}
              requestId="req_01J8XYZ"
              retryLabel="Qayta urinish"
              title="Bemorlar ro'yxati yuklanmadi"
            />
          )}
          loading={
            <div className="flex flex-col gap-2 p-4">
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-11 w-2/3" />
            </div>
          }
          query={demoQuery(state)}
        >
          {(patients) => (
            <ul className="flex flex-col gap-2 p-4">
              {patients.map((patient) => (
                <li className="text-body text-text" key={patient}>
                  {patient}
                </li>
              ))}
            </ul>
          )}
        </QueryBoundary>
      </div>
    </div>
  )
}

export function UiGallery() {
  const [theme, setTheme] = useState<Theme>('light')

  const toggleTheme = () => {
    const next: Theme = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    document.documentElement.dataset['theme'] = next
  }

  return (
    <TooltipProvider delayDuration={300}>
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

              <Field description="Bemor kartasida ko'rinadi" label="Izoh">
                <Textarea placeholder="Qisqacha anamnez" />
              </Field>

              <Field error="Holat tanlanmagan" label="Holat">
                <Select options={STATUS_OPTIONS} placeholder="Holatni tanlang" />
              </Field>

              <Field label="Holat (dense)">
                <Select options={STATUS_OPTIONS} placeholder="Holat" size="sm" />
              </Field>
            </div>
          </Section>

          <Section title="Selection controls">
            <Row label="Checkbox">
              <div className="flex flex-col gap-3">
                <Checkbox label="Arxivlangan bemorlarni ko'rsatish" />
                <Checkbox checked="indeterminate" label="Hammasi tanlangan" />
                <Checkbox disabled label="Disabled" />
              </div>
            </Row>

            <Row label="Switch — spring, the one place motion is felt (§11.5)">
              <div className="flex flex-col gap-3">
                <Switch defaultChecked label="SMS eslatma yuborish" />
                <Switch label="Email hisobot" />
                <Switch disabled label="Disabled" />
              </div>
            </Row>
          </Section>

          <Section title="Badge">
            <Row label="Tones — colour carries state, never decoration">
              <Badge tone="neutral">Qoralama</Badge>
              <Badge tone="accent">Faol</Badge>
              <Badge tone="success">To&apos;langan</Badge>
              <Badge tone="warning">Kutilmoqda</Badge>
              <Badge tone="danger">Bekor qilindi</Badge>
            </Row>
          </Section>

          <Section title="Card, Separator and Skeleton">
            <div className="flex flex-col gap-6">
              <Card className="p-6">
                <p className="text-body text-text">Card — border, not shadow (§11.1)</p>
                <Separator className="my-4" />
                <p className="text-callout text-text-secondary">Separator above.</p>
              </Card>

              <div className="flex flex-col gap-2">
                <span className="text-caption text-text-tertiary">
                  Skeleton — the loading state, never a spinner (§15)
                </span>
                <Skeleton className="h-11 w-full" />
                <Skeleton className="h-11 w-2/3" />
                <Skeleton className="h-11 w-1/3" />
              </div>
            </div>
          </Section>

          <Section title="Overlays">
            <Row label="Dialog — focus trapped, Escape closes, 220ms open (§11.5)">
              <Dialog
                description="Bemor arxivga o'tadi. Yozuvlari saqlanib qoladi."
                footer={
                  <>
                    <DialogClose asChild>
                      <Button variant="secondary">Bekor qilish</Button>
                    </DialogClose>
                    <Button variant="danger">Arxivlash</Button>
                  </>
                }
                title="Bemorni arxivlash"
                trigger={<Button variant="secondary">Dialog</Button>}
              >
                <p className="text-body text-text-secondary">
                  Arxivlangan bemor ro&apos;yxatda ko&apos;rinmaydi, lekin qidiruvda topiladi.
                </p>
              </Dialog>

              <Dialog
                description="Yopib bo'lmaydi — Escape ham, tashqariga bosish ham ishlamaydi."
                footer={
                  <DialogClose asChild>
                    <Button variant="primary">Tugatish</Button>
                  </DialogClose>
                }
                isDismissDisabled
                title="To'lovni yakunlash"
                trigger={<Button variant="secondary">Dialog (dismiss o&apos;chirilgan)</Button>}
              />
            </Row>

            <Row label="Sheet — side panel on the dialog primitive">
              <Sheet
                description="Filtrlar bemorlar ro'yxatiga qo'llanadi."
                footer={<Button variant="primary">Qo&apos;llash</Button>}
                title="Filtrlar"
                trigger={<Button variant="secondary">Sheet</Button>}
              >
                <div className="flex flex-col gap-6">
                  <Field label="Holat">
                    <Select options={STATUS_OPTIONS} placeholder="Holat" />
                  </Field>
                  <Checkbox label="Faqat bugungi tashriflar" />
                </div>
              </Sheet>
            </Row>

            <Row label="Popover, menu and tooltip">
              <Popover trigger={<Button variant="secondary">Popover</Button>}>
                <p className="text-body text-text">Ixtiyoriy kontent.</p>
              </Popover>

              <DropdownMenu trigger={<Button variant="secondary">Amallar</Button>}>
                <DropdownMenuLabel>Bemor</DropdownMenuLabel>
                <DropdownMenuItem>Tahrirlash</DropdownMenuItem>
                <DropdownMenuItem disabled>Nusxalash</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  iconLeft={<Trash2 aria-hidden="true" className="size-4" />}
                  isDestructive
                >
                  O&apos;chirish
                </DropdownMenuItem>
              </DropdownMenu>

              <Tooltip content="Ma'lumot faqat shu yerda turmasin — tooltip sensorli ekranda ko'rinmaydi">
                <Button variant="ghost">Tooltip</Button>
              </Tooltip>
            </Row>
          </Section>

          <Section title="The four states (§15)">
            <StatesDemo />
          </Section>

          <Section title="Alert and Toast">
            <Row label="Alert — inline, stays on the page">
              <div className="flex w-full flex-col gap-3">
                <Alert title="Klinika sozlamalari yangilandi." tone="info" />
                <Alert title="Bemor saqlandi." tone="success" />
                <Alert title="Bu vaqt band. Boshqa vaqt tanlang." tone="warning" />
                <Alert title="O'zgarishlar saqlanmadi. Qayta urinib ko'ring." tone="danger">
                  Internet aloqasi uzilgan bo&apos;lishi mumkin.
                </Alert>
              </div>
            </Row>

            <Row label="Toast — transient. Never PHI (§13.4)">
              <Button onClick={() => toast.success('Saqlandi')} variant="secondary">
                Success
              </Button>
              <Button
                onClick={() => toast.error('Bu vaqt band. Boshqa vaqt tanlang.')}
                variant="secondary"
              >
                Error
              </Button>
              <Button
                onClick={() =>
                  toast('Bemor arxivlandi', {
                    action: { label: 'Qaytarish', onClick: () => toast.success('Qaytarildi') },
                  })
                }
                variant="secondary"
              >
                With action
              </Button>
            </Row>
          </Section>
        </div>

        <Toaster />
      </div>
    </TooltipProvider>
  )
}
