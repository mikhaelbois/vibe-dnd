import { fireEvent, render, screen } from '@testing-library/react'
import useSWR from 'swr'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DescriptionPanel } from './DescriptionPanel'

vi.mock('swr', () => ({ default: vi.fn() }))

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

describe('descriptionPanel', () => {
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

  it('shows filter input and spell count when spells are loaded', () => {
    vi.mocked(useSWR)
      .mockReturnValueOnce({ data: null, isLoading: false, error: undefined } as ReturnType<typeof useSWR>)
      .mockReturnValueOnce({ data: null, isLoading: false, error: undefined } as ReturnType<typeof useSWR>)
      .mockReturnValueOnce({ data: null, isLoading: false, error: undefined } as ReturnType<typeof useSWR>)
      .mockReturnValueOnce({ data: null, isLoading: false, error: undefined } as ReturnType<typeof useSWR>)
      .mockReturnValueOnce({
        data: {
          results: [
            { key: 'fireball', name: 'Fireball', level: 3, school: { name: 'Evocation' }, casting_time: '1 action', range_text: '150 feet', duration: 'Instantaneous', concentration: false, desc: 'A bright streak flashes.' },
            { key: 'magic-missile', name: 'Magic Missile', level: 1, school: { name: 'Evocation' }, casting_time: '1 action', range_text: '120 feet', duration: 'Instantaneous', concentration: false, desc: 'You create three darts.' },
          ],
        },
        isLoading: false,
        error: undefined,
      } as ReturnType<typeof useSWR>)

    render(<DescriptionPanel draft={{ name: 'Test', race: '', class: 'srd_wizard', subclass: '', background: '', level: 1 }} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Spells' }))

    expect(screen.getByPlaceholderText('Filter spells…')).toBeInTheDocument()
    expect(screen.getByText('2 spells')).toBeInTheDocument()
    expect(screen.getByText('Fireball')).toBeInTheDocument()
    expect(screen.getByText('Magic Missile')).toBeInTheDocument()
  })

  it('filters spells by name and updates count', () => {
    vi.mocked(useSWR)
      .mockReturnValueOnce({ data: null, isLoading: false, error: undefined } as ReturnType<typeof useSWR>)
      .mockReturnValueOnce({ data: null, isLoading: false, error: undefined } as ReturnType<typeof useSWR>)
      .mockReturnValueOnce({ data: null, isLoading: false, error: undefined } as ReturnType<typeof useSWR>)
      .mockReturnValueOnce({ data: null, isLoading: false, error: undefined } as ReturnType<typeof useSWR>)
      .mockReturnValueOnce({
        data: {
          results: [
            { key: 'fireball', name: 'Fireball', level: 3, school: { name: 'Evocation' }, casting_time: '1 action', range_text: '150 feet', duration: 'Instantaneous', concentration: false, desc: 'A bright streak flashes.' },
            { key: 'magic-missile', name: 'Magic Missile', level: 1, school: { name: 'Evocation' }, casting_time: '1 action', range_text: '120 feet', duration: 'Instantaneous', concentration: false, desc: 'You create three darts.' },
          ],
        },
        isLoading: false,
        error: undefined,
      } as ReturnType<typeof useSWR>)

    render(<DescriptionPanel draft={{ name: 'Test', race: '', class: 'srd_wizard', subclass: '', background: '', level: 1 }} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Spells' }))

    fireEvent.change(screen.getByPlaceholderText('Filter spells…'), { target: { value: 'fire' } })

    expect(screen.getByText('Fireball')).toBeInTheDocument()
    expect(screen.queryByText('Magic Missile')).not.toBeInTheDocument()
    expect(screen.getByText('1 of 2 spells')).toBeInTheDocument()
  })

  it('resets filter when class changes', () => {
    vi.mocked(useSWR)
      .mockReturnValue({
        data: {
          results: [
            { key: 'fireball', name: 'Fireball', level: 3, school: { name: 'Evocation' }, casting_time: '1 action', range_text: '150 feet', duration: 'Instantaneous', concentration: false, desc: 'A bright streak flashes.' },
          ],
        },
        isLoading: false,
        error: undefined,
      } as ReturnType<typeof useSWR>)

    const { rerender } = render(
      <DescriptionPanel draft={{ name: 'Test', race: '', class: 'srd_wizard', subclass: '', background: '', level: 1 }} />,
    )
    fireEvent.click(screen.getByRole('tab', { name: 'Spells' }))

    const input = screen.getByPlaceholderText('Filter spells…')
    fireEvent.change(input, { target: { value: 'fire' } })
    expect(input).toHaveValue('fire')

    rerender(
      <DescriptionPanel draft={{ name: 'Test', race: '', class: 'srd_cleric', subclass: '', background: '', level: 1 }} />,
    )
    expect(input).toHaveValue('')
  })
})
