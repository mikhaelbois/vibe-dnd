import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getRaces, getClasses, getSubclassesByClass, getBackgrounds, getSpellsByClass } from './open5e'

const mockFetch = vi.fn()
global.fetch = mockFetch

beforeEach(() => {
  mockFetch.mockClear()
})

describe('getRaces', () => {
  it('returns a list of races with slug and name', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [
          { slug: 'elf', name: 'Elf', desc: 'An elf.' },
          { slug: 'human', name: 'Human', desc: 'A human.' },
        ],
      }),
    })

    const races = await getRaces()
    expect(races).toHaveLength(2)
    expect(races[0]).toMatchObject({ slug: 'elf', name: 'Elf' })
  })

  it('throws when the API returns a non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 })
    await expect(getRaces()).rejects.toThrow('Open5e error: 500')
  })
})

describe('getSubclassesByClass', () => {
  it('filters subclasses by class slug', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [
          { slug: 'school-of-evocation', name: 'School of Evocation', desc: '...', class: { slug: 'wizard' } },
          { slug: 'school-of-illusion', name: 'School of Illusion', desc: '...', class: { slug: 'wizard' } },
        ],
      }),
    })

    const subclasses = await getSubclassesByClass('wizard')
    expect(subclasses).toHaveLength(2)
    expect(subclasses[0].slug).toBe('school-of-evocation')
  })
})
