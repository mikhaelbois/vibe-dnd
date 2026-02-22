import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getRaces, getSubclassesByClass } from './open5e'

const mockFetch = vi.fn()
globalThis.fetch = mockFetch

beforeEach(() => {
  mockFetch.mockClear()
})

describe('getRaces', () => {
  it('returns non-subspecies with key and name', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [
          { key: 'srd_elf', name: 'Elf', desc: 'An elf.', is_subspecies: false },
          { key: 'srd_human', name: 'Human', desc: 'A human.', is_subspecies: false },
          { key: 'open5e_high-elf', name: 'High Elf', desc: 'A high elf.', is_subspecies: true },
        ],
      }),
    })

    const races = await getRaces()
    expect(races).toHaveLength(2)
    expect(races[0]).toMatchObject({ key: 'srd_elf', name: 'Elf' })
  })

  it('throws when the API returns a non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 })
    await expect(getRaces()).rejects.toThrow('Open5e error: 500')
  })
})

describe('getSubclassesByClass', () => {
  it('filters subclasses by parent class key', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [
          { key: 'srd_wizard', name: 'Wizard', desc: '...', subclass_of: null },
          { key: 'open5e_evocation', name: 'School of Evocation', desc: '...', subclass_of: { key: 'srd_wizard', name: 'Wizard', url: '' } },
          { key: 'open5e_illusion', name: 'School of Illusion', desc: '...', subclass_of: { key: 'srd_wizard', name: 'Wizard', url: '' } },
          { key: 'open5e_berserker', name: 'Berserker', desc: '...', subclass_of: { key: 'srd_barbarian', name: 'Barbarian', url: '' } },
        ],
      }),
    })

    const subclasses = await getSubclassesByClass('srd_wizard')
    expect(subclasses).toHaveLength(2)
    expect(subclasses[0].key).toBe('open5e_evocation')
  })
})
