import { createClient } from '@/lib/supabase/server'
import { getRaces, getClasses, getBackgrounds } from '@/lib/open5e'
import { notFound } from 'next/navigation'
import { CharacterClient } from './client'
import type { Character } from '@/lib/types'

export default async function CharacterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [supabase, races, classes, backgrounds] = await Promise.all([
    createClient(),
    getRaces(),
    getClasses(),
    getBackgrounds(),
  ])

  const { data: character } = await supabase
    .from('characters')
    .select('*')
    .eq('id', id)
    .single()

  if (!character) notFound()

  return (
    <CharacterClient
      character={character as Character}
      races={races}
      classes={classes}
      backgrounds={backgrounds}
    />
  )
}
