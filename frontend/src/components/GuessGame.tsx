import { useState } from 'react'
import { motion } from 'motion/react'
import { Eye, Lock } from 'lucide-react'
import { feel } from '@/lib/feel'

const MAX = 60

/** Before the twin shows its numbers, you bet on yourself. */
export function GuessGate({ app, text, onLock, onSkip }: { app: string; text: string; onLock: (min: number) => void; onSkip: () => void }) {
  const [g, setG] = useState(5)
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="panel p-6 sm:p-8 text-center">
      <p className="small text-muted">{app} · “{text}”</p>
      <h2 className="mt-3 text-2xl sm:text-3xl font-semibold">Be honest. If you tapped this right now, how many minutes would it eat?</h2>
      <p className="mt-6 text-6xl font-semibold tabular-nums text-chaos">{g}<span className="text-xl text-muted font-normal"> min</span></p>
      <input type="range" min={0} max={MAX} step={1} value={g} aria-label="Your guess in minutes"
        onChange={(e) => { setG(+e.target.value); feel('tick') }} className="range-lg mt-5 w-full max-w-md accent-[var(--color-chaos)]" />
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <button onClick={() => { feel('success'); onLock(g) }} className="btn"><Lock size={17} /> Lock in my guess</button>
        <button onClick={onSkip} className="btn btn-ghost"><Eye size={17} /> Just show me</button>
      </div>
      <p className="small text-muted mt-4">Your guess vs the twin vs what really happens: the gap is how well you know your own attention.</p>
    </motion.div>
  )
}

function verdict(guess: number, p10: number, p50: number, p90: number) {
  if (guess >= p10 && guess <= p90) return { tone: 'calm', line: 'Ate. Your guess lands inside the twin’s range. You know yourself.' }
  if (guess < p10) return { tone: 'chaos', line: `Delulu alert: you said ${guess} min, your history says more like ${p50}. The “quick check” is never quick.` }
  return { tone: 'ink', line: `Dramatic much? You braced for ${guess} min; it’s usually closer to ${p50}. This one’s not that deep.` }
}

/** You vs the twin on one line, with the twin's 80% range as a band. */
export function GuessResult({ guess, p10, p50, p90, actual }: { guess: number; p10: number; p50: number; p90: number; actual?: number }) {
  const x = (m: number) => `${(Math.min(m, MAX) / MAX) * 100}%`
  const v = verdict(guess, p10, p50, p90)
  return (
    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="panel p-5">
      <p className={`font-semibold ${v.tone === 'calm' ? 'text-calm' : v.tone === 'chaos' ? 'text-chaos' : 'text-ink'}`}>{v.line}</p>
      <div className="relative mt-8 mb-6 h-2 bg-surface-2 rounded-full" role="img" aria-label={`You guessed ${guess} minutes; the twin predicts ${p50} (range ${p10} to ${p90})${actual != null ? `; it actually cost ${actual}` : ''}.`}>
        <div className="absolute inset-y-0 bg-chaos/40 rounded-full" style={{ left: x(p10), width: `calc(${x(p90)} - ${x(p10)})` }} />
        {[
          { m: guess, label: 'You', cls: 'bg-ink', up: true },
          { m: p50, label: 'Twin', cls: 'bg-chaos', up: false },
          ...(actual != null ? [{ m: actual, label: 'Reality', cls: 'bg-calm', up: true }] : []),
        ].map((d) => (
          <motion.div key={d.label} initial={{ left: '0%' }} animate={{ left: x(d.m) }} transition={{ type: 'spring', stiffness: 120, damping: 16 }}
            className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
            <span className={`w-4 h-4 rounded-full ring-2 ring-surface ${d.cls}`} />
            <span className={`absolute ${d.up ? '-top-6' : 'top-5'} small whitespace-nowrap`}>{d.label} {d.m}</span>
          </motion.div>
        ))}
      </div>
      <p className="small text-muted">Twin’s 80% range: {p10}–{p90} min.</p>
    </motion.div>
  )
}
