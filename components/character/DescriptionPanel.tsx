'use client'

import { useEffect, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import type { Race, Class, Subclass, Background, Spell } from '@/lib/open5e'
import type { CharacterDraft } from '@/lib/types'

interface DescriptionPanelProps {
  draft: CharacterDraft
}

function useOpen5eData<T>(url: string | null) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!url) { setData(null); return }
    setLoading(true)
    setError(false)
    fetch(url)
      .then((r) => { if (!r.ok) throw new Error(); return r.json() })
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [url])

  return { data, loading, error }
}

function DescSection({ label, value }: { label: string; value?: string }) {
  if (!value) return null
  return (
    <div className="mb-4">
      <h3 className="text-sm font-semibold text-slate-300 mb-1">{label}</h3>
      <p className="text-sm text-slate-400 whitespace-pre-line">{value}</p>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3 p-4">
      <Skeleton className="h-5 w-1/3 bg-slate-800" />
      <Skeleton className="h-4 w-full bg-slate-800" />
      <Skeleton className="h-4 w-5/6 bg-slate-800" />
      <Skeleton className="h-4 w-4/6 bg-slate-800" />
    </div>
  )
}

function ErrorState() {
  return <p className="text-sm text-slate-500 p-4">Could not load content.</p>
}

function EmptyState({ message }: { message: string }) {
  return <p className="text-sm text-slate-500 p-4">{message}</p>
}

const API = 'https://api.open5e.com/v2'

export function DescriptionPanel({ draft }: DescriptionPanelProps) {
  const race = useOpen5eData<Race>(draft.race ? `${API}/species/${draft.race}/` : null)
  const cls = useOpen5eData<Class>(draft.class ? `${API}/classes/${draft.class}/` : null)
  const subclass = useOpen5eData<Subclass>(draft.subclass ? `${API}/classes/${draft.subclass}/` : null)
  const background = useOpen5eData<Background>(draft.background ? `${API}/backgrounds/${draft.background}/` : null)
  const spells = useOpen5eData<{ results: Spell[] }>(
    draft.class ? `${API}/spells/?limit=200&classes__key=${draft.class}` : null
  )

  return (
    <div className="flex-1 overflow-auto">
      <Tabs defaultValue="race" className="h-full flex flex-col">
        <TabsList className="mx-4 mt-4 bg-slate-800">
          <TabsTrigger value="race">Race</TabsTrigger>
          <TabsTrigger value="class">Class</TabsTrigger>
          <TabsTrigger value="subclass">Subclass</TabsTrigger>
          <TabsTrigger value="background">Background</TabsTrigger>
          <TabsTrigger value="spells">Spells</TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-auto p-4">
          <TabsContent value="race">
            {!draft.race && <EmptyState message="Select a race to see details." />}
            {race.loading && <LoadingSkeleton />}
            {race.error && <ErrorState />}
            {race.data && (
              <>
                <h2 className="text-lg font-bold mb-3">{race.data.name}</h2>
                <DescSection label="Description" value={race.data.desc} />
                {race.data.traits?.map((t) => (
                  <DescSection key={t.name} label={t.name} value={t.desc} />
                ))}
              </>
            )}
          </TabsContent>

          <TabsContent value="class">
            {!draft.class && <EmptyState message="Select a class to see details." />}
            {cls.loading && <LoadingSkeleton />}
            {cls.error && <ErrorState />}
            {cls.data && (
              <>
                <h2 className="text-lg font-bold mb-3">{cls.data.name}</h2>
                <DescSection label="Description" value={cls.data.desc} />
                <DescSection label="Hit Die" value={cls.data.hit_dice} />
                <DescSection
                  label="Saving Throws"
                  value={cls.data.saving_throws?.map((s) => s.name).join(', ')}
                />
              </>
            )}
          </TabsContent>

          <TabsContent value="subclass">
            {!draft.subclass && <EmptyState message="Select a subclass to see details." />}
            {subclass.loading && <LoadingSkeleton />}
            {subclass.error && <ErrorState />}
            {subclass.data && (
              <>
                <h2 className="text-lg font-bold mb-3">{subclass.data.name}</h2>
                <DescSection label="Description" value={subclass.data.desc} />
              </>
            )}
          </TabsContent>

          <TabsContent value="background">
            {!draft.background && <EmptyState message="Select a background to see details." />}
            {background.loading && <LoadingSkeleton />}
            {background.error && <ErrorState />}
            {background.data && (
              <>
                <h2 className="text-lg font-bold mb-3">{background.data.name}</h2>
                <DescSection label="Description" value={background.data.desc} />
                {background.data.benefits?.map((b) => (
                  <DescSection key={b.name} label={b.name} value={b.desc} />
                ))}
              </>
            )}
          </TabsContent>

          <TabsContent value="spells">
            {!draft.class && <EmptyState message="Select a class to see spells." />}
            {spells.loading && <LoadingSkeleton />}
            {spells.error && <ErrorState />}
            {spells.data && (
              <div className="space-y-4">
                <p className="text-sm text-slate-400">{spells.data.results.length} spells</p>
                {spells.data.results.map((spell) => (
                  <div key={spell.key} className="border-b border-slate-800 pb-3">
                    <div className="flex items-baseline justify-between mb-1">
                      <h3 className="font-semibold text-slate-200">{spell.name}</h3>
                      <span className="text-xs text-slate-500">
                        {spell.level === 0 ? 'Cantrip' : `Level ${spell.level}`} · {spell.school.name}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mb-1">
                      {spell.casting_time} · {spell.range_text} · {spell.duration}
                      {spell.concentration ? ' · Concentration' : ''}
                    </p>
                    <p className="text-sm text-slate-400 line-clamp-3">{spell.desc}</p>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
