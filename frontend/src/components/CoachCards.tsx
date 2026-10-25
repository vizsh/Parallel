import { motion } from 'motion/react'
import { CalendarClock, Check, Copy, Footprints, Moon, Share2, Sparkles, Undo2, X, Zap } from 'lucide-react'
import Xray from './Xray'
import { toast } from '@/lib/hooks'
import type { Card, Done, PingCardT, ReceiptCardT } from '@/lib/coach'

/*
 * Rich cards the coach answers with. They reuse the app's visual language (receipts, jar, fate meter,
 * X-ray chips) so a chat reply looks like the rest of Parallel, not a wall of text.
 */

const REC: Record<string, { label: string; cls: string }> = {
  allow: { label: 'Twin says: let it through', cls: 'bg-calm text-field-ink' },
  delay: { label: 'Twin says: hold it', cls: 'bg-chaos text-field-ink' },
  summarize: { label: 'Twin says: digest', cls: 'bg-ink text-field-ink' },
  ask: { label: 'Your call', cls: 'bg-surface text-ink' },
}

function Shell({ children, tone = 'base' }: { children: React.ReactNode; tone?: 'base' | 'paper' | 'calm' | 'chaos' }) {
  const cls = tone === 'paper' ? 'bg-field text-field-ink' : tone === 'calm' ? 'bg-calm/10 ring-1 ring-calm/40' : tone === 'chaos' ? 'bg-chaos/10 ring-1 ring-chaos/40' : 'bg-bg/70 ring-1 ring-white/10'
  return <motion.div initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 26 }} className={`rounded-2xl p-3.5 ${cls}`}>{children}</motion.div>
}

function PingCard({ c }: { c: PingCardT }) {
  const x = (m: number) => `${Math.min(100, (m / Math.max(c.p90 * 1.15, 10)) * 100)}%`
  const r = REC[c.rec] ?? REC.ask
  return (
    <Shell>
      <p className="small text-muted">{c.app} · {c.label}</p>
      <p className="font-medium leading-snug">{c.text}</p>
      <div className="mt-2 flex items-end gap-3">
        <p className="text-3xl font-semibold tabular-nums text-chaos whitespace-nowrap">−{c.cost}<span className="text-sm font-normal text-muted"> min</span></p>
        <p className="small text-muted pb-1">{Math.round(c.p_rabbit * 100)}% rabbit hole · held ≈ {c.hold_cost} min</p>
      </div>
      <div className="relative mt-2 h-2 rounded-full bg-surface-2" aria-label={`80% range ${c.p10} to ${c.p90} minutes`}>
        <span className="absolute inset-y-0 rounded-full bg-chaos/50" style={{ left: x(c.p10), width: `calc(${x(c.p90)} - ${x(c.p10)})` }} />
        <span className="absolute top-1/2 -translate-y-1/2 w-3 h-3 -ml-1.5 rounded-full bg-chaos ring-2 ring-bg" style={{ left: x(c.p50) }} />
      </div>
      <p className="text-[11px] text-muted mt-1">range {c.p10}–{c.p90} min · {Math.round(c.confidence * 100)}% confident</p>
      <p className="mt-2 small"><span className={`px-2 py-0.5 mr-1.5 rounded font-medium ${r.cls}`}>{r.label}</span><span className="text-muted">{c.why}</span></p>
      {c.xray.length > 0 && <div className="mt-2"><Xray tags={c.xray} usually={c.usually} guard={c.guard} compact /></div>}
    </Shell>
  )
}

