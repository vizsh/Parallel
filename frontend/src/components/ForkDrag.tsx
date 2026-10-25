import { useEffect, useRef, useState } from 'react'
import { animate, motion, useMotionValue, useMotionValueEvent, useReducedMotion, useTransform } from 'motion/react'
import { Bell, ChevronLeft, ChevronRight } from 'lucide-react'
import { feel } from '@/lib/feel'

type Side = 'allow' | 'delay'
const TOKEN = 64
const COMMIT = 0.72 // fraction of the way to a universe that commits the choice

/**
 * Drag the ping into a universe. Left is Universe A (allow it now), right is Universe B (hold it).
 * The minutes each future costs count up live as you drag, from the model's own numbers.
 */
export default function ForkDrag({ allowCost, holdCost, aName, bName, chosen, disabled, onChoose }: {
  allowCost: number; holdCost: number; aName: string; bName: string
  chosen: string | null; disabled?: boolean; onChoose: (s: Side) => void
}) {
  const reduce = useReducedMotion()
  const track = useRef<HTMLDivElement>(null)
  const [half, setHalf] = useState(140)
  const halfMv = useMotionValue(140)
  useEffect(() => halfMv.set(half), [half, halfMv])
  const x = useMotionValue(0)
  const p = useTransform(() => Math.max(-1, Math.min(1, x.get() / halfMv.get()))) // -1 = Universe A, +1 = Universe B
  const aMin = useTransform(p, (v) => `+${(Math.max(0, -v) * allowCost).toFixed(1)}`)
  const bMin = useTransform(p, (v) => `+${(Math.max(0, v) * holdCost).toFixed(1)}`)
  const aGlow = useTransform(p, [-1, 0], [1, 0.18])
  const bGlow = useTransform(p, [0, 1], [0.18, 1])
  const split = useTransform(p, [-1, 1], ['85%', '15%'])
  const bg = useTransform(split, (s) => `linear-gradient(90deg, rgba(255,74,31,.22) 0%, rgba(255,74,31,.08) ${s}, rgba(62,230,181,.08) ${s}, rgba(62,230,181,.22) 100%)`)
  const step = useRef(0)

  useEffect(() => {
    const el = track.current
    if (!el) return
    const ro = new ResizeObserver(() => setHalf(Math.max(60, el.clientWidth / 2 - TOKEN / 2 - 8)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // a haptic tick every quarter of the way, so the drag feels like it has detents
  useMotionValueEvent(p, 'change', (v) => {
    const s = Math.round(v * 4)
    if (s !== step.current) { step.current = s; if (s) feel('tick') }
  })

  // the token rests in the chosen universe
  useEffect(() => {
    const target = chosen === 'allow' ? -half : chosen === 'delay' || chosen === 'summarize' ? half : 0
    animate(x, target, reduce ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 26 })
  }, [chosen, half]) // eslint-disable-line react-hooks/exhaustive-deps

  function commit(s: Side) {
    feel(s === 'allow' ? 'allow' : 'hold')
    onChoose(s)
  }

  const locked = disabled || !!chosen
  return (
    <div>
      <motion.div ref={track} style={{ background: bg }} className="relative h-[168px] rounded-2xl overflow-hidden select-none">
        <motion.div style={{ opacity: aGlow }} className="absolute left-4 top-3 bottom-3 flex flex-col justify-between pointer-events-none">
          <div><p className="small text-chaos font-semibold">Universe A · allow</p><p className="small text-muted max-w-[9rem] truncate">{aName}</p></div>
          <p className="text-3xl font-semibold tabular-nums text-chaos"><motion.span>{aMin}</motion.span><span className="text-base font-normal"> min</span></p>
        </motion.div>
        <motion.div style={{ opacity: bGlow }} className="absolute right-4 top-3 bottom-3 flex flex-col justify-between items-end text-right pointer-events-none">
          <div><p className="small text-calm font-semibold">Universe B · hold</p><p className="small text-muted max-w-[9rem] truncate">{bName}</p></div>
          <p className="text-3xl font-semibold tabular-nums text-calm"><motion.span>{bMin}</motion.span><span className="text-base font-normal"> min</span></p>
        </motion.div>

        <div className="absolute inset-0 grid place-items-center">
          {!locked && (
            <div className="absolute flex items-center gap-[84px] text-muted pointer-events-none" aria-hidden>
              <motion.span animate={reduce ? {} : { x: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 1.4 }}><ChevronLeft size={22} /></motion.span>
              <motion.span animate={reduce ? {} : { x: [0, 6, 0] }} transition={{ repeat: Infinity, duration: 1.4 }}><ChevronRight size={22} /></motion.span>
            </div>
          )}
          <motion.button type="button"
            drag={locked ? false : 'x'} dragConstraints={{ left: -half, right: half }} dragElastic={0.08} dragMomentum={false}
            style={{ x, width: TOKEN, height: TOKEN }}
            whileDrag={{ scale: 1.1 }} whileTap={locked ? undefined : { scale: 1.06 }}
            onDragEnd={() => {
              const v = p.get()
              if (v <= -COMMIT) commit('allow')
              else if (v >= COMMIT) commit('delay')
              else animate(x, 0, { type: 'spring', stiffness: 500, damping: 30 })
            }}
            onKeyDown={(e) => { if (locked) return; if (e.key === 'ArrowLeft') commit('allow'); if (e.key === 'ArrowRight') commit('delay') }}
            aria-label="Drag left to allow the notification, right to hold it. Arrow keys work too."
            className={`relative z-10 grid place-items-center fork-cut bg-ink text-field-ink shadow-xl touch-none ${locked ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'}`}>
            <Bell size={26} aria-hidden />
          </motion.button>
        </div>
      </motion.div>
      <p className="small text-muted mt-2 text-center">
        {chosen ? (chosen === 'allow' ? 'You stepped into Universe A.' : chosen === 'delay' ? 'You stepped into Universe B.' : 'Sent to the digest.') : 'Drag the ping into a universe'}
      </p>
    </div>
  )
}
