import { useEffect } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { FastForward, Trash2 } from 'lucide-react'
import { arrived, clearFutureTexts, updateFutureText, useFutureTexts, type FutureText } from '@/lib/futureTexts'
import { feel } from '@/lib/feel'

const fmt = (ms: number) => new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

function Typing() {
  return (
    <span className="inline-flex gap-1 px-3 py-2.5 rounded-2xl rounded-bl-md bg-surface-2" aria-label="Future you is typing">
      {[0, 1, 2].map((i) => <motion.span key={i} className="w-1.5 h-1.5 rounded-full bg-muted" animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.9, delay: i * 0.15 }} />)}
    </span>
  )
}

function Thread({ t, uid, fresh }: { t: FutureText; uid?: number; fresh: boolean }) {
  const reduce = useReducedMotion()
  const A = t.side === 'a'
  useEffect(() => { // one tick per bubble as an unread text "arrives", then it counts as read
    if (!fresh) return
    const ids = t.lines.map((_, i) => setTimeout(() => feel('tick'), 300 + i * 450))
    const done = setTimeout(() => updateFutureText(uid, t.id, { read: true }), 400 + t.lines.length * 450)
    return () => { ids.forEach(clearTimeout); clearTimeout(done) }
  }, [fresh, t, uid])
  return (
    <li className="flex flex-col items-start gap-1">
      <p className="text-[11px] text-muted">{fmt(t.at)} · {t.app === 'Reminder' ? 'a reminder you asked for' : `after you ${A ? 'opened' : 'held'} ${t.app}`}</p>
      {t.lines.map((l, i) => (
        <motion.p key={i} initial={fresh && !reduce ? { opacity: 0, y: 8, scale: 0.9 } : false} animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: fresh ? 0.3 + i * 0.45 : 0, type: 'spring', stiffness: 400, damping: 26 }}
          className={`max-w-[85%] px-3 py-2 rounded-2xl rounded-bl-md text-[15px] leading-snug ${A ? 'bg-chaos/15 text-ink' : 'bg-calm/15 text-ink'}`}>{l}</motion.p>
      ))}
    </li>
  )
}

/** A chat thread with yourself, a few minutes from now. */
export default function FutureTexts({ uid }: { uid?: number }) {
  const { list, now } = useFutureTexts(uid)
  const shown = [...list].sort((a, b) => b.at - a.at).slice(0, 5)
  return (
    <div className="panel p-5 flex flex-col">
      <div className="flex items-center gap-3">
        <span className="relative grid place-items-center w-11 h-11 rounded-full bg-gradient-to-br from-chaos to-calm text-field-ink font-black text-lg" aria-hidden>
          Y<span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-calm border-2 border-surface" />
        </span>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold">Texts from future you</h2>
          <p className="small text-muted">They land when your twin says the ping would have ended.</p>
        </div>
        {list.length > 0 && <button onClick={() => clearFutureTexts(uid)} className="p-2 text-muted hover:text-ink" aria-label="Clear texts"><Trash2 size={16} /></button>}
      </div>
      {shown.length === 0
        ? <p className="small text-muted mt-5">Open or hold a ping in the Multiverse or the inbox. Future you will text back about how it went.</p>
        : (
          <ul className="mt-4 flex flex-col gap-4" aria-live="polite">
            {shown.map((t) => !arrived(t, now)
              ? (
                <li key={t.id} className="flex flex-col items-start gap-1.5">
                  <p className="text-[11px] text-muted">arrives {fmt(t.at)} · about {t.app}</p>
                  <div className="flex items-center gap-2">
                    <Typing />
                    <button onClick={() => updateFutureText(uid, t.id, { early: true })} className="small text-muted hover:text-ink flex items-center gap-1"><FastForward size={13} /> skip ahead</button>
                  </div>
                </li>
              )
              : <Thread key={t.id} t={t} uid={uid} fresh={!t.read} />)}
          </ul>
        )}
    </div>
  )
}
