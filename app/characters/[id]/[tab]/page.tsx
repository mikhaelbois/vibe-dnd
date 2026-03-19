import { redirect } from 'next/navigation'

const VALID_TABS = ['race', 'class', 'subclass', 'background', 'spells'] as const

export default async function CharacterTabPage({ params }: { params: Promise<{ id: string, tab: string }> }) {
  const { id, tab } = await params

  if (!VALID_TABS.includes(tab as (typeof VALID_TABS)[number])) {
    redirect(`/characters/${id}/race`)
  }

  return null
}
