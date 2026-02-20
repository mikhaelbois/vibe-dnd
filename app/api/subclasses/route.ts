import { getSubclassesByClass } from '@/lib/open5e'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const classSlug = searchParams.get('class')
  if (!classSlug) return NextResponse.json([])
  const subclasses = await getSubclassesByClass(classSlug)
  return NextResponse.json(subclasses)
}
