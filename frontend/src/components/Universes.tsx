import { AnimatePresence, motion } from 'motion/react'
import { Plane, Smartphone, Trophy } from 'lucide-react'
import type { Sim } from '@/lib/api'
import CountUp from './CountUp'
import { GENERIC, SCRIPTS } from '@/lib/universes'

function fill(s: string, task: string) { return s.replaceAll('{task}', task.toLowerCase()) }

function Feed() {
  return (
    <div className="relative h-28 w-16 rounded-xl bg-bg border border-chaos/40 overflow-hidden" aria-hidden>
      <motion.div className="flex flex-col gap-1.5 p-1.5" animate={{ y: [0, -120] }} transition={{ repeat: Infinity, duration: 1.6, ease: 'linear' }}>
        {Array.from({ length: 12 }).map((_, i) => <div key={i} className="h-5 rounded bg-chaos/60" style={{ opacity: 0.4 + (i % 3) * 0.2 }} />)}
      </motion.div>
      <Smartphone className="absolute bottom-1 right-1 text-chaos" size={14} />
    </div>
  )
}

function Jet() {
  return (
    <div className="relative h-28 w-28 overflow-hidden" aria-hidden>
      <motion.div className="absolute" initial={{ x: -30, y: 80, rotate: -20 }} animate={{ x: [-30, 100], y: [80, 0], rotate: [-20, -35] }} transition={{ repeat: Infinity, duration: 2.6, ease: 'easeInOut' }}>
        <Plane className="text-calm" size={30} />
      </motion.div>
      <div className="absolute bottom-0 inset-x-0 h-6 bg-calm/10 rounded-full blur-md" />
    </div>
  )
}

export default function Universes({ sim, compact = false, playKey = 0 }: { sim: Sim; compact?: boolean; playKey?: number | string }) {
  const sc = SCRIPTS[sim.category] ?? GENERIC
  const task = sim.context.task
  const holdCost = sim.delay.cost_expected
  return (
    <div className="grid md:grid-cols-2 gap-3">
      {(['a', 'b'] as const).map((side) => {
        const A = side === 'a'
        const beats = (A ? sc.a : sc.b).map((b) => b.replace(/^Year 2047: /, ''))
        return (
          <div key={side} className={`fork-cut relative p-5 sm:p-7 ${A ? 'bg-chaos text-field-ink' : 'bg-calm text-field-ink'}`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="small font-medium">{A ? 'Universe A · you tap' : 'Universe B · you hold it'}</p>
                <p className="mt-1 text-4xl sm:text-5xl font-semibold tracking-tight">
                  <CountUp key={`${playKey}-${side}`} to={A ? sim.allow.cost_expected : holdCost} decimals={1} duration={1.2} /> min
                </p>
                <p className="small">{A ? `expected focus cost · range ${sim.allow.cost_p10}–${sim.allow.cost_p90}` : 'expected cost when reviewed later'}</p>
              </div>
              {A ? <Feed /> : <Jet />}
            </div>
            {!compact && (
              <ol className="mt-5 flex flex-col gap-2.5">
                <AnimatePresence>
                  {beats.map((b, i) => (
                    <motion.li key={`${playKey}-${i}`} initial={{ opacity: 0, x: A ? -16 : 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 + i * 0.45 }} className="flex gap-3">
                      <span className="small font-semibold w-[4.5rem] shrink-0 tabular-nums">{i === 3 ? 'Year 2047' : A ? ['+0 min', '+2 min', `+${Math.round(sim.allow.away_if_rabbit)} min`][i] : ['+0 min', '+25 min', '+50 min'][i]}</span>
                      <span className="text-[1rem] leading-snug">{fill(b, task)}</span>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ol>
            )}
            <motion.div key={`${playKey}-badge-${side}`} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: compact ? 0.4 : 2.2, type: 'spring', stiffness: 260, damping: 16 }}
              className="mt-5 inline-flex items-center gap-2 bg-field-ink text-ink px-3 py-2 small font-medium">
              <Trophy size={16} className={A ? 'text-chaos' : 'text-calm'} /> Achievement: {A ? sc.aBadge : sc.bBadge}
            </motion.div>
          </div>
        )
      })}
    </div>
  )
}
