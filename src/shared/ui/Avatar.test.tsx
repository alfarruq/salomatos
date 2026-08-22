import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Avatar } from './Avatar'

describe('Avatar', () => {
  it('falls back to initials from the first two words', () => {
    render(<Avatar name="Vali Aliyev" />)

    expect(screen.getByText('VA')).toBeInTheDocument()
  })

  it('handles a single name without inventing a second initial', () => {
    render(<Avatar name="Vali" />)

    expect(screen.getByText('V')).toBeInTheDocument()
  })

  it('ignores a third name rather than crowding the circle', () => {
    render(<Avatar name="Vali Aliyev Rustamovich" />)

    expect(screen.getByText('VA')).toBeInTheDocument()
  })

  it('tolerates extra whitespace', () => {
    render(<Avatar name="  Vali   Aliyev  " />)

    expect(screen.getByText('VA')).toBeInTheDocument()
  })
})
