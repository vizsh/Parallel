import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { RotateCcw } from 'lucide-react'
import { feel } from '@/lib/feel'

type Step = { t: number; label: string; detail: string }

/**
 * Universe A's chain as dominoes: each one's height is the minutes that step adds.
 * They tip one after another until the last lands on the total focus lost.
 */
export default function Dominoes({ steps, tone = 'chaos' }: { steps: Step[]; tone?: 'chaos' | 'calm' }) {
  const reduce = useReducedMotion()
  const [run, setRun] = useState(0)
  const adds = steps.map((s, i) => Math.max(0, s.t - (i ? steps[i - 1].t : 0)))
  const most = Math.max(...adds, 1)
  const total = steps.length ? steps[steps.length - 1].t : 0
  const color = tone === 'chaos' ? 'bg-chaos' : 'bg-calm'
  const gap = 0.55 // seconds between falls
  useEffect(() => { // one haptic tick per domino as it tips
    if (reduce) return
    const ids = steps.map((_, i) => setTimeout(() => feel('tick'), (0.4 + i * gap) * 1000))
    return () => ids.forEach(clearTimeout)
  }, [run, steps, reduce])
  return (
    <div>
      <div className="flex items-end gap-5 h-[150px] pl-2 overflow-hidden" aria-hidden key={run}>
        {steps.map((s, i) => {
          const h = 40 + (adds[i] / most) * 90
          return (
            <motion.div key={i} className={`relative w-6 shrink-0 rounded-[4px] ${color} shadow-lg`}
              style={{ height: h, originX: 1, originY: 1 }}
              initial={{ rotate: 0 }} animate={{ rotate: reduce ? 0 : 68 }}
              transition={{ delay: 0.4 + i * gap, duration: 0.35, ease: 'easeIn' }}>
              <span className="absolute inset-x-0 top-1/2 h-px bg-field-ink/40" />
            </motion.div>
          )
        })}
        <motion.p className={`ml-auto self-center text-right ${tone === 'chaos' ? 'text-chaos' : 'text-calm'}`}
          initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: reduce ? 0 : 0.6 + steps.length * gap, type: 'spring', stiffness: 260, damping: 14 }}>
          <span className="block text-4xl font-semibold tabular-nums">{total}</span><span className="small">min gone</span>
        </motion.p>
      </div>
      <ol className="mt-3 flex flex-col gap-1.5">
        {steps.map((s, i) => (
          <li key={i} className="small flex gap-2"><span className="tabular-nums text-muted w-14 shrink-0">+{adds[i].toFixed(1)}</span><span><span className="font-medium">{s.label}</span> <span className="text-muted">· {s.detail}</span></span></li>
        ))}
      </ol>
      <button onClick={() => setRun((r) => r + 1)} className="mt-2 small text-muted hover:text-ink flex items-center gap-1"><RotateCcw size={13} /> knock them over again</button>
    </div>
  )
}
