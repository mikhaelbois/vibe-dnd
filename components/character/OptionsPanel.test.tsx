import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('swr', () => ({ default: vi.fn() }))
import useSWR from 'swr'

import { OptionsPanel } from './OptionsPanel'
import type { Race, Class, Background } from '@/lib/open5e'

const mockUseSWR = vi.mocked(useSWR)

const races: Race[] = [{ key: 'srd_elf', name: 'Elf', desc: '' }]
const classes: Class[] = [{ key: 'srd_wizard', name: 'Wizard', desc: '', hit_dice: 'd6', saving_throws: [], subclasses: [] }]
const backgrounds: Background[] = [{ key: 'srd_acolyte', name: 'Acolyte', desc: '', benefits: [] }]

const defaultProps = {
  races,
  classes,
  backgrounds,
  onDraftChange: vi.fn(),
  onSave: vi.fn(),
}

beforeEach(() => {
  mockUseSWR.mockReturnValue({ data: undefined, isLoading: false, error: undefined } as ReturnType<typeof useSWR>)
})

describe('OptionsPanel', () => {
  it('calls useSWR with null when no class is selected', () => {
    render(<OptionsPanel {...defaultProps} />)
    expect(mockUseSWR).toHaveBeenCalledWith(null)
  })

  it('calls useSWR with subclasses URL when class is selected', () => {
    render(<OptionsPanel {...defaultProps} initialDraft={{ class: 'srd_wizard' }} />)
    expect(mockUseSWR).toHaveBeenCalledWith('/api/subclasses?class=srd_wizard')
  })

  it('shows Loading… placeholder when subclasses are loading', () => {
    mockUseSWR.mockReturnValue({ data: undefined, isLoading: true, error: undefined } as ReturnType<typeof useSWR>)
    render(<OptionsPanel {...defaultProps} initialDraft={{ class: 'srd_wizard' }} />)
    expect(screen.getByText('Loading…')).toBeInTheDocument()
  })
})
