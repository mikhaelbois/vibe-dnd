const BASE_URL = 'https://api.open5e.com/v1'

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
  slug: string
  name: string
  desc: string
  asi_desc?: string
  age?: string
  size?: string
  speed?: Record<string, number>
  languages?: string
  vision?: string
  traits?: string
}

export interface Class {
  slug: string
  name: string
  desc: string
  hit_die: number
  prof_armor?: string
  prof_weapons?: string
  prof_tools?: string
  prof_saving_throws?: string
  prof_skills?: string
  spellcasting_ability?: string
}

export interface Subclass {
  slug: string
  name: string
  desc: string
  class: { slug: string; name: string }
}

export interface Background {
  slug: string
  name: string
  desc: string
  skill_proficiencies?: string
  tool_proficiencies?: string
  languages?: string
  equipment?: string
  feature?: string
  feature_desc?: string
}

export interface Spell {
  slug: string
  name: string
  desc: string
  higher_level?: string
  range: string
  components: string
  material?: string
  ritual: boolean
  duration: string
  concentration: boolean
  casting_time: string
  level: string
  level_int: number
  school: string
  dnd_class: string
}

export async function getRaces(): Promise<Race[]> {
  const data = await open5eFetch<Open5eList<Race>>('/races/?limit=100')
  return data.results
}

export async function getRace(slug: string): Promise<Race> {
  return open5eFetch<Race>(`/races/${slug}/`)
}

export async function getClasses(): Promise<Class[]> {
  const data = await open5eFetch<Open5eList<Class>>('/classes/?limit=100')
  return data.results
}

export async function getClass(slug: string): Promise<Class> {
  return open5eFetch<Class>(`/classes/${slug}/`)
}

export async function getSubclassesByClass(classSlug: string): Promise<Subclass[]> {
  const data = await open5eFetch<Open5eList<Subclass>>(
    `/subclasses/?limit=100&class=${classSlug}`
  )
  return data.results
}

export async function getSubclass(slug: string): Promise<Subclass> {
  return open5eFetch<Subclass>(`/subclasses/${slug}/`)
}

export async function getBackgrounds(): Promise<Background[]> {
  const data = await open5eFetch<Open5eList<Background>>('/backgrounds/?limit=100')
  return data.results
}

export async function getBackground(slug: string): Promise<Background> {
  return open5eFetch<Background>(`/backgrounds/${slug}/`)
}

export async function getSpellsByClass(classSlug: string, levelInt?: number): Promise<Spell[]> {
  const levelFilter = levelInt !== undefined ? `&level_int=${levelInt}` : ''
  const data = await open5eFetch<Open5eList<Spell>>(
    `/spells/?limit=200&dnd_class=${classSlug}${levelFilter}`
  )
  return data.results
}
