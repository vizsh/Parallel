import { BADGES, badgeFor } from './universes'

export { BADGES, badgeFor }
export type Badge = (typeof BADGES)[number]
export type Owned = Record<string, { n: number; first: number }>

// The collection lives on this device for now: it's cosmetic, and XP stays the server's source of truth.
const key = (uid?: number) => `parallel.cards.${uid ?? 'anon'}`
export function loadCards(uid?: number): Owned {
  try { return JSON.parse(localStorage.getItem(key(uid)) ?? '{}') } catch { return {} }
}
export function addCard(uid: number | undefined, id: string) {
  const all = loadCards(uid)
  const isNew = !all[id]
  all[id] = { n: (all[id]?.n ?? 0) + 1, first: all[id]?.first ?? Date.now() }
  try { localStorage.setItem(key(uid), JSON.stringify(all)) } catch { /* private mode */ }
  return isNew
}

