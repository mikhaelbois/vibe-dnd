import type { Character } from '@/lib/types'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'
import { deleteCharacter } from './actions'

export default async function CharactersPage() {
  const supabase = await createClient()
  const { data: characters } = await supabase
    .from('characters')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Your characters</h1>
        <Button asChild>
          <Link href="/characters/new">New character</Link>
        </Button>
      </div>

      {characters?.length === 0 && (
        <p className="text-slate-400 text-center py-12">
          No characters yet.
          {' '}
          <Link href="/characters/new" className="underline text-slate-200">Create one.</Link>
        </p>
      )}

      <div className="grid gap-3">
        {(characters as Character[])?.map(c => (
          <Card key={c.id} className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <CardTitle className="text-slate-100">
                  <Link href={`/characters/${c.id}`} className="hover:underline">
                    {c.name}
                  </Link>
                </CardTitle>
                <form action={deleteCharacter.bind(null, c.id)}>
                  <Button variant="ghost" size="sm" className="text-slate-500 hover:text-red-400" type="submit">
                    Delete
                  </Button>
                </form>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-400 capitalize">
                Level
                {' '}
                {c.level}
                {' '}
                {c.class ?? '—'}
                {' '}
                ·
                {' '}
                {c.race ?? '—'}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
