import { getBackgrounds, getClasses, getRaces } from '@/lib/open5e'
import { NewCharacterClient } from './client'

export default async function NewCharacterPage() {
  const [races, classes, backgrounds] = await Promise.all([
    getRaces(),
    getClasses(),
    getBackgrounds(),
  ])

  return <NewCharacterClient races={races} classes={classes} backgrounds={backgrounds} />
}
