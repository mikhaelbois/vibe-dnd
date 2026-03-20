import type { Background, Class, Race, Subclass } from '@/lib/open5e'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { OptionsPanel } from './OptionsPanel'

const races: Race[] = [{ key: 'srd_elf', name: 'Elf', desc: '', is_subspecies: false }]
const classes: Class[] = [{ key: 'srd_wizard', name: 'Wizard', desc: '', hit_dice: 'd6' }]
const backgrounds: Background[] = [{ key: 'srd_acolyte', name: 'Acolyte', desc: '', benefits: [] }]
const subclasses: Subclass[] = [{ key: 'srd_evocation', name: 'Evocation', desc: '', subclass_of: { name: 'Wizard', key: 'srd_wizard', url: '' } }]

const defaultProps = {
  races,
  classes,
  backgrounds,
  subclasses: [] as Subclass[],
  loadingSubclasses: false,
  onDraftChange: vi.fn(),
  onSave: vi.fn(),
}

describe('optionsPanel', () => {
  it('shows subclass dropdown as disabled when no class is selected', () => {
    render(<OptionsPanel {...defaultProps} />)
    const trigger = screen.getByRole('combobox', { name: /subclass/i })
    expect(trigger).toBeDisabled()
  })

  it('shows subclass options when subclasses are provided', () => {
    render(<OptionsPanel {...defaultProps} initialDraft={{ class: 'srd_wizard' }} subclasses={subclasses} />)
    expect(screen.getByText('Evocation')).toBeInTheDocument()
  })

  it('shows Loading… placeholder when subclasses are loading', () => {
    render(<OptionsPanel {...defaultProps} initialDraft={{ class: 'srd_wizard' }} loadingSubclasses={true} />)
    expect(screen.getByText('Loading…')).toBeInTheDocument()
  })
})
