export interface Character {
  id: string
  user_id: string
  name: string
  race: string | null
  class: string | null
  subclass: string | null
  background: string | null
  level: number
  created_at: string
}

// Shape used in the builder form (no id/user_id)
export interface CharacterDraft {
  name: string
  race: string
  class: string
  subclass: string
  background: string
  level: number
}
