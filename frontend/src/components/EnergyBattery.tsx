import { useRef, useState } from 'react'
import { motion } from 'motion/react'
import { feel } from '@/lib/feel'

const LEVELS = ['Empty', 'Low', 'Okay', 'Good', 'Peak']
const H = 168, W = 78, GAP = 4

/**
 * Pull the charge up to how you feel. Each level clicks with a haptic tick; letting go logs it.
 * Works as a slider for keyboards and screen readers (arrows to move, Enter to log).
 */
export default function EnergyBattery({ value, onCommit }: { value: number | null; onCommit: (v: number) => void }) {
  const [preview, setPreview] = useState<number | null>(null)
  const dragging = useRef(false)
  const box = useRef<HTMLDivElement>(null)
  const level = preview ?? value ?? 0
  const low = level > 0 && level <= 2

  function levelAt(clientY: number) {
    const r = box.current!.getBoundingClientRect()
    const f = 1 - (clientY - r.top) / r.height
    return Math.max(1, Math.min(5, Math.ceil(f * 5)))
  }
  function move(v: number) { if (v !== preview) { setPreview(v); feel('tick') } }
  function commit(v: number) { setPreview(null); feel(v <= 2 ? 'warning' : 'success'); onCommit(v) }

  return (
    <div className="flex items-center gap-5">
      <div className="flex flex-col items-center shrink-0">
        <div className="w-7 h-2.5 rounded-t-md bg-surface-2" aria-hidden />
        <div ref={box} role="slider" tabIndex={0} aria-label="Energy" aria-valuemin={1} aria-valuemax={5} aria-valuenow={level || undefined}
          aria-valuetext={level ? LEVELS[level - 1] : 'not set'}
          onPointerDown={(e) => { dragging.current = true; e.currentTarget.setPointerCapture(e.pointerId); move(levelAt(e.clientY)) }}
          onPointerMove={(e) => { if (dragging.current) move(levelAt(e.clientY)) }}
          onPointerUp={(e) => { if (!dragging.current) return; dragging.current = false; commit(levelAt(e.clientY)) }}
          onPointerCancel={() => { dragging.current = false; setPreview(null) }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp' || e.key === 'ArrowRight') { e.preventDefault(); move(Math.min(5, (level || 0) + 1)) }
            if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') { e.preventDefault(); move(Math.max(1, (level || 2) - 1)) }
            if ((e.key === 'Enter' || e.key === ' ') && level) { e.preventDefault(); commit(level) }
          }}
          className="relative rounded-2xl border-[3px] border-surface-2 p-1.5 flex flex-col-reverse touch-none cursor-ns-resize outline-none focus-visible:ring-2 focus-visible:ring-ink"
          style={{ width: W, height: H, gap: GAP }}>
          {LEVELS.map((_, i) => (
            <motion.div key={i} className="flex-1 rounded-md"
              animate={{ backgroundColor: i < level ? (low ? 'var(--color-chaos)' : 'var(--color-calm)') : 'var(--color-surface-2)', scaleX: i === level - 1 && preview ? 1.06 : 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
          ))}
        </div>
      </div>
      <div className="min-w-0">
        <motion.p key={level} initial={{ y: 6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className={`text-3xl font-semibold ${low ? 'text-chaos' : level ? 'text-calm' : 'text-muted'}`}>
          {level ? LEVELS[level - 1] : 'How charged?'}
        </motion.p>
        <p className="small text-muted mt-1">{preview ? 'Let go to log it' : 'Drag the battery up or down'}</p>
      </div>
    </div>
  )
}
