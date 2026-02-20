'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function deleteCharacter(id: string) {
  const supabase = await createClient()
  await supabase.from('characters').delete().eq('id', id)
  revalidatePath('/characters')
}