function ReceiptCard({ c }: { c: ReceiptCardT }) {
  const now = new Date()
  const text = `Parallel ${c.title.toLowerCase()} receipt · ${c.lost} focus min lost · ${c.protected} protected · ${c.held} held · aura ${c.aura >= 0 ? '+' : ''}${c.aura}`
  async function share() {
    try { if (navigator.share) await navigator.share({ title: 'My Parallel receipt', text }); else { await navigator.clipboard.writeText(text); toast('Receipt copied') } } catch { /* dismissed */ }
  }
  const line = <p className="my-1.5 opacity-40 overflow-hidden whitespace-nowrap">--------------------------------------------</p>
  return (
    <Shell tone="paper">
      <div className="font-mono text-[12px] leading-relaxed">
        <p className="text-center font-bold tracking-widest">PARALLEL · ATTENTION RECEIPT</p>
        <p className="text-center opacity-70">{c.title.toUpperCase()} · {now.toLocaleDateString()}</p>
        {line}
        {c.rows.length === 0 && <p className="text-center opacity-70">no pings opened. iconic.</p>}
        {c.rows.map((r) => (
          <p key={r.app} className="flex justify-between gap-2"><span className="truncate">{(r.app ?? 'Other').toUpperCase()} <span className="opacity-60">×{r.opens}{r.held ? ` · ${r.held} held` : ''}</span></span><span className="tabular-nums shrink-0">{r.lost > 0 ? `-${r.lost.toFixed(1)}` : '—'}</span></p>
        ))}
        {line}
        <p className="flex justify-between font-bold"><span>FOCUS LOST</span><span className="tabular-nums">{c.lost} MIN</span></p>
        <p className="flex justify-between"><span>PROTECTED</span><span className="tabular-nums">{c.protected} MIN</span></p>
        <p className="flex justify-between"><span>PINGS · OPENED · HELD</span><span>{c.pings} · {c.opened} · {c.held}</span></p>
        <p className="flex justify-between"><span>AURA</span><span>{c.aura >= 0 ? '+' : ''}{c.aura}</span></p>
        {c.priciest && <><p className="mt-1.5 opacity-60">PRICIEST PING</p><p>{c.priciest.app} at {c.priciest.at}: {c.priciest.minutes} min off {c.priciest.task.toLowerCase()}</p></>}
        {c.period === 'week' && (
          <>
            {line}
            {c.archetype && <p className="flex justify-between"><span>MOSTLY</span><span>{c.archetype.toUpperCase()}</span></p>}
            {c.best_day && <p className="flex justify-between"><span>BEST DAY</span><span>{c.best_day.day.toUpperCase()} · {c.best_day.minutes} MIN</span></p>}
            {c.longest_block != null && <p className="flex justify-between"><span>LONGEST BLOCK</span><span>{c.longest_block} MIN</span></p>}
            {c.change != null && <p className="flex justify-between"><span>VS LAST WEEK</span><span>{c.change > 0 ? '+' : ''}{c.change} MIN LOST</span></p>}
          </>
        )}
        {c.period === 'app' && (
          <>{line}<p className="flex justify-between"><span>RABBIT HOLES</span><span>{c.rabbit_pct}% OF OPENS</span></p><p className="flex justify-between"><span>LONGEST ESCAPE</span><span>{c.longest} MIN</span></p></>
        )}
        {line}
        <p className="text-center">NO REELS WERE HARMED*</p>
        <p className="text-center opacity-60 text-[10px]">*some reels were harmed</p>
        <div className="mt-2 h-7 mx-auto w-40" aria-hidden style={{ background: 'repeating-linear-gradient(90deg,#18191b 0 2px,transparent 2px 4px,#18191b 4px 5px,transparent 5px 8px,#18191b 8px 11px,transparent 11px 12px)' }} />
      </div>
      <button onClick={share} className="mt-2 small font-semibold flex items-center gap-1.5 mx-auto"><Share2 size={14} /> Share receipt</button>
    </Shell>
  )
}

const PLAN_ICON = { focus: Zap, check: Check, light: Footprints, wind: Moon }

