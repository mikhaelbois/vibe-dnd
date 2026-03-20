import type { Background, Class, Race, Subclass } from '@/lib/open5e'
import type { CharacterDraft } from '@/lib/types'
import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import useSWR from 'swr'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DescriptionPanel } from './DescriptionPanel'

vi.mock('swr', () => ({ default: vi.fn() }))
const mockUseSWR = vi.mocked(useSWR)

const emptyDraft: CharacterDraft = {
  name: '',
  race: '',
  class: '',
  subclass: '',
  background: '',
  level: 1,
}

const races: Race[] = [
  { key: 'srd_elf', name: 'Elf', desc: 'An elf.', is_subspecies: false, traits: [{ name: 'Darkvision', desc: 'See in dark.' }] },
]
const classes: Class[] = [
  { key: 'srd_wizard', name: 'Wizard', desc: 'A wizard.', hit_dice: 'd6', saving_throws: [{ name: 'Intelligence', url: '' }] },
]
const backgrounds: Background[] = [
  { key: 'srd_acolyte', name: 'Acolyte', desc: 'A holy person.', benefits: [{ name: 'Shelter', desc: 'You get shelter.', type: 'feature' }] },
]
const subclasses: Subclass[] = [
  { key: 'srd_evocation', name: 'School of Evocation', desc: 'You focus on spells.', subclass_of: { name: 'Wizard', key: 'srd_wizard', url: '' } },
]

const defaultListProps = {
  races,
  classes,
  backgrounds,
  subclasses,
  loadingSubclasses: false,
}

const spellData = [
  { key: 'fireball', name: 'Fireball', level: 3, school: { name: 'Evocation', key: 'evocation' }, casting_time: '1 action', range_text: '150 feet', duration: 'Instantaneous', concentration: false, desc: 'A bright streak flashes.', verbal: true, somatic: true, material: false, ritual: false, classes: [] },
  { key: 'magic-missile', name: 'Magic Missile', level: 1, school: { name: 'Evocation', key: 'evocation' }, casting_time: '1 action', range_text: '120 feet', duration: 'Instantaneous', concentration: false, desc: 'You create three darts.', verbal: true, somatic: true, material: false, ritual: false, classes: [] },
]

beforeEach(() => {
  mockUseSWR.mockReturnValue({ data: undefined, isLoading: false, error: undefined } as ReturnType<typeof useSWR>)
})

function ControlledPanel({ draft, initialTab = 'race' }: { draft: CharacterDraft, initialTab?: string }) {
  const [activeTab, setActiveTab] = useState(initialTab)
  return (
    <DescriptionPanel
      draft={draft}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      {...defaultListProps}
    />
  )
}

