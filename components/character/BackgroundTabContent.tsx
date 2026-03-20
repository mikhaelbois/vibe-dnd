import type { SWRResponse } from 'swr'
import type { Background } from '@/lib/open5e'
import { DescSection, EmptyState, ErrorState, LoadingSkeleton } from './tab-shared'

interface BackgroundTabContentProps {
  hasBackground: boolean
  background: SWRResponse<Background>
}

export function BackgroundTabContent({ hasBackground, background }: BackgroundTabContentProps) {
  return (
    <>
      {!hasBackground && <EmptyState message="Select a background to see details." />}
      {background.isLoading && <LoadingSkeleton />}
      {background.error && <ErrorState />}
      {background.data && (
        <>
          <h2 className="text-lg font-bold mb-3">{background.data.name}</h2>
          <DescSection label="Description" value={background.data.desc} />
          {background.data.benefits?.map(b => (
            <DescSection key={b.name} label={b.name} value={b.desc} />
          ))}
        </>
      )}
    </>
  )
}
