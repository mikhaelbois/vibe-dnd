import type { SWRResponse } from 'swr'
import type { Subclass } from '@/lib/open5e'
import { DescSection, EmptyState, ErrorState, LoadingSkeleton } from './tab-shared'

interface SubclassTabContentProps {
  hasSubclass: boolean
  subclass: SWRResponse<Subclass>
}

export function SubclassTabContent({ hasSubclass, subclass }: SubclassTabContentProps) {
  return (
    <>
      {!hasSubclass && <EmptyState message="Select a subclass to see details." />}
      {subclass.isLoading && <LoadingSkeleton />}
      {subclass.error && <ErrorState />}
      {subclass.data && (
        <>
          <h2 className="text-lg font-bold mb-3">{subclass.data.name}</h2>
          <DescSection label="Description" value={subclass.data.desc} />
        </>
      )}
    </>
  )
}
