'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function deleteCharacter(id: string) {
  const supabase = await createClient()
  await supabase.from('characters').delete().eq('id', id)
  revalidatePath('/characters')
}