export function CardView({ c, onAsk, onForget }: { c: Card; onAsk: (q: string) => void; onForget: (id: number) => void }) {
  switch (c.type) {
    case 'ping': return <PingCard c={c} />
    case 'receipt': return <ReceiptCard c={c} />
    case 'compare': {
      const max = Math.max(...c.items.map((i) => i.cost), 1)
      return (
        <Shell>
          {c.items.map((i, n) => (
            <div key={i.category} className="mb-2">
              <p className="flex justify-between small"><span className="font-semibold">{i.app}</span><span className="tabular-nums">{i.cost} min · {Math.round(i.p_rabbit * 100)}% rabbit hole</span></p>
              <div className="h-2.5 rounded-full bg-surface-2 overflow-hidden"><motion.div className={`h-full ${n === 0 ? 'bg-chaos' : 'bg-calm'}`} initial={{ width: 0 }} animate={{ width: `${(i.cost / max) * 100}%` }} transition={{ duration: 0.7 }} /></div>
            </div>
          ))}
          <p className="small font-semibold mt-1">{c.verdict}</p>
        </Shell>
      )
    }
    case 'plan':
      return (
        <Shell>
          {c.deadline && <p className="mb-2 small font-semibold text-chaos flex items-center gap-1.5"><CalendarClock size={14} /> {c.deadline.title} in {c.deadline.days_left} day(s): stricter mode</p>}
          <ol className="relative flex flex-col gap-2.5 pl-5">
            <span className="absolute left-[7px] top-1 bottom-1 w-px bg-white/15" aria-hidden />
            {c.items.map((i, n) => {
              const I = PLAN_ICON[i.kind] ?? Check
              return (
                <motion.li key={n} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: n * 0.07 }} className="relative">
                  <span className={`absolute -left-5 top-0.5 w-3.5 h-3.5 rounded-full grid place-items-center ${i.kind === 'focus' ? 'bg-calm' : i.kind === 'wind' ? 'bg-[#8b5cf6]' : i.kind === 'light' ? 'bg-[#ffd23f]' : 'bg-ink'}`}><I size={9} className="text-field-ink" /></span>
                  <p className="small"><span className="font-semibold tabular-nums mr-1.5">{i.at}</span>{i.label}</p>
                </motion.li>
              )
            })}
            {c.items.length === 0 && <li className="small text-muted">Nothing left on today’s plan. Rest counts.</li>}
          </ol>
        </Shell>
      )
    case 'jar':
      return (
        <Shell>
          <div className="flex items-center gap-3">
            <span className="relative w-10 h-12 rounded-b-xl rounded-t-md border-2 border-ink/70 overflow-hidden shrink-0" aria-hidden>
              <motion.span className="absolute inset-x-0 bottom-0 bg-chaos/80" initial={{ height: 0 }} animate={{ height: `${Math.min(90, 15 + c.count * 9)}%` }} transition={{ duration: 0.8 }} />
            </span>
            <div><p className="font-semibold">{c.count} held</p><p className="small text-muted">{c.next ? `next batch at ${c.next}` : 'nothing waiting'}</p></div>
          </div>
          <ul className="mt-2 flex flex-col gap-1">{c.groups.map((g) => <li key={g.app} className="small flex justify-between gap-2"><span className="truncate"><span className="font-medium">{g.app}</span> <span className="text-muted">· {g.sample}</span></span><span className="shrink-0 text-muted">×{g.n}</span></li>)}</ul>
        </Shell>
      )
    case 'fingerprint': {
      const max = Math.max(...c.hourly, 0.01)
      return (
        <Shell>
          <div className="flex items-end gap-[2px] h-20" role="img" aria-label={`Focus by hour; best window ${c.best.start} to ${c.best.end}`}>
            {c.hourly.map((v, h) => (
              <motion.span key={h} initial={{ height: 0 }} animate={{ height: `${(v / max) * 100}%` }} transition={{ delay: h * 0.015 }}
                className={`flex-1 rounded-t-sm ${h >= c.best.start && h < c.best.end ? 'bg-calm' : Math.floor(c.now) === h ? 'bg-chaos' : 'bg-white/20'}`} />
            ))}
          </div>
          <p className="flex justify-between text-[10px] text-muted mt-1"><span>12a</span><span>6a</span><span>12p</span><span>6p</span><span>11p</span></p>
          <p className="small mt-1"><span className="text-calm font-semibold">■ golden hours</span> · <span className="text-chaos font-semibold">■ now</span> · energy dips after {c.onset}</p>
        </Shell>
      )
    }
    case 'aura': {
      const pos = c.fate ? ((c.fate.value + 1) / 2) * 100 : 50
      return (
        <Shell>
          <div className="flex items-center justify-between"><p className="text-3xl font-semibold tabular-nums">{c.aura?.week ?? 0}</p><span className="small font-bold px-2 py-1 bg-[#ffd23f] text-field-ink border-2 border-field-ink -rotate-2"><Sparkles size={12} className="inline -mt-0.5" /> {c.aura?.tier}</span></div>
          <div className="relative mt-3 h-2.5 rounded-full" style={{ background: 'linear-gradient(90deg, var(--color-chaos), #ffd23f 50%, var(--color-calm))' }}>
            <motion.span className="absolute top-1/2 w-5 h-5 -mt-2.5 -ml-2.5 rounded-full bg-ink border-4 border-bg" initial={{ left: '50%' }} animate={{ left: `${pos}%` }} transition={{ type: 'spring', stiffness: 90, damping: 12 }} />
          </div>
          <p className="flex justify-between text-[11px] mt-1"><span className="text-chaos">Scrollfather</span><span className="font-semibold">{c.fate?.label}</span><span className="text-calm">Main Character</span></p>
        </Shell>
      )
    }
    case 'evidence':
      return <Shell tone="chaos"><ul className="grid grid-cols-2 gap-2">{c.facts.map((f) => <li key={f.label}><p className="text-xl font-semibold tabular-nums">{f.value}</p><p className="text-[11px] text-muted leading-tight">{f.label}</p></li>)}</ul></Shell>
    case 'xray':
      return (
        <Shell>
          <p className="small text-muted">{c.label} · X-ray</p>
          <p className="font-medium leading-snug">“{c.text}”</p>
          <div className="mt-2"><Xray tags={c.tags} usually={c.usually} /></div>
          <p className="mt-2 small font-semibold">{c.verdict}</p>
        </Shell>
      )
    case 'memory':
      return (
        <Shell>
          <ul className="flex flex-col gap-1.5">{c.items.map((i) => <li key={i.label} className="small flex justify-between gap-3"><span className="text-muted">{i.label}</span><span className="text-right">{i.value}</span></li>)}</ul>
          {c.told.length > 0 && <>
            <p className="small text-muted mt-3 mb-1">You told me</p>
            <ul className="flex flex-col gap-1">{c.told.map((m) => <li key={m.id} className="small flex items-center justify-between gap-2 rounded-lg bg-surface-2 px-2.5 py-1.5"><span>{m.kind === 'commitment' ? '🤝 ' : ''}{m.text}</span><button onClick={() => onForget(m.id)} aria-label={`Forget: ${m.text}`} className="text-muted hover:text-chaos"><X size={14} /></button></li>)}</ul>
          </>}
        </Shell>
      )
    case 'draft':
      return (
        <Shell tone="calm">
          <p className="small text-muted">Draft for {c.app}</p>
          <p className="font-medium mt-1">“{c.text}”</p>
          <button onClick={async () => { try { await navigator.clipboard.writeText(c.text); toast('Copied. Paste it in the chat.') } catch { /* blocked */ } }} className="mt-2 small font-semibold flex items-center gap-1.5"><Copy size={14} /> Copy</button>
          <p className="text-[11px] text-muted mt-1">{c.note}</p>
        </Shell>
      )
    case 'commands':
      return (
        <Shell>
          <ul className="flex flex-col gap-1">{c.items.map((i) => <li key={i.cmd}><button onClick={() => onAsk(i.cmd.replace(/\s.*$/, ''))} className="w-full text-left small flex gap-2 hover:text-calm"><code className="font-mono text-calm shrink-0 w-20">{i.cmd}</code><span className="text-muted">{i.desc}</span></button></li>)}</ul>
        </Shell>
      )
  }
}

/** “Done” line after an action, with Undo. */
export function DoneLine({ d, onUndo }: { d: Done; onUndo?: () => void }) {
  return (
    <motion.p initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="small flex items-center gap-2 rounded-xl bg-calm/15 text-calm px-3 py-2">
      <Check size={14} className="shrink-0" /> <span className="flex-1">{d.message}</span>
      {d.undo && onUndo && <button onClick={onUndo} className="font-semibold flex items-center gap-1 hover:underline"><Undo2 size={13} /> Undo</button>}
    </motion.p>
  )
}
