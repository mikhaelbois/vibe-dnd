import type { Background } from '@/lib/open5e'
import { DescSection, EmptyState } from './tab-shared'

interface BackgroundTabContentProps {
  hasBackground: boolean
  background: Background | undefined
}

export function BackgroundTabContent({ hasBackground, background }: BackgroundTabContentProps) {
  return (
    <>
      {!hasBackground && <EmptyState message="Select a background to see details." />}
      {background && (
        <>
          <h2 className="text-lg font-bold mb-3">{background.name}</h2>
          <DescSection label="Description" value={background.desc} />
          {background.benefits?.map(b => (
            <DescSection key={b.name} label={b.name} value={b.desc} />
          ))}
        </>
      )}
    </>
  )
}
