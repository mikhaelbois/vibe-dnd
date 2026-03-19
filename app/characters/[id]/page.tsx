import { redirect } from 'next/navigation'

export default async function CharacterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(`/characters/${id}/race`)
}
