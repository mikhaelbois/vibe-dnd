'use server'

import type { CharacterDraft } from '@/lib/types'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function saveNewCharacter(draft: CharacterDraft) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user)
    return { error: 'Not authenticated' }

  const { data, error } = await supabase
    .from('characters')
    .insert({
      user_id: user.id,
      name: draft.name,
      race: draft.race || null,
      class: draft.class || null,
      subclass: draft.subclass || null,
      background: draft.background || null,
      level: draft.level,
    })
    .select('id')
    .single()

  if (error)
    return { error: error.message }
  redirect(`/characters/${data.id}`)
}
