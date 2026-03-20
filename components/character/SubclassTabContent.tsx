import type { Subclass } from '@/lib/open5e'
import { DescSection, EmptyState, LoadingSkeleton } from './tab-shared'

interface SubclassTabContentProps {
  hasSubclass: boolean
  subclass: Subclass | undefined
  loadingSubclasses: boolean
}

export function SubclassTabContent({ hasSubclass, subclass, loadingSubclasses }: SubclassTabContentProps) {
  if (loadingSubclasses)
    return <LoadingSkeleton />
  if (!hasSubclass)
    return <EmptyState message="Select a subclass to see details." />
  if (!subclass)
    return <EmptyState message="Select a subclass to see details." />
  return (
    <>
      <h2 className="text-lg font-bold mb-3">{subclass.name}</h2>
      <DescSection label="Description" value={subclass.desc} />
    </>
  )
}
