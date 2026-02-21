'use client'

import { useState } from 'react'
import { OptionsPanel } from '@/components/character/OptionsPanel'
import { DescriptionPanel } from '@/components/character/DescriptionPanel'
import { saveNewCharacter } from './actions'
import { toast } from 'sonner'
import type { CharacterDraft } from '@/lib/types'
import type { Race, Class, Background } from '@/lib/open5e'

interface NewCharacterClientProps {
  races: Race[]
  classes: Class[]
  backgrounds: Background[]
}

export function NewCharacterClient({ races, classes, backgrounds }: NewCharacterClientProps) {
  const [draft, setDraft] = useState<CharacterDraft>({
    name: '', race: '', class: '', subclass: '', background: '', level: 1,
  })
  const [saving, setSaving] = useState(false)

  async function handleSave(d: CharacterDraft) {
    setSaving(true)
    const result = await saveNewCharacter(d)
    if (result?.error) {
      toast.error(result.error)
      setSaving(false)
    }
    // On success, server action redirects — no need to setSaving(false)
  }

  return (
    <div className="flex h-[calc(100vh-57px)] overflow-hidden">
      <OptionsPanel
        races={races}
        classes={classes}
        backgrounds={backgrounds}
        onDraftChange={setDraft}
        onSave={handleSave}
        saving={saving}
      />
      <DescriptionPanel draft={draft} />
    </div>
  )
}
