import type { SWRResponse } from 'swr'
import type { Spell } from '@/lib/open5e'
import { EmptyState, ErrorState, LoadingSkeleton } from './tab-shared'

interface SpellsTabContentProps {
  hasClass: boolean
  spells: SWRResponse<{ results: Spell[] }>
  spellFilter: string
}

export function SpellsTabContent({ hasClass, spells, spellFilter }: SpellsTabContentProps) {
  const filteredSpells = spells.data
    ? spells.data.results.filter(s =>
        s.name.toLowerCase().includes(spellFilter.toLowerCase()),
      )
    : []

  return (
    <>
      {!hasClass && <EmptyState message="Select a class to see spells." />}
      {spells.isLoading && <LoadingSkeleton />}
      {spells.error && <ErrorState />}
      {spells.data && (
        <div className="space-y-4">
          <p className="text-sm text-slate-400">
            {spellFilter
              ? `${filteredSpells.length} of ${spells.data.results.length} spells`
              : `${spells.data.results.length} spells`}
          </p>
          {filteredSpells.map(spell => (
            <div key={spell.key} className="border-b border-slate-800 pb-3">
              <div className="flex items-baseline justify-between mb-1">
                <h3 className="font-semibold text-slate-200">{spell.name}</h3>
                <span className="text-xs text-slate-500">
                  {spell.level === 0 ? 'Cantrip' : `Level ${spell.level}`}
                  {' '}
                  ·
                  {spell.school.name}
                </span>
              </div>
              <p className="text-xs text-slate-500 mb-1">
                {spell.casting_time}
                {' '}
                ·
                {spell.range_text}
                {' '}
                ·
                {spell.duration}
                {spell.concentration ? ' · Concentration' : ''}
              </p>
              <p className="text-sm text-slate-400 line-clamp-3">{spell.desc}</p>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
