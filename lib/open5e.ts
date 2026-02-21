const BASE_URL = 'https://api.open5e.com/v2'

async function open5eFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    next: { revalidate: 86400 }, // cache for 24 hours
  })
  if (!res.ok) throw new Error(`Open5e error: ${res.status}`)
  return res.json()
}

interface Open5eList<T> {
  results: T[]
}

export interface Race {
  key: string
  name: string
  desc: string
  is_subspecies: boolean
  subspecies_of?: string | null
  traits?: Array<{ name: string; desc: string; type?: string | null }>
}

export interface Class {
  key: string
  name: string
  desc: string
  hit_dice: string
  saving_throws?: Array<{ name: string; url: string }>
  subclass_of?: { name: string; key: string; url: string } | null
}

export interface Subclass {
  key: string
  name: string
  desc: string
  subclass_of: { name: string; key: string; url: string }
}

export interface Background {
  key: string
  name: string
  desc: string
  benefits?: Array<{ name: string; desc: string; type: string }>
}

export interface Spell {
  key: string
  name: string
  desc: string
  higher_level?: string
  range_text: string
  verbal: boolean
  somatic: boolean
  material: boolean
  ritual: boolean
  duration: string
  concentration: boolean
  casting_time: string
  level: number
  school: { name: string; key: string }
  classes: Array<{ name: string; key: string; url: string }>
}

export async function getRaces(): Promise<Race[]> {
  const data = await open5eFetch<Open5eList<Race>>('/species/?limit=100')
  return data.results.filter((r) => !r.is_subspecies)
}

export async function getRace(key: string): Promise<Race> {
  return open5eFetch<Race>(`/species/${key}/`)
}

export async function getClasses(): Promise<Class[]> {
  const data = await open5eFetch<Open5eList<Class>>('/classes/?limit=200')
  return data.results.filter((c) => !c.subclass_of)
}

export async function getClass(key: string): Promise<Class> {
  return open5eFetch<Class>(`/classes/${key}/`)
}

export async function getSubclassesByClass(classKey: string): Promise<Subclass[]> {
  const data = await open5eFetch<Open5eList<Class & { subclass_of?: { key: string } | null }>>(
    '/classes/?limit=200'
  )
  return data.results.filter(
    (c): c is Subclass & Class => !!c.subclass_of && c.subclass_of.key === classKey
  ) as unknown as Subclass[]
}

export async function getSubclass(key: string): Promise<Subclass> {
  return open5eFetch<Subclass>(`/classes/${key}/`)
}

export async function getBackgrounds(): Promise<Background[]> {
  const data = await open5eFetch<Open5eList<Background>>('/backgrounds/?limit=100')
  return data.results
}

export async function getBackground(key: string): Promise<Background> {
  return open5eFetch<Background>(`/backgrounds/${key}/`)
}

export async function getSpellsByClass(classKey: string, level?: number): Promise<Spell[]> {
  const levelFilter = level !== undefined ? `&level=${level}` : ''
  const data = await open5eFetch<Open5eList<Spell>>(
    `/spells/?limit=200&classes__key=${classKey}${levelFilter}`
  )
  return data.results
}
