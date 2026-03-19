import type { SWRResponse } from 'swr'
import type { Race } from '@/lib/open5e'
import { DescSection, EmptyState, ErrorState, LoadingSkeleton } from './tab-shared'

interface RaceTabContentProps {
  hasRace: boolean
  race: SWRResponse<Race>
}

export function RaceTabContent({ hasRace, race }: RaceTabContentProps) {
  return (
    <>
      {!hasRace && <EmptyState message="Select a race to see details." />}
      {race.isLoading && <LoadingSkeleton />}
      {race.error && <ErrorState />}
      {race.data && (
        <>
          <h2 className="text-lg font-bold mb-3">{race.data.name}</h2>
          <DescSection label="Description" value={race.data.desc} />
          {race.data.traits?.map(t => (
            <DescSection key={t.name} label={t.name} value={t.desc} />
          ))}
        </>
      )}
    </>
  )
}
