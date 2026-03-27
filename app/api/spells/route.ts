import { NextResponse } from 'next/server'
import { getSpellsByClass } from '@/lib/open5e'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const classKey = searchParams.get('class')
  if (!classKey)
    return NextResponse.json([])
  try {
    const spells = await getSpellsByClass(classKey)
    return NextResponse.json(spells)
  }
  catch {
    return NextResponse.json([])
  }
}
