import { motion, useReducedMotion } from 'motion/react'
import { Share2 } from 'lucide-react'
import { toast } from '@/lib/hooks'

export type ReceiptLine = { app: string; label: string; choice: string; saved: number; xp: number }

const CHOICE: Record<string, string> = { allow: 'opened on purpose', delay: 'held', summarize: 'digest' }

/** A till receipt for a cleared inbox: what you held, what it saved, what it earned. */
export default function Receipt({ lines }: { lines: ReceiptLine[] }) {
  const reduce = useReducedMotion()
  const saved = lines.filter((l) => l.choice !== 'allow').reduce((a, l) => a + l.saved, 0)
  const xp = lines.reduce((a, l) => a + l.xp, 0)
  const opened = lines.filter((l) => l.choice === 'allow').length
  const now = new Date()
  const text = `Parallel receipt · ${lines.length} pings triaged · ${saved.toFixed(1)} focus min protected · ${opened} opened on purpose · +${xp} XP`

  async function share() {
    try {
      if (navigator.share) await navigator.share({ title: 'My Parallel receipt', text })
      else { await navigator.clipboard.writeText(text); toast('Receipt copied') }
    } catch { /* share sheet dismissed */ }
  }

  return (
    <div className="flex flex-col items-center">
      <div className="w-full max-w-[340px] h-3 rounded-full bg-surface-2 shadow-inner" aria-hidden />
      <div className="w-full max-w-[320px] overflow-hidden -mt-1.5">
        <motion.div initial={reduce ? false : { y: '-100%' }} animate={{ y: 0 }} transition={{ duration: 1.6, ease: [0.3, 0.7, 0.4, 1] }}
          className="bg-field text-field-ink px-5 pt-6 pb-8 font-mono text-[13px] leading-relaxed"
          style={{ clipPath: 'polygon(0 0,100% 0,100% calc(100% - 8px),95% 100%,90% calc(100% - 8px),85% 100%,80% calc(100% - 8px),75% 100%,70% calc(100% - 8px),65% 100%,60% calc(100% - 8px),55% 100%,50% calc(100% - 8px),45% 100%,40% calc(100% - 8px),35% 100%,30% calc(100% - 8px),25% 100%,20% calc(100% - 8px),15% 100%,10% calc(100% - 8px),5% 100%,0 calc(100% - 8px))' }}>
          <p className="text-center font-bold text-base tracking-widest">PARALLEL</p>
          <p className="text-center">ATTENTION MART · OPEN 24/7</p>
          <p className="text-center opacity-70">{now.toLocaleDateString()} {now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</p>
          <p className="my-2 opacity-50">--------------------------------</p>
          <ul>
            {lines.map((l, i) => (
              <li key={i} className="flex justify-between gap-3">
                <span className="truncate">{l.app.toUpperCase()} <span className="opacity-60">{CHOICE[l.choice] ?? l.choice}</span></span>
                <span className="tabular-nums shrink-0">{l.choice === 'allow' ? '  0.0' : `-${l.saved.toFixed(1)}`}</span>
              </li>
            ))}
          </ul>
          <p className="my-2 opacity-50">--------------------------------</p>
          <p className="flex justify-between font-bold"><span>FOCUS PROTECTED</span><span className="tabular-nums">{saved.toFixed(1)} MIN</span></p>
          <p className="flex justify-between"><span>OPENED ON PURPOSE</span><span>{opened}</span></p>
          <p className="flex justify-between"><span>XP EARNED</span><span>+{xp}</span></p>
          <p className="my-2 opacity-50">--------------------------------</p>
          <p className="text-center">NO REELS WERE HARMED</p>
          <p className="text-center opacity-70">thank you for shopping at your own brain</p>
          <div className="mt-3 h-10 mx-auto w-48" aria-hidden
            style={{ background: 'repeating-linear-gradient(90deg,#18191b 0 2px,transparent 2px 4px,#18191b 4px 5px,transparent 5px 8px,#18191b 8px 11px,transparent 11px 12px)' }} />
        </motion.div>
      </div>
      <button onClick={share} className="btn btn-calm mt-4 !py-2"><Share2 size={16} /> Share receipt</button>
    </div>
  )
}
