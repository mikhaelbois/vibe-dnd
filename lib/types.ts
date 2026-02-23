import type { Database } from './database.types'

// Character matches the DB row exactly — derived from the generated schema.
export type Character = Database['public']['Tables']['characters']['Row']

// CharacterDraft is form state (no id/user_id, all fields non-nullable strings).
export interface CharacterDraft {
  name: string
  race: string
  class: string
  subclass: string
  background: string
  level: number
}
