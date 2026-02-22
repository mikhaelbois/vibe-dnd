import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('swr', () => ({ default: vi.fn() }))
import useSWR from 'swr'

import { DescriptionPanel } from './DescriptionPanel'

const mockUseSWR = vi.mocked(useSWR)

const emptyDraft = {
  name: '',
  race: '',
  class: '',
  subclass: '',
  background: '',
  level: 1,
}

beforeEach(() => {
  mockUseSWR.mockReturnValue({ data: undefined, isLoading: false, error: undefined } as ReturnType<typeof useSWR>)
})

describe('DescriptionPanel', () => {
  it('shows empty state when no race selected', () => {
    render(<DescriptionPanel draft={emptyDraft} />)
    expect(screen.getByText('Select a race to see details.')).toBeInTheDocument()
  })

  it('calls useSWR with species URL when race is selected', () => {
    render(<DescriptionPanel draft={{ ...emptyDraft, race: 'srd_elf' }} />)
    expect(mockUseSWR).toHaveBeenCalledWith('https://api.open5e.com/v2/species/srd_elf/')
  })

  it('calls useSWR with null when no race selected', () => {
    render(<DescriptionPanel draft={emptyDraft} />)
    expect(mockUseSWR).toHaveBeenCalledWith(null)
  })

  it('shows loading skeleton when race data is loading', () => {
    mockUseSWR.mockReturnValue({ data: undefined, isLoading: true, error: undefined } as ReturnType<typeof useSWR>)
    render(<DescriptionPanel draft={{ ...emptyDraft, race: 'srd_elf' }} />)
    expect(screen.queryByText('Select a race to see details.')).not.toBeInTheDocument()
  })
})
