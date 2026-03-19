import type { SWRResponse } from 'swr'
import type { Class } from '@/lib/open5e'
import { DescSection, EmptyState, ErrorState, LoadingSkeleton } from './tab-shared'

interface ClassTabContentProps {
  hasClass: boolean
  cls: SWRResponse<Class>
}

export function ClassTabContent({ hasClass, cls }: ClassTabContentProps) {
  return (
    <>
      {!hasClass && <EmptyState message="Select a class to see details." />}
      {cls.isLoading && <LoadingSkeleton />}
      {cls.error && <ErrorState />}
      {cls.data && (
        <>
          <h2 className="text-lg font-bold mb-3">{cls.data.name}</h2>
          <DescSection label="Description" value={cls.data.desc} />
          <DescSection label="Hit Die" value={cls.data.hit_dice} />
          <DescSection
            label="Saving Throws"
            value={cls.data.saving_throws?.map(s => s.name).join(', ')}
          />
        </>
      )}
    </>
  )
}
