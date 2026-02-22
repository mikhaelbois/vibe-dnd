'use client'

import { SWRConfig } from 'swr'

async function fetcher(url: string): Promise<unknown> {
  return fetch(url).then(async (r) => {
    if (!r.ok)
      throw new Error(`Fetch error: ${r.status}`)
    return r.json() as Promise<unknown>
  })
}

export function Providers({ children }: { children: React.ReactNode }) {
  return <SWRConfig value={{ fetcher }}>{children}</SWRConfig>
}
