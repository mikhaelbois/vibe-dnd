import type { Class } from '@/lib/open5e'
import { DescSection, EmptyState } from './tab-shared'

interface ClassTabContentProps {
  hasClass: boolean
  cls: Class | undefined
}

export function ClassTabContent({ hasClass, cls }: ClassTabContentProps) {
  return (
    <>
      {!hasClass && <EmptyState message="Select a class to see details." />}
      {cls && (
        <>
          <h2 className="text-lg font-bold mb-3">{cls.name}</h2>
          <DescSection label="Description" value={cls.desc} />
          <DescSection label="Hit Die" value={cls.hit_dice} />
          <DescSection
            label="Saving Throws"
            value={cls.saving_throws?.map(s => s.name).join(', ')}
          />
        </>
      )}
    </>
  )
}