describe('descriptionPanel', () => {
  it('shows empty state when no race selected', () => {
    render(
      <DescriptionPanel draft={emptyDraft} activeTab="race" onTabChange={vi.fn()} {...defaultListProps} />,
    )
    expect(screen.getByText('Select a race to see details.')).toBeInTheDocument()
  })

  it('shows race name and traits when race is selected', () => {
    render(
      <DescriptionPanel
        draft={{ ...emptyDraft, race: 'srd_elf' }}
        activeTab="race"
        onTabChange={vi.fn()}
        {...defaultListProps}
      />,
    )
    expect(screen.getByText('Elf')).toBeInTheDocument()
    expect(screen.getByText('Darkvision')).toBeInTheDocument()
  })

  it('shows empty state when no class selected', () => {
    render(
      <DescriptionPanel draft={emptyDraft} activeTab="class" onTabChange={vi.fn()} {...defaultListProps} />,
    )
    expect(screen.getByText('Select a class to see details.')).toBeInTheDocument()
  })

  it('shows class name and hit die when class is selected', () => {
    render(
      <DescriptionPanel
        draft={{ ...emptyDraft, class: 'srd_wizard' }}
        activeTab="class"
        onTabChange={vi.fn()}
        {...defaultListProps}
      />,
    )
    expect(screen.getByText('Wizard')).toBeInTheDocument()
    expect(screen.getByText('d6')).toBeInTheDocument()
  })

  it('shows empty state when no background selected', () => {
    render(
      <DescriptionPanel draft={emptyDraft} activeTab="background" onTabChange={vi.fn()} {...defaultListProps} />,
    )
    expect(screen.getByText('Select a background to see details.')).toBeInTheDocument()
  })

  it('shows background name and benefits when selected', () => {
    render(
      <DescriptionPanel
        draft={{ ...emptyDraft, background: 'srd_acolyte' }}
        activeTab="background"
        onTabChange={vi.fn()}
        {...defaultListProps}
      />,
    )
    expect(screen.getByText('Acolyte')).toBeInTheDocument()
    expect(screen.getByText('Shelter')).toBeInTheDocument()
  })

  it('shows subclass loading skeleton when loadingSubclasses is true', () => {
    render(
      <DescriptionPanel
        draft={{ ...emptyDraft, class: 'srd_wizard', subclass: 'srd_evocation' }}
        activeTab="subclass"
        onTabChange={vi.fn()}
        {...defaultListProps}
        loadingSubclasses={true}
      />,
    )
    // Loading skeleton renders — no subclass text visible
    expect(screen.queryByText('School of Evocation')).not.toBeInTheDocument()
  })

  it('shows subclass name when loaded', () => {
    render(
      <DescriptionPanel
        draft={{ ...emptyDraft, subclass: 'srd_evocation' }}
        activeTab="subclass"
        onTabChange={vi.fn()}
        {...defaultListProps}
      />,
    )
    expect(screen.getByText('School of Evocation')).toBeInTheDocument()
  })

  it('does not show filter input on non-spells tabs', () => {
    render(
      <DescriptionPanel draft={{ ...emptyDraft, class: 'srd_wizard' }} activeTab="race" onTabChange={vi.fn()} {...defaultListProps} />,
    )
    expect(screen.queryByPlaceholderText('Filter spells…')).not.toBeInTheDocument()
  })

  it('shows filter input on spells tab', () => {
    render(
      <DescriptionPanel draft={{ ...emptyDraft, class: 'srd_wizard' }} activeTab="spells" onTabChange={vi.fn()} {...defaultListProps} />,
    )
    expect(screen.getByPlaceholderText('Filter spells…')).toBeInTheDocument()
  })

  it('shows filter input and spell count when spells are loaded', () => {
    mockUseSWR.mockImplementation((key) => {
      if (typeof key === 'string' && key.includes('/api/spells')) {
        return { data: spellData, isLoading: false, error: undefined } as ReturnType<typeof useSWR>
      }
      return { data: undefined, isLoading: false, error: undefined } as ReturnType<typeof useSWR>
    })

    render(
      <ControlledPanel
        draft={{ name: 'Test', race: '', class: 'srd_wizard', subclass: '', background: '', level: 1 }}
        initialTab="spells"
      />,
    )

    expect(screen.getByPlaceholderText('Filter spells…')).toBeInTheDocument()
    expect(screen.getByText('2 spells')).toBeInTheDocument()
    expect(screen.getByText('Fireball')).toBeInTheDocument()
    expect(screen.getByText('Magic Missile')).toBeInTheDocument()
  })

  it('filters spells by name and updates count', () => {
    mockUseSWR.mockImplementation((key) => {
      if (typeof key === 'string' && key.includes('/api/spells')) {
        return { data: spellData, isLoading: false, error: undefined } as ReturnType<typeof useSWR>
      }
      return { data: undefined, isLoading: false, error: undefined } as ReturnType<typeof useSWR>
    })

    render(
      <ControlledPanel
        draft={{ name: 'Test', race: '', class: 'srd_wizard', subclass: '', background: '', level: 1 }}
        initialTab="spells"
      />,
    )

    fireEvent.change(screen.getByPlaceholderText('Filter spells…'), { target: { value: 'fire' } })

    expect(screen.getByText('Fireball')).toBeInTheDocument()
    expect(screen.queryByText('Magic Missile')).not.toBeInTheDocument()
    expect(screen.getByText('1 of 2 spells')).toBeInTheDocument()
  })

  it('resets filter when class changes', () => {
    mockUseSWR.mockReturnValue({
      data: [
        { key: 'fireball', name: 'Fireball', level: 3, school: { name: 'Evocation', key: 'evocation' }, casting_time: '1 action', range_text: '150 feet', duration: 'Instantaneous', concentration: false, desc: 'A bright streak flashes.', verbal: true, somatic: true, material: false, ritual: false, classes: [] },
      ],
      isLoading: false,
      error: undefined,
    } as ReturnType<typeof useSWR>)

    const { rerender } = render(
      <ControlledPanel
        draft={{ name: 'Test', race: '', class: 'srd_wizard', subclass: '', background: '', level: 1 }}
        initialTab="spells"
      />,
    )

    fireEvent.change(screen.getByPlaceholderText('Filter spells…'), { target: { value: 'fire' } })
    expect(screen.getByPlaceholderText('Filter spells…')).toHaveValue('fire')

    rerender(
      <ControlledPanel
        draft={{ name: 'Test', race: '', class: 'srd_cleric', subclass: '', background: '', level: 1 }}
      />,
    )
    expect(screen.getByPlaceholderText('Filter spells…')).toHaveValue('')
  })
})
