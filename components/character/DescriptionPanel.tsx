'use client'

import type { Background, Class, Race, Spell, Subclass } from '@/lib/open5e'
import type { CharacterDraft } from '@/lib/types'
import { useState } from 'react'
import useSWR from 'swr'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BackgroundTabContent } from './BackgroundTabContent'
import { ClassTabContent } from './ClassTabContent'
import { RaceTabContent } from './RaceTabContent'
import { SpellsTabContent } from './SpellsTabContent'
import { SubclassTabContent } from './SubclassTabContent'
import { API } from './tab-shared'

interface DescriptionPanelProps {
  draft: CharacterDraft
  activeTab: string
  onTabChange: (tab: string) => void
}

export function DescriptionPanel({ draft, activeTab, onTabChange }: DescriptionPanelProps) {
  const [spellFilter, setSpellFilter] = useState('')
  const [prevClass, setPrevClass] = useState(draft.class)
  if (draft.class !== prevClass) {
    setPrevClass(draft.class)
    setSpellFilter('')
  }

  const race = useSWR<Race>(draft.race ? `${API}/species/${draft.race}/` : null)
  const cls = useSWR<Class>(draft.class ? `${API}/classes/${draft.class}/` : null)
  const subclass = useSWR<Subclass>(draft.subclass ? `${API}/classes/${draft.subclass}/` : null)
  const background = useSWR<Background>(draft.background ? `${API}/backgrounds/${draft.background}/` : null)
  const spells = useSWR<{ results: Spell[] }>(
    draft.class ? `${API}/spells/?limit=200&classes__key=${draft.class}` : null,
  )

  return (
    <div className="flex-1 overflow-auto">
      <Tabs value={activeTab} onValueChange={onTabChange} className="h-full flex flex-col">
        <TabsList className="mx-4 mt-4 bg-slate-800">
          <TabsTrigger value="race">Race</TabsTrigger>
          <TabsTrigger value="class">Class</TabsTrigger>
          <TabsTrigger value="subclass">Subclass</TabsTrigger>
          <TabsTrigger value="background">Background</TabsTrigger>
          <TabsTrigger value="spells">Spells</TabsTrigger>
        </TabsList>

        {activeTab === 'spells' && (
          <div className="px-4 pt-3">
            <Input
              placeholder="Filter spells…"
              value={spellFilter}
              onChange={e => setSpellFilter(e.target.value)}
              className="bg-slate-800 border-slate-700"
            />
          </div>
        )}

        <div className="flex-1 overflow-auto p-4">
          <TabsContent value="race">
            <RaceTabContent hasRace={!!draft.race} race={race} />
          </TabsContent>
          <TabsContent value="class">
            <ClassTabContent hasClass={!!draft.class} cls={cls} />
          </TabsContent>
          <TabsContent value="subclass">
            <SubclassTabContent hasSubclass={!!draft.subclass} subclass={subclass} />
          </TabsContent>
          <TabsContent value="background">
            <BackgroundTabContent hasBackground={!!draft.background} background={background} />
          </TabsContent>
          <TabsContent value="spells" forceMount>
            <SpellsTabContent hasClass={!!draft.class} spells={spells} spellFilter={spellFilter} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
