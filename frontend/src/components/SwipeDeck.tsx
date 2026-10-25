import { useRef, useState } from 'react'
import { animate, motion, useMotionValue, useMotionValueEvent, useReducedMotion, useTransform, type MotionValue } from 'motion/react'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Bell, DoorOpen } from 'lucide-react'
import { feel } from '@/lib/feel'
import type { Tactic } from '@/lib/future'
import Xray from './Xray'

export type Swipe = 'allow' | 'hold' | 'digest' | 'noise'
export type DeckItem = { id: string; app: string; label: string; text: string; minutes_ago: number; recommendation: string; why: string; cost: number; p_open: number; xray?: Tactic[]; usually?: string | null; guard?: string | null }

// Right lets it through, left holds it, up batches it, down teaches the twin it was noise.
const DIRS: Record<Swipe, { label: string; hint: string; cls: string; icon: typeof ArrowLeft; key: string }> = {
  hold: { label: 'Hold', hint: 'until your checkpoint', cls: 'bg-chaos text-field-ink', icon: ArrowLeft, key: 'ArrowLeft' },
  digest: { label: 'Digest', hint: 'in tonight’s batch', cls: 'bg-ink text-field-ink', icon: ArrowUp, key: 'ArrowUp' },
  noise: { label: 'Noise', hint: 'hold + didn’t matter', cls: 'bg-surface-2 text-ink', icon: ArrowDown, key: 'ArrowDown' },
  allow: { label: 'Allow', hint: 'open it now', cls: 'bg-calm text-field-ink', icon: ArrowRight, key: 'ArrowRight' },
}
const REC_DIR: Record<string, Swipe> = { allow: 'allow', delay: 'hold', summarize: 'digest' }
const T = 110 // px of drag that commits a swipe

function zoneOf(x: number, y: number): Swipe | null {
  if (Math.max(Math.abs(x), Math.abs(y)) < T) return null
  if (Math.abs(x) >= Math.abs(y)) return x > 0 ? 'allow' : 'hold'
  return y < 0 ? 'digest' : 'noise'
}

function Stamp({ dir, opacity }: { dir: Swipe; opacity: MotionValue<number> }) {
  const d = DIRS[dir]
  const pos = { allow: 'left-4 top-4 -rotate-12', hold: 'right-4 top-4 rotate-12', digest: 'left-1/2 -translate-x-1/2 bottom-5', noise: 'left-1/2 -translate-x-1/2 top-5' }[dir]
  return (
    <motion.span style={{ opacity }} className={`absolute ${pos} px-3 py-1 text-lg font-bold uppercase tracking-wide border-2 border-current ${d.cls} pointer-events-none`} aria-hidden>
      {d.label}
    </motion.span>
  )
}

