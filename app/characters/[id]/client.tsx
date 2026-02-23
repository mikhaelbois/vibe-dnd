'use client'

import type { Background, Class, Race } from '@/lib/open5e'
import type { Character, CharacterDraft } from '@/lib/types'
import { useState } from 'react'
import { toast } from 'sonner'
import { DescriptionPanel } from '@/components/character/DescriptionPanel'
import { OptionsPanel } from '@/components/character/OptionsPanel'
import { updateCharacter } from './actions'

interface CharacterClientProps {
  character: Character
  races: Race[]
  classes: Class[]
  backgrounds: Background[]
}

export function CharacterClient({ character, races, classes, backgrounds }: CharacterClientProps) {
  const [draft, setDraft] = useState<CharacterDraft>({
    name: character.name,
    race: character.race ?? '',
    class: character.class ?? '',
    subclass: character.subclass ?? '',
    background: character.background ?? '',
    level: character.level ?? 1,
  })
  const [saving, setSaving] = useState(false)

  async function handleSave(d: CharacterDraft) {
    setSaving(true)
    const result = await updateCharacter(character.id, d)
    if (result?.error) {
      toast.error(result.error)
    }
    else {
      toast.success('Character saved.')
    }
    setSaving(false)
  }

  return (
    <div className="flex h-[calc(100vh-57px)] overflow-hidden">
      <OptionsPanel
        races={races}
        classes={classes}
        backgrounds={backgrounds}
        initialDraft={draft}
        onDraftChange={setDraft}
        onSave={handleSave}
        saving={saving}
      />
      <DescriptionPanel draft={draft} />
    </div>
  )
}
