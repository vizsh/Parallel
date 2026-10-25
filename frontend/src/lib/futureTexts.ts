/**
 * Texts from Future You. Every decision on a ping queues a short chat from "you, N minutes from now",
 * timed to the twin's predicted cost. Stored per device; on Android/iOS it also arrives as a local notification.
 */
import { useEffect, useRef, useState } from 'react'
import { clockAt } from './future'
import { toast } from './hooks'
import { isNative } from './native'

export type FutureText = { id: string; side: 'a' | 'b'; app: string; at: number; lines: string[]; read: boolean; early?: boolean }

const KEY = (uid?: number) => `parallel.futureTexts.${uid ?? 'anon'}`
export const FUTURE_TEXTS_EVENT = 'parallel:futuretexts'

const A_LINES: Record<string, string[]> = {
  social_like: ['we opened insta “to see who liked it”', 'it was 3 likes and 40 reels 💀'],
  video_reco: ['the “9 minute video” had a part 2', 'and a part 3. and a reaction video'],
  social_dm: ['the group chat is planning goa again', 'i am now the admin. send help'],
  news: ['we now have opinions on 4 countries', 'none of them about {task}'],
  promo: ['cart: 1 keyboard, 2 plants, a hat for a cat we don’t own', 'wallet is not speaking to us'],
}
const B_LINES: Record<string, string[]> = {
  social_like: ['the likes are still there btw', 'read them in 10 sec. felt nothing. growth'],
  video_reco: ['watched the video as a reward', 'hit different after finishing {task} ngl'],
  social_dm: ['replied to the gc in one go', 'they think we’re mysterious now 😌'],
  news: ['read the 3 min summary', 'the world survived without us refreshing'],
  promo: ['the sale is back tomorrow. it always is', 'kept the money. bought peace'],
}

export function writeFutureText(o: { side: 'a' | 'b'; category: string; app: string; minutes: number; task?: string }): FutureText {
  const now = new Date()
  const at = now.getTime() + Math.max(1, o.minutes) * 60_000
  const time = clockAt(now.getHours() + now.getMinutes() / 60, Math.max(1, o.minutes)).toLowerCase()
  const task = (o.task ?? 'the work').toLowerCase()
  const mid = ((o.side === 'a' ? A_LINES : B_LINES)[o.category] ?? (o.side === 'a'
    ? [`opened ${o.app} “for a second”`, 'the second lasted a while']
    : [`the ${o.app} thing waited for us`, 'handled it in one calm minute'])).map((l) => l.replace('{task}', task))
  const lines = o.side === 'a'
    ? [`bro. it’s ${time}.`, ...mid, `${task} is exactly where we left it`, 'next ping? don’t. trust me 🙏']
    : [`yo it’s ${time}, ${task} block done 😌`, ...mid, 'main character behaviour fr ✨']
  return { id: `${at}-${Math.random().toString(36).slice(2, 7)}`, side: o.side, app: o.app, at, lines, read: false }
}

export function loadFutureTexts(uid?: number): FutureText[] {
  try { return JSON.parse(localStorage.getItem(KEY(uid)) ?? '[]') } catch { return [] }
}
function save(uid: number | undefined, list: FutureText[]) {
  try { localStorage.setItem(KEY(uid), JSON.stringify(list.slice(-30))) } catch { /* private mode */ }
  window.dispatchEvent(new Event(FUTURE_TEXTS_EVENT))
}

/** Queue a text and, inside the native app, a real notification at the same moment. */
export async function queueFutureText(uid: number | undefined, o: Parameters<typeof writeFutureText>[0]) {
  const t = writeFutureText(o)
  save(uid, [...loadFutureTexts(uid), t])
  if (isNative()) {
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications')
      const perm = await LocalNotifications.requestPermissions()
      if (perm.display === 'granted') {
        await LocalNotifications.schedule({ notifications: [{ id: 5000 + (t.at % 100000), title: `You (${t.lines[0].match(/\d+:\d+ [ap]m/)?.[0] ?? 'later'})`, body: t.lines.slice(0, 2).join(' '), schedule: { at: new Date(t.at) } }] })
      }
    } catch { /* reminders are a bonus */ }
  }
  return t
}

/** Mark as read, or deliver a pending text early (the "skip ahead" button). */
export function updateFutureText(uid: number | undefined, id: string, patch: Partial<Pick<FutureText, 'read' | 'early'>>) {
  save(uid, loadFutureTexts(uid).map((t) => (t.id === id ? { ...t, ...patch } : t)))
}
export function clearFutureTexts(uid?: number) { save(uid, []) }
export const arrived = (t: FutureText, now: number) => t.early || t.at <= now

/** Re-reads the texts when they change and ticks once every few seconds so pending ones can arrive. */
export function useFutureTexts(uid?: number, every = 5000) {
  const [list, setList] = useState<FutureText[]>(() => loadFutureTexts(uid))
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const re = () => setList(loadFutureTexts(uid))
    re()
    window.addEventListener(FUTURE_TEXTS_EVENT, re)
    const t = setInterval(() => setNow(Date.now()), every)
    return () => { window.removeEventListener(FUTURE_TEXTS_EVENT, re); clearInterval(t) }
  }, [uid, every])
  return { list, now }
}

/** App-wide: when a text from future you lands while the app is open, say so. */
export function useFutureTextPings(uid?: number) {
  const { list, now } = useFutureTexts(uid, 10000)
  const told = useRef<Set<string>>(new Set())
  useEffect(() => {
    for (const t of list) {
      if (t.read || !arrived(t, now) || told.current.has(t.id)) continue
      told.current.add(t.id)
      if (t.early || now - t.at < 60_000) toast(`💬 New text from future you: “${t.lines[0]}”`, t.side === 'a' ? 'chaos' : 'calm')
    }
  }, [list, now])
}


/** A plain reminder in the same thread ("call Riya"), delivered at `at` (ms). */
export async function queueReminder(uid: number | undefined, text: string, at: number) {
  const t: FutureText = { id: `${at}-r${Math.random().toString(36).slice(2, 6)}`, side: 'b', app: 'Reminder', at, lines: [`⏰ reminder: ${text}`], read: false }
  save(uid, [...loadFutureTexts(uid), t])
  if (isNative()) {
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications')
      const perm = await LocalNotifications.requestPermissions()
      if (perm.display === 'granted') await LocalNotifications.schedule({ notifications: [{ id: 7000 + (at % 100000), title: 'Reminder from your coach', body: text, schedule: { at: new Date(at) } }] })
    } catch { /* reminders are a bonus */ }
  }
  return t
}
