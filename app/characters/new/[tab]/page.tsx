import { redirect } from 'next/navigation'

const VALID_TABS = ['race', 'class', 'subclass', 'background', 'spells'] as const

export default async function NewCharacterTabPage({ params }: { params: Promise<{ tab: string }> }) {
  const { tab } = await params

  if (!VALID_TABS.includes(tab as (typeof VALID_TABS)[number])) {
    redirect('/characters/new/race')
  }

  return null
}
