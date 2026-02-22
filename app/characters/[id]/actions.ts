'use server'

import type { CharacterDraft } from '@/lib/types'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function updateCharacter(id: string, draft: CharacterDraft) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('characters')
    .update({
      name: draft.name,
      race: draft.race || null,
      class: draft.class || null,
      subclass: draft.subclass || null,
      background: draft.background || null,
      level: draft.level,
    })
    .eq('id', id)

  if (error)
    return { error: error.message }
  revalidatePath(`/characters/${id}`)
  return { success: true }
}
