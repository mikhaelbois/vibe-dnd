import type { Character } from '@/lib/types'
import { notFound } from 'next/navigation'
import { getBackgrounds, getClasses, getRaces } from '@/lib/open5e'
import { createClient } from '@/lib/supabase/server'
import { CharacterClient } from './client'

export default async function CharacterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [supabase, races, classes, backgrounds] = await Promise.all([
    createClient(),
    getRaces(),
    getClasses(),
    getBackgrounds(),
  ])

  const { data: character } = (await supabase
    .from('characters')
    .select('*')
    .eq('id', id)
    .single()) as { data: Character | null, error: unknown }

  if (!character)
    notFound()

  return (
    <CharacterClient
      character={character}
      races={races}
      classes={classes}
      backgrounds={backgrounds}
    />
  )
}
