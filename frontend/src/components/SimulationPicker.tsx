import { motion } from 'motion/react'
import { Download, Smartphone } from 'lucide-react'
import PhoneDemo from './PhoneDemo'
import { SCENARIOS, scenarioById } from '@/lib/scenarios'
import { feel } from '@/lib/feel'

/** Pick a real-life scenario and watch Parallel handle it on a phone. Each one also exists as a recorded video. */
export default function SimulationPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const sc = scenarioById(value)
  return (
    <div className="flex flex-col gap-6">
      <div className="-mx-4 px-4 flex gap-2 overflow-x-auto snap-x snap-mandatory pb-2 lg:mx-0 lg:px-0 lg:grid lg:grid-cols-5 lg:overflow-visible" role="radiogroup" aria-label="Scenario">
        {SCENARIOS.map((s, i) => {
          const on = s.id === sc.id
          return (
            <motion.button key={s.id} role="radio" aria-checked={on} whileTap={{ scale: 0.97 }} onClick={() => { feel('tick'); onChange(s.id) }}
              className={`snap-start shrink-0 w-[230px] lg:w-auto text-left p-4 rounded-2xl border-2 transition-colors ${on ? 'border-calm bg-calm/10' : 'border-surface-2 bg-surface hover:border-muted'}`}>
              <span className="small text-muted">{String(i + 1).padStart(2, '0')} · {s.persona}</span>
              <span className="block font-semibold leading-snug mt-1">{s.title}</span>
              <span className="block small text-muted mt-1.5">{s.tagline}</span>
            </motion.button>
          )
        })}
      </div>
      <div className="panel p-5 sm:p-8">
        <PhoneDemo scenario={sc.id} big />
        <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-surface-2 pt-5">
          <span className="small text-muted mr-1 flex items-center gap-1.5"><Smartphone size={15} aria-hidden /> Shows:</span>
          {sc.shows.map((x) => <span key={x} className="small rounded-full bg-surface-2 px-3 py-1">{x}</span>)}
          <a href={`/simulations/${sc.id}.mp4`} download className="ml-auto btn btn-ghost !py-2 small"><Download size={15} /> Video (MP4)</a>
        </div>
      </div>
    </div>
  )
}
