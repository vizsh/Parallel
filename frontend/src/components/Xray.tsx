import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Moon, ScanSearch, ShieldCheck } from 'lucide-react'
import type { Tactic } from '@/lib/future'

/**
 * Manipulation X-ray: names the engagement tactic a ping uses. Tap a chip for the one-line explanation.
 * `usually` unmasks vague teasers with what this kind of ping normally turns out to be.
 */
export default function Xray({ tags, usually, guard, compact = false }: { tags?: Tactic[]; usually?: string | null; guard?: string | null; compact?: boolean }) {
  const [open, setOpen] = useState<string | null>(null)
  const vague = tags?.some((t) => t.tactic === 'curiosity_gap' || t.tactic === 'reengagement')
  if (!tags?.length && !guard) return null
  const active = tags?.find((t) => t.tactic === open)
  return (
    <div className="flex flex-col gap-1.5" onPointerDownCapture={(e) => e.stopPropagation()}>
      <div className="flex flex-wrap items-center gap-1.5">
        {guard === 'night' && <span className="inline-flex items-center gap-1 rounded-full bg-[#8b5cf6]/20 text-[#c4b5fd] px-2 py-0.5 text-[11px] font-semibold"><Moon size={11} aria-hidden /> Night guard</span>}
        {guard === 'reengagement' && <span className="inline-flex items-center gap-1 rounded-full bg-calm/20 text-calm px-2 py-0.5 text-[11px] font-semibold"><ShieldCheck size={11} aria-hidden /> Shielded</span>}
        {tags?.map((t) => (
          <button key={t.tactic} type="button" onClick={() => setOpen(open === t.tactic ? null : t.tactic)} aria-expanded={open === t.tactic}
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold transition-colors ${open === t.tactic ? 'bg-[#ffd23f] text-field-ink border-[#ffd23f]' : 'border-[#ffd23f]/60 text-[#ffd23f]'}`}>
            <ScanSearch size={11} aria-hidden /> {t.label}
          </button>
        ))}
      </div>
      <AnimatePresence>
        {active && (
          <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="small text-muted overflow-hidden">
            {active.explain}
          </motion.p>
        )}
      </AnimatePresence>
      {vague && usually && !compact && <p className="small text-muted">Unmasked: {usually}.</p>}
    </div>
  )
}
