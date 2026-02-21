import { getSubclassesByClass } from '@/lib/open5e'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const classKey = searchParams.get('class')
  if (!classKey) return NextResponse.json([])
  try {
    const subclasses = await getSubclassesByClass(classKey)
    return NextResponse.json(subclasses)
  } catch {
    return NextResponse.json([])
  }
}
