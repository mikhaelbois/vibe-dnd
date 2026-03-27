'use client'

import type { Background, Class, Race, Subclass } from '@/lib/open5e'
import type { Character, CharacterDraft } from '@/lib/types'
import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import useSWR from 'swr'
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
  const params = useParams()
  const router = useRouter()
  const activeTab = (params.tab as string) ?? 'race'
  const id = params.id as string

  function handleTabChange(tab: string) {
    router.push(`/characters/${id}/${tab}`)
  }

  const [draft, setDraft] = useState<CharacterDraft>({
    name: character.name,
    race: character.race ?? '',
    class: character.class ?? '',
    subclass: character.subclass ?? '',
    background: character.background ?? '',
    level: character.level ?? 1,
  })
  const [saving, setSaving] = useState(false)

  const { data: subclasses = [], isLoading: loadingSubclasses } = useSWR<Subclass[]>(
    draft.class ? `/api/subclasses?class=${draft.class}` : null,
  )

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
        subclasses={subclasses}
        loadingSubclasses={loadingSubclasses}
        initialDraft={draft}
        onDraftChange={setDraft}
        onSave={handleSave}
        saving={saving}
      />
      <DescriptionPanel
        draft={draft}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        races={races}
        classes={classes}
        backgrounds={backgrounds}
        subclasses={subclasses}
        loadingSubclasses={loadingSubclasses}
      />
    </div>
  )
}
