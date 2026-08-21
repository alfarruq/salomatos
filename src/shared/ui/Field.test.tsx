import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Field } from './Field'
import { Input } from './Input'

describe('Field', () => {
  it('associates the label with the control it wraps', () => {
    render(
      <Field label="Telefon">
        <Input />
      </Field>,
    )

    expect(screen.getByLabelText('Telefon')).toBeInTheDocument()
  })

  it('describes the control with its hint', () => {
    render(
      <Field description="+998 bilan boshlanadi" label="Telefon">
        <Input />
      </Field>,
    )

    expect(screen.getByLabelText('Telefon')).toHaveAccessibleDescription('+998 bilan boshlanadi')
  })

  it('marks the control invalid and announces the error', () => {
    render(
      <Field error="Telefon raqami noto'g'ri" label="Telefon">
        <Input />
      </Field>,
    )

    const input = screen.getByLabelText('Telefon')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription("Telefon raqami noto'g'ri")
    expect(screen.getByRole('alert')).toHaveTextContent("Telefon raqami noto'g'ri")
  })

  it('replaces the hint with the error rather than reading both', () => {
    render(
      <Field description="+998 bilan boshlanadi" error="Telefon raqami noto'g'ri" label="Telefon">
        <Input />
      </Field>,
    )

    expect(screen.getByLabelText('Telefon')).toHaveAccessibleDescription("Telefon raqami noto'g'ri")
    expect(screen.queryByText('+998 bilan boshlanadi')).not.toBeInTheDocument()
  })

  it('generates a unique id per field so two fields never collide', () => {
    render(
      <>
        <Field label="Ism">
          <Input />
        </Field>
        <Field label="Familiya">
          <Input />
        </Field>
      </>,
    )

    expect(screen.getByLabelText('Ism').id).not.toBe(screen.getByLabelText('Familiya').id)
  })
})
