import type { Race } from '@/lib/open5e'
import { DescSection, EmptyState } from './tab-shared'

interface RaceTabContentProps {
  hasRace: boolean
  race: Race | undefined
}

export function RaceTabContent({ hasRace, race }: RaceTabContentProps) {
  return (
    <>
      {!hasRace && <EmptyState message="Select a race to see details." />}
      {race && (
        <>
          <h2 className="text-lg font-bold mb-3">{race.name}</h2>
          <DescSection label="Description" value={race.desc} />
          {race.traits?.map(t => (
            <DescSection key={t.name} label={t.name} value={t.desc} />
          ))}
        </>
      )}
    </>
  )
}