function TopCard({ item, onSwipe, fling, onPeek }: { item: DeckItem; onSwipe: (d: Swipe) => void; fling: React.MutableRefObject<((d: Swipe) => void) | null>; onPeek?: (item: DeckItem) => void }) {
  const reduce = useReducedMotion()
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rotate = useTransform(x, [-240, 240], [-14, 14])
  const allowO = useTransform(x, [30, T], [0, 1])
  const holdO = useTransform(x, [-T, -30], [1, 0])
  const digestO = useTransform(y, [-T, -30], [1, 0])
  const noiseO = useTransform(y, [30, T], [0, 1])
  const zone = useRef<Swipe | null>(null)
  const gone = useRef(false)

  const track = () => {
    const z = zoneOf(x.get(), y.get())
    if (z !== zone.current) { zone.current = z; if (z) feel('tick') }
  }
  useMotionValueEvent(x, 'change', track)
  useMotionValueEvent(y, 'change', track)

  async function go(d: Swipe) {
    if (gone.current) return
    gone.current = true
    feel(d)
    const far = { allow: [520, 0], hold: [-520, 0], digest: [0, -620], noise: [0, 620] }[d]
    const opts = { duration: reduce ? 0 : 0.28, ease: 'easeIn' as const }
    await Promise.all([animate(x, far[0], opts), animate(y, far[1], opts)])
    onSwipe(d)
  }
  fling.current = go

  const rec = REC_DIR[item.recommendation]
  return (
    <motion.article
      drag dragElastic={0.9} dragMomentum={false}
      style={{ x, y, rotate }} whileTap={{ cursor: 'grabbing' }}
      onDragEnd={(_, info) => {
        const vx = info.velocity.x, vy = info.velocity.y
        const d = zoneOf(x.get() + vx * 0.15, y.get() + vy * 0.15)
        if (d) go(d)
        else { animate(x, 0, { type: 'spring', stiffness: 500, damping: 30 }); animate(y, 0, { type: 'spring', stiffness: 500, damping: 30 }) }
      }}
      className="absolute inset-0 panel p-5 flex flex-col cursor-grab touch-none select-none shadow-2xl ring-1 ring-white/5"
      aria-roledescription="swipe card" aria-label={`${item.app}: ${item.text}`}>
      <Stamp dir="allow" opacity={allowO} /><Stamp dir="hold" opacity={holdO} /><Stamp dir="digest" opacity={digestO} /><Stamp dir="noise" opacity={noiseO} />
      <div className="flex items-center gap-3">
        <span className="grid place-items-center w-11 h-11 bg-surface-2 rounded-xl shrink-0"><Bell size={20} /></span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{item.app}</p>
          <p className="small text-muted">{item.label} · {item.minutes_ago} min ago</p>
        </div>
        {onPeek && (
          <button onPointerDownCapture={(e) => e.stopPropagation()} onClick={() => onPeek(item)} aria-label={`Peek into the future of ${item.app}: ${item.text}`}
            className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full bg-[#ffd23f] text-field-ink small font-semibold"><DoorOpen size={16} aria-hidden /> Peek</button>
        )}
      </div>
      <p className="mt-5 text-xl font-semibold leading-snug">{item.text}</p>
      <div className="mt-2"><Xray tags={item.xray} usually={item.usually} guard={item.guard} /></div>
      <div className="mt-auto">
        <span className="inline-block -rotate-3 bg-chaos text-field-ink px-3 py-1 font-bold tabular-nums fork-cut">−{item.cost} focus min</span>
        <p className="small text-muted mt-3">{Math.round(item.p_open * 100)}% you’d open it</p>
        <p className="small mt-2 flex flex-col items-start gap-1.5">
          {rec && <span className={`inline-flex items-center gap-1 px-2 py-0.5 mr-2 font-medium ${DIRS[rec].cls}`}>Twin says {DIRS[rec].label} {(() => { const I = DIRS[rec].icon; return <I size={13} aria-hidden /> })()}</span>}
          <span className="text-muted line-clamp-3">{item.why}</span>
        </p>
      </div>
    </motion.article>
  )
}

/** Tinder-style triage: one ping at a time, a direction per decision, a distinct haptic per direction. */
export default function SwipeDeck({ items, onSwipe, onPeek }: { items: DeckItem[]; onSwipe: (item: DeckItem, d: Swipe) => void; onPeek?: (item: DeckItem) => void }) {
  const [gone, setGone] = useState<Record<string, true>>({})
  const fling = useRef<((d: Swipe) => void) | null>(null)
  const left = items.filter((i) => !gone[i.id])
  const top = left[0]
  const swipe = (d: Swipe) => { if (!top) return; setGone((g) => ({ ...g, [top.id]: true })); onSwipe(top, d) }

  return (
    <div className="flex flex-col items-center gap-4"
      tabIndex={0} aria-label="Notification deck. Arrow keys: right allow, left hold, up digest, down noise."
      onKeyDown={(e) => { const d = (Object.keys(DIRS) as Swipe[]).find((k) => DIRS[k].key === e.key); if (d && top) { e.preventDefault(); fling.current?.(d) } }}>
      <div className="relative w-full max-w-[380px] h-[340px]">
        {left.slice(1, 3).reverse().map((it, i, arr) => {
          const depth = arr.length - i
          return <div key={it.id} className="absolute inset-0 panel ring-1 ring-white/5" style={{ transform: `translateY(${depth * 12}px) scale(${1 - depth * 0.05})`, opacity: 1 - depth * 0.25 }} aria-hidden />
        })}
        {top
          ? <TopCard key={top.id} item={top} onSwipe={swipe} fling={fling} onPeek={onPeek} />
          : (
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="absolute inset-0 panel grid place-items-center text-center p-6">
              <div><p className="text-2xl font-semibold">Inbox clear.</p><p className="small text-muted mt-2">Every ping has a decision. Held ones are waiting in your jar.</p></div>
            </motion.div>
          )}
      </div>
      {top && <p className="small text-muted">{left.length} left · drag the card, or use the buttons</p>}
      <div className="grid grid-cols-4 gap-2 w-full max-w-[380px]">
        {(['hold', 'digest', 'noise', 'allow'] as Swipe[]).map((d) => {
          const D = DIRS[d]
          return (
            <motion.button key={d} whileTap={{ scale: 0.9 }} disabled={!top} onClick={() => fling.current?.(d)}
              className={`flex flex-col items-center gap-1 py-2.5 rounded-xl small font-medium disabled:opacity-40 ${D.cls}`} aria-label={`${D.label}: ${D.hint}`}>
              <D.icon size={18} aria-hidden />{D.label}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
