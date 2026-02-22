'use client'

import type { Background, Class, Race, Subclass } from '@/lib/open5e'
import type { CharacterDraft } from '@/lib/types'
import { useState } from 'react'
import useSWR from 'swr'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface OptionsPanelProps {
  races: Race[]
  classes: Class[]
  backgrounds: Background[]
  initialDraft?: Partial<CharacterDraft>
  onDraftChange: (draft: CharacterDraft) => void
  onSave: (draft: CharacterDraft) => Promise<void>
  saving?: boolean
}

const LEVELS = Array.from({ length: 20 }, (_, i) => i + 1)

export function OptionsPanel({
  races,
  classes,
  backgrounds,
  initialDraft,
  onDraftChange,
  onSave,
  saving,
}: OptionsPanelProps) {
  const [draft, setDraft] = useState<CharacterDraft>({
    name: initialDraft?.name ?? '',
    race: initialDraft?.race ?? '',
    class: initialDraft?.class ?? '',
    subclass: initialDraft?.subclass ?? '',
    background: initialDraft?.background ?? '',
    level: initialDraft?.level ?? 1,
  })
  const { data: subclasses = [], isLoading: loadingSubclasses } = useSWR<Subclass[]>(
    draft.class ? `/api/subclasses?class=${draft.class}` : null,
  )

  function update(field: keyof CharacterDraft, value: string | number) {
    const next = { ...draft, [field]: value }
    if (field === 'class')
      next.subclass = '' // reset subclass on class change
    setDraft(next)
    onDraftChange(next)
  }

  return (
    <div className="flex flex-col gap-5 p-6 border-r border-slate-800 min-w-[260px] max-w-[300px]">
      <h2 className="font-semibold text-slate-200">Character</h2>

      <div className="space-y-1.5">
        <Label className="text-slate-400 text-xs uppercase tracking-wide">Name</Label>
        <Input
          value={draft.name}
          onChange={e => update('name', e.target.value)}
          placeholder="Character name"
          className="bg-slate-800 border-slate-700"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-slate-400 text-xs uppercase tracking-wide">Race</Label>
        <Select value={draft.race} onValueChange={v => update('race', v)}>
          <SelectTrigger className="bg-slate-800 border-slate-700">
            <SelectValue placeholder="Select race" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            {races.map(r => (
              <SelectItem key={r.key} value={r.key}>{r.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-slate-400 text-xs uppercase tracking-wide">Class</Label>
        <Select value={draft.class} onValueChange={v => update('class', v)}>
          <SelectTrigger className="bg-slate-800 border-slate-700">
            <SelectValue placeholder="Select class" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            {classes.map(c => (
              <SelectItem key={c.key} value={c.key}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-slate-400 text-xs uppercase tracking-wide">Subclass</Label>
        <Select
          value={draft.subclass}
          onValueChange={v => update('subclass', v)}
          disabled={!draft.class || loadingSubclasses}
        >
          <SelectTrigger className="bg-slate-800 border-slate-700">
            <SelectValue placeholder={loadingSubclasses ? 'Loading…' : 'Select subclass'} />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            {subclasses.map(s => (
              <SelectItem key={s.key} value={s.key}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-slate-400 text-xs uppercase tracking-wide">Background</Label>
        <Select value={draft.background} onValueChange={v => update('background', v)}>
          <SelectTrigger className="bg-slate-800 border-slate-700">
            <SelectValue placeholder="Select background" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            {backgrounds.map(b => (
              <SelectItem key={b.key} value={b.key}>{b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-slate-400 text-xs uppercase tracking-wide">Level</Label>
        <Select
          value={String(draft.level)}
          onValueChange={v => update('level', Number.parseInt(v))}
        >
          <SelectTrigger className="bg-slate-800 border-slate-700">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            {LEVELS.map(l => (
              <SelectItem key={l} value={String(l)}>
                Level
                {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button
        className="mt-auto"
        disabled={!draft.name || saving}
        onClick={() => { void onSave(draft) }}
      >
        {saving ? 'Saving…' : 'Save character'}
      </Button>
    </div>
  )
}
