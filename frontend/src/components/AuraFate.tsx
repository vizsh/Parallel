import { motion, useReducedMotion } from 'motion/react'
import { Sparkles } from 'lucide-react'
import CountUp from './CountUp'

export type Aura = { total: number; week: number; tier: string; line: string; recent: { points: number; why: string; category: string }[] }
export type Fate = { value: number; label: string; decisions_today: number }

/** Aura points for the week and today's fate meter: Scrollfather on the left, Main Character on the right. */
export default function AuraFate({ aura, fate }: { aura?: Aura; fate?: Fate }) {
  const reduce = useReducedMotion()
  const pos = fate ? ((fate.value + 1) / 2) * 100 : 50
  return (
    <div className="panel p-5 flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="small text-muted">Aura this week</p>
          <p className="text-5xl font-semibold tabular-nums tracking-tight">
            {aura ? <CountUp to={aura.week} decimals={0} duration={1.1} /> : '…'}
          </p>
        </div>
        {aura && (
          <motion.span initial={reduce ? false : { scale: 0.6, rotate: -8 }} animate={{ scale: 1, rotate: -3 }} transition={{ type: 'spring', stiffness: 260, damping: 12 }}
            className={`px-3 py-1.5 font-bold small border-2 border-field-ink text-field-ink shadow-[3px_3px_0_#000] ${aura.week >= 1000 ? 'bg-calm' : aura.week < 0 ? 'bg-chaos' : 'bg-[#ffd23f]'}`}>
            <Sparkles size={13} className="inline -mt-0.5 mr-1" aria-hidden />{aura.tier}
          </motion.span>
        )}
      </div>
      {aura && <p className="small text-muted -mt-3">{aura.line}</p>}

      <div>
        <div className="flex justify-between small font-semibold"><span className="text-chaos">The Scrollfather</span><span className="text-calm">Main Character</span></div>
        <div className="relative mt-2 h-3 rounded-full" style={{ background: 'linear-gradient(90deg, var(--color-chaos), #ffd23f 50%, var(--color-calm))' }}
          role="meter" aria-valuemin={-1} aria-valuemax={1} aria-valuenow={fate?.value ?? 0} aria-label={`Fate meter: ${fate?.label ?? 'loading'}`}>
          <motion.span className="absolute top-1/2 w-6 h-6 -mt-3 -ml-3 rounded-full bg-ink border-4 border-bg shadow-lg"
            initial={{ left: '50%' }} animate={{ left: `${pos}%` }} transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 90, damping: 12 }} />
        </div>
        <p className="mt-2 small"><span className="font-semibold">{fate?.label ?? '…'}</span>
          <span className="text-muted"> · {fate?.decisions_today ? `${fate.decisions_today} decision${fate.decisions_today > 1 ? 's' : ''} today` : 'make a decision to move the needle'}</span></p>
      </div>

      {aura && aura.recent.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {aura.recent.slice(0, 4).map((r, i) => (
            <li key={i} className={`small px-2.5 py-1 rounded-full ${r.points >= 0 ? 'bg-calm/15 text-calm' : 'bg-chaos/15 text-chaos'}`}>
              {r.points >= 0 ? '+' : ''}{r.points} {r.why}
            </li>
          ))}
        </ul>
      )}
      <p className="text-[11px] text-muted">Holds earn up to +500 · cheap on-purpose opens +50 · honest reality checks +100 · a confirmed doomscroll −1000.</p>
    </div>
  )
}
