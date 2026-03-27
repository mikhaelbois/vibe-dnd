'use client'

import type { Background, Class, Race, Subclass } from '@/lib/open5e'
import type { CharacterDraft } from '@/lib/types'
import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import useSWR from 'swr'
import { DescriptionPanel } from '@/components/character/DescriptionPanel'
import { OptionsPanel } from '@/components/character/OptionsPanel'
import { saveNewCharacter } from './actions'

interface NewCharacterClientProps {
  races: Race[]
  classes: Class[]
  backgrounds: Background[]
}

export function NewCharacterClient({ races, classes, backgrounds }: NewCharacterClientProps) {
  const params = useParams()
  const router = useRouter()
  const activeTab = (params.tab as string) ?? 'race'

  function handleTabChange(tab: string) {
    router.push(`/characters/new/${tab}`)
  }

  const [draft, setDraft] = useState<CharacterDraft>({
    name: '',
    race: '',
    class: '',
    subclass: '',
    background: '',
    level: 1,
  })
  const [saving, setSaving] = useState(false)

  const { data: subclasses = [], isLoading: loadingSubclasses } = useSWR<Subclass[]>(
    draft.class ? `/api/subclasses?class=${draft.class}` : null,
  )

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
        subclasses={subclasses}
        loadingSubclasses={loadingSubclasses}
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
