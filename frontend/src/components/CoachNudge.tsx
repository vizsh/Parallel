import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { BellOff, Sparkles, X } from 'lucide-react'
import { api } from '@/lib/api'
import { feel } from '@/lib/feel'
import { useAuth } from '@/lib/auth'
import { runAction, type Action } from '@/lib/coach'
import { toast } from '@/lib/hooks'

type Nudge = { id: number; kind: string; title: string; text: string; actions: Action[]; left_today: number; demo?: boolean }

/**
 * The coach speaks first, at most three times a day: golden hours starting, a block ending with pings in the jar,
 * a late night, an exam morning, a slipped commitment, a finished experiment. “Fewer of these” mutes that kind for a week.
 * `?nudge=<kind>` shows one on demand (presentations).
 */
export default function CoachNudge() {
  const [n, setN] = useState<Nudge | null>(null)
  const { user } = useAuth()
  const loc = useLocation()
  const nav = useNavigate()
  const force = new URLSearchParams(loc.search).get('nudge')

  const check = useCallback(async () => {
    try {
      const r = await api<Nudge | null>(`/coach/nudge${force ? `?force=${force}` : ''}`)
      if (r) { setN(r); feel('tick') }
    } catch { /* offline: try again later */ }
  }, [force])

  useEffect(() => {
    const first = setTimeout(check, force ? 300 : 4000)
    const t = setInterval(check, 120_000)
    return () => { clearTimeout(first); clearInterval(t) }
  }, [check, force])

  async function respond(response: 'accept' | 'dismiss' | 'fewer') {
    if (n && !n.demo) api(`/coach/nudge/${n.id}`, { body: { response } }).catch(() => {})
    setN(null)
  }
  async function act(a: Action) {
    if (a.kind === 'ask') { nav(`/app/coach?q=${encodeURIComponent(String(a.payload?.text ?? ''))}`); return respond('accept') }
    try { const d = await runAction(a, user?.id); toast(d.message) } catch (e) { toast((e as Error).message, 'chaos') }
    respond('accept')
  }

  return (
    <AnimatePresence>
      {n && (
        <motion.aside key={n.id + n.kind} role="status" aria-live="polite"
          initial={{ opacity: 0, y: 30, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20 }} transition={{ type: 'spring', stiffness: 300, damping: 26 }}
          className="fixed z-40 left-3 right-3 bottom-[9.5rem] sm:left-auto sm:right-4 sm:w-[360px] lg:bottom-24 rounded-2xl bg-field text-field-ink p-4 shadow-2xl">
          <div className="flex items-start gap-2.5">
            <span className="w-8 h-8 rounded-full bg-gradient-to-br from-chaos to-calm grid place-items-center shrink-0"><Sparkles size={15} /></span>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black tracking-widest opacity-60">YOUR COACH{n.demo ? ' · DEMO' : ''}</p>
              <p className="font-semibold leading-snug">{n.title}</p>
              <p className="small opacity-75 mt-0.5">{n.text}</p>
            </div>
            <button onClick={() => respond('dismiss')} aria-label="Dismiss" className="opacity-60 hover:opacity-100"><X size={18} /></button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {n.actions.map((a) => <button key={a.label} onClick={() => act(a)} className="rounded-full bg-field-ink text-field px-3.5 py-2 small font-semibold">{a.label}</button>)}
            <button onClick={() => respond('dismiss')} className="rounded-full px-3 py-2 small">Not now</button>
            <button onClick={() => respond('fewer')} className="ml-auto small opacity-60 hover:opacity-100 flex items-center gap-1"><BellOff size={13} /> Fewer of these</button>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
