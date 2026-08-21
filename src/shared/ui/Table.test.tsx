import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableSkeleton,
} from './Table'

describe('Table', () => {
  it('exposes real table semantics so a screen reader can navigate by column', () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Ism</TableHead>
            <TableHead align="right">Balans</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Vali Aliyev</TableCell>
            <TableCell isNumeric align="right">
              120 000
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    )

    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Ism' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: 'Vali Aliyev' })).toBeInTheDocument()
  })

  it('defaults to the compact density staff need for long lists', () => {
    render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>Vali</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    )

    expect(screen.getByRole('cell', { name: 'Vali' }).className).toContain('py-2')
  })

  it('loosens up when asked to', () => {
    render(
      <Table density="comfortable">
        <TableBody>
          <TableRow>
            <TableCell>Vali</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    )

    expect(screen.getByRole('cell', { name: 'Vali' }).className).toContain('py-3')
  })

  it('lines up digits in numeric columns', () => {
    render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell isNumeric>120 000</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    )

    expect(screen.getByRole('cell', { name: '120 000' }).className).toContain('tabular-nums')
  })

  it('renders a skeleton shaped like the table it replaces', () => {
    render(
      <Table>
        <TableSkeleton columns={3} rows={5} />
      </Table>,
    )

    expect(screen.getAllByRole('row')).toHaveLength(5)
    expect(screen.getAllByRole('cell')).toHaveLength(15)
  })
})
