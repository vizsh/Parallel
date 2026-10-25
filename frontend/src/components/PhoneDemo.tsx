import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Bell, CalendarClock, DoorOpen, Moon, Pause, Play, RotateCcw, ScanSearch, ShieldCheck, Sparkles } from 'lucide-react'
import { PanelArt, PH, PW } from './ComicArt'
import { buildFutures } from '@/lib/future'
import { scenarioById, type Btn, type Scenario, type SimStep } from '@/lib/scenarios'

/*
 * A self-playing phone. Each scenario (lib/scenarios.ts) is a list of steps; every step fully describes
 * what's on screen, and this component animates between them. Used by /demo, the Simulations page and
 * the recorded videos (/demo?scenario=<id>&clean=1).
 */

const BTN: Record<Btn['kind'], string> = {
  peek: 'bg-[#ffd23f]', hold: 'bg-chaos', open: 'bg-black/10', digest: 'bg-ink text-field-ink', reply: 'bg-calm', calm: 'bg-calm',
}
const TONE = { hold: 'PARALLEL', shield: 'PARALLEL · SHIELD', guard: 'PARALLEL · NIGHT', digest: 'PARALLEL · DIGEST' }

function Lines({ n = 9, dark = false }: { n?: number; dark?: boolean }) {
  return <div className="flex flex-col gap-2">{Array.from({ length: n }).map((_, i) => <span key={i} className={`h-2 rounded-full ${dark ? 'bg-white/10' : 'bg-white/15'}`} style={{ width: `${55 + ((i * 37) % 45)}%` }} />)}</div>
}

function AppScreen({ s, sc }: { s: SimStep; sc: Scenario }) {
  if (s.screen === 'reels') {
    return (
      <div className="absolute inset-0 overflow-hidden bg-black">
        <motion.div className="flex flex-col" animate={{ y: [0, -560] }} transition={{ repeat: Infinity, duration: 3.2, ease: 'linear' }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-[280px] relative" style={{ background: ['linear-gradient(160deg,#ff4a1f,#8b5cf6)', 'linear-gradient(160deg,#3ee6b5,#4b5bd6)', 'linear-gradient(160deg,#ffd23f,#ff4a1f)', 'linear-gradient(160deg,#dd2a7b,#18191b)'][i % 4] }}>
              <span className="absolute right-3 bottom-16 text-white text-lg">♥</span><span className="absolute right-3 bottom-10 text-white/80 text-[10px]">{[12, 88, 4, 31][i % 4]}k</span>
              <span className="absolute left-3 bottom-6 h-2 w-28 rounded-full bg-white/40" />
            </div>
          ))}
        </motion.div>
      </div>
    )
  }
  if (s.screen === 'lock') {
    const [h, m] = s.clock.split(':')
    return (
      <div className="absolute inset-0 bg-gradient-to-b from-[#1b1f3a] to-[#0b0b0c] flex flex-col items-center pt-20">
        <p className="text-white/70 text-[12px]">{+h < 8 ? 'Sunday, 27 October' : 'Saturday, 26 October'}</p>
        <p className="text-white text-6xl font-light tabular-nums mt-1">{h}:{m}</p>
      </div>
    )
  }
  const code = s.screen === 'code'
  return (
    <div className={`absolute inset-0 pt-12 px-5 ${code ? 'bg-[#0f1115]' : s.screen === 'edit' ? 'bg-[#16171b]' : 'bg-[#121316]'}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[12px] font-semibold truncate">{sc.app.title}</p>
        {s.focus && <motion.span className="shrink-0 text-[11px] px-2 py-0.5 rounded-full bg-calm/20 text-calm tabular-nums" animate={{ opacity: [1, 0.6, 1] }} transition={{ repeat: Infinity, duration: 2 }}>{s.focus}</motion.span>}
      </div>
      {s.banner && (
        <p className={`mt-3 text-[11px] font-bold rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 ${s.banner.tone === 'deadline' ? 'bg-chaos/20 text-chaos' : 'bg-[#8b5cf6]/25 text-[#c4b5fd]'}`}>
          <CalendarClock size={12} aria-hidden /> {s.banner.text}
        </p>
      )}
      {code ? (
        <div className="mt-4 font-mono text-[10px] leading-relaxed">
          {['async function retry(charge) {', '  const key = charge.idempotencyKey', '  if (await seen(key)) return cached(key)', '  // bug: retry ran before the lock', '  await lock(key)', '  return gateway.charge(charge)', '}'].map((l, i) => (
            <p key={i} className={i === 3 ? 'text-[#ffd23f]' : i % 2 ? 'text-[#7fd3ff]' : 'text-white/70'}><span className="text-white/25 mr-2">{i + 41}</span>{l}</p>
          ))}
          <div className="mt-4"><Lines n={5} dark /></div>
        </div>
      ) : s.screen === 'edit' ? (
        <div className="mt-4">
          <div className="aspect-video rounded-lg" style={{ background: 'linear-gradient(135deg,#ff4a1f,#ffd23f 45%,#4b5bd6)' }}>
            <p className="p-3 text-[22px] font-black text-white drop-shadow">I TRIED<br />IT FOR 30 DAYS</p>
          </div>
          <div className="mt-3 h-10 rounded bg-white/5 flex items-end gap-0.5 p-1">{Array.from({ length: 36 }).map((_, i) => <span key={i} className="flex-1 bg-calm/50" style={{ height: `${20 + ((i * 53) % 80)}%` }} />)}</div>
          <div className="mt-3"><Lines n={3} /></div>
        </div>
      ) : (
        <>
          <p className="mt-4 text-[17px] font-bold leading-tight">{sc.app.heading}</p>
          <div className="mt-4"><Lines /></div>
          <div className="mt-5 rounded-xl bg-white/5 p-3"><Lines n={4} /></div>
        </>
      )}
    </div>
  )
}

/** The phone itself, showing one step. */
export function PhoneScreen({ sc, step }: { sc: Scenario; step: number }) {
  const s = sc.steps[step]
  const f = useMemo(() => buildFutures(sc.input), [sc])
  const night = s.screen === 'lock' || s.screen === 'reels'
  return (
    <div className="relative w-[280px] h-[580px] rounded-[46px] bg-[#0b0b0c] p-[10px] shadow-[0_30px_80px_-20px_rgba(0,0,0,.8)] ring-1 ring-white/10 shrink-0">
      <motion.div className="relative w-full h-full rounded-[36px] overflow-hidden bg-[#121316] text-ink"
        animate={s.shake ? { x: [0, -3, 3, -2, 2, 0] } : { x: 0 }} transition={{ duration: 0.45, delay: 0.3 }}>
        <AppScreen s={s} sc={sc} />
        <motion.div className="absolute inset-0 bg-black pointer-events-none z-[5]" animate={{ opacity: s.dim ? 0.55 : 0 }} transition={{ duration: 0.8 }} />
        {/* status bar */}
        <div className={`absolute top-0 inset-x-0 z-30 flex items-center justify-between px-6 pt-3 text-[11px] font-semibold ${night ? 'text-white' : ''}`}>
          <span className="tabular-nums">{s.clock}</span><span className="w-20 h-5 rounded-full bg-black absolute left-1/2 -translate-x-1/2 top-2" /><span>5G ▮▮▮</span>
        </div>

        <div className="absolute left-3 right-3 top-9 z-10 flex flex-col gap-1.5">
          <AnimatePresence>
            {s.notif && (
              <motion.div key={`n-${s.notif.app}`} layout initial={{ y: -140 }} animate={{ y: 0 }} exit={{ y: 300, x: 70, scale: 0.15, opacity: 0.4 }}
                transition={{ type: 'spring', stiffness: 260, damping: 24 }} className="relative">
                {(s.notif.count ?? 0) > 1 && <><span className="absolute inset-x-3 -bottom-2 h-4 rounded-2xl bg-[#2a2c31]/70" /><span className="absolute inset-x-6 -bottom-3.5 h-4 rounded-2xl bg-[#2a2c31]/40" /></>}
                <div className="relative rounded-2xl bg-[#2a2c31]/95 backdrop-blur p-3 shadow-xl">
                  <div className="flex items-center gap-2 text-[11px] text-muted"><span className="w-5 h-5 rounded-md" style={{ background: s.notif.tint }} /> {s.notif.app} · now
                    {(s.notif.count ?? 0) > 1 && <motion.span key={s.notif.count} initial={{ scale: 1.6 }} animate={{ scale: 1 }} className="ml-auto rounded-full bg-chaos text-field-ink px-1.5 font-bold">{s.notif.count}</motion.span>}
                  </div>
                  <p className="mt-1 text-[13px] font-semibold leading-snug">{s.notif.text}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {s.pass && (
              <motion.div key="pass" initial={{ y: -120, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0, y: -60 }} className="rounded-2xl bg-[#2a2c31]/95 p-3 shadow-xl ring-2 ring-calm">
                <div className="flex items-center gap-2 text-[11px] text-muted"><span className="w-5 h-5 rounded-md" style={{ background: s.pass.tint }} /> {s.pass.app} · now</div>
                <p className="mt-1 text-[13px] font-semibold">{s.pass.text}</p>
                <p className="mt-1 text-[11px] text-calm font-bold flex items-center gap-1"><ShieldCheck size={12} aria-hidden /> {s.pass.note}</p>
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence mode="popLayout">
            {s.strip && (
              <motion.div key={`strip-${s.strip.title}`} initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className={`rounded-2xl p-3 shadow-xl ${s.strip.tone === 'guard' ? 'bg-[#2b2350] text-white' : 'bg-field text-field-ink'}`}>
                  <p className="text-[10px] font-black tracking-widest flex items-center gap-1">
                    {s.strip.tone === 'guard' ? <Moon size={11} /> : s.strip.tone === 'shield' ? <ScanSearch size={11} /> : null}{TONE[s.strip.tone]}
                  </p>
                  <p className="text-[13px] font-bold leading-snug mt-0.5">{s.strip.title}</p>
                  <p className="text-[11px] opacity-70">{s.strip.sub}</p>
                  {s.strip.tags && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {s.strip.tags.map((t) => <motion.span key={t} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.4, type: 'spring' }} className="text-[10px] font-bold rounded-full bg-[#ffd23f] text-field-ink px-2 py-0.5">🔍 {t}</motion.span>)}
                    </div>
                  )}
                  {s.strip.buttons && (
                    <div className="mt-2 grid gap-1.5 text-[11px] font-bold" style={{ gridTemplateColumns: `repeat(${s.strip.buttons.length}, 1fr)` }}>
                      {s.strip.buttons.map((b) => (
                        <motion.span key={b.label} animate={s.strip?.press === b.label ? { scale: [1, 0.88, 1] } : {}} transition={{ delay: 0.6, duration: 0.35 }}
                          className={`rounded-lg py-1.5 text-center text-field-ink flex items-center justify-center gap-1 ${BTN[b.kind]} ${s.strip?.press === b.label ? 'ring-2 ring-ink' : ''}`}>
                          {b.kind === 'peek' && <DoorOpen size={12} />}{b.label}
                        </motion.span>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {s.reply && (
              <motion.div key="reply" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-2xl bg-calm text-field-ink p-3 shadow-xl">
                <p className="text-[10px] font-black tracking-widest">AUTO-REPLY DRAFT</p>
                <p className="text-[13px] font-semibold mt-0.5">“{s.reply}”</p>
                <p className="text-[11px] opacity-70 mt-1">Draft only · you tap send</p>
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {s.digest && (
              <motion.div key={`d-${s.digest.title}`} initial={{ y: -120, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }} transition={{ type: 'spring', stiffness: 240, damping: 24 }}
                className="rounded-2xl bg-field text-field-ink p-3 shadow-xl">
                <p className="text-[10px] font-black tracking-widest flex items-center gap-1"><Bell size={11} /> PARALLEL · CHECKPOINT</p>
                <p className="text-[13px] font-bold mt-0.5">{s.digest.title}</p>
                <p className="text-[11px] opacity-70">{s.digest.sub}</p>
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {s.text && (
              <motion.div key={`t-${s.text.at}`} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ delay: 0.7 }} className="rounded-2xl bg-[#2a2c31]/95 p-3 shadow-xl">
                <p className="text-[11px] text-muted flex items-center gap-1.5"><span className="w-5 h-5 rounded-full bg-gradient-to-br from-chaos to-calm grid place-items-center text-[10px] font-black text-field-ink">Y</span> You · from {s.text.at}</p>
                {s.text.lines.map((l, i) => <motion.p key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 + i * 0.5 }} className="mt-1 text-[13px]">{l}</motion.p>)}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* peeking through the doors */}
        <AnimatePresence>
          {s.peek && (
            <motion.div key={`peek-${s.peek}`} className="absolute left-9 right-9 bottom-5 z-20 rounded-2xl overflow-hidden bg-black/85 p-2 shadow-2xl"
              initial={{ y: 260, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 260, opacity: 0 }} transition={{ type: 'spring', stiffness: 220, damping: 24, delay: 0.5 }}>
              <p className={`text-[10px] font-black tracking-widest mb-1 ${s.peek === 'a' ? 'text-chaos' : 'text-calm'}`}>{s.peek === 'a' ? 'DOOR A · THE SCROLLFATHER' : 'DOOR B · MAIN CHARACTER'}</p>
              <motion.svg key={s.peek} viewBox={`0 0 ${PW} ${PH}`} className="w-full h-auto block rounded-lg" initial={{ rotateY: -90 }} animate={{ rotateY: 0 }} transition={{ duration: 0.5, delay: 0.7 }}>
                <PanelArt p={(s.peek === 'a' ? f.a : f.b).panels[3]} f={sc.input} uid={`demo-${sc.id}-${s.peek}`} />
              </motion.svg>
            </motion.div>
          )}
        </AnimatePresence>

        {/* jar pill and aura */}
        <div className="absolute left-0 right-0 bottom-5 z-10 flex flex-col items-center gap-1.5">
          <AnimatePresence>
            {s.aura && (
              <motion.span key="aura" initial={{ scale: 0, rotate: -12 }} animate={{ scale: 1, rotate: -3 }} exit={{ opacity: 0 }} transition={{ delay: 0.8, type: 'spring', stiffness: 300, damping: 12 }}
                className="text-[12px] font-black bg-[#ffd23f] text-field-ink px-3 py-1 border-2 border-field-ink shadow-[3px_3px_0_#000] flex items-center gap-1"><Sparkles size={12} /> {s.aura}</motion.span>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {s.jar && !s.peek && (
              <motion.div key="jar" className="flex items-center gap-2 rounded-full bg-chaos/90 text-field-ink px-3 py-2 text-[12px] font-bold"
                initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }} transition={{ delay: 0.35 }}>
                <span className="w-4 h-5 rounded-b-md rounded-t-sm border-2 border-field-ink relative overflow-hidden"><motion.span className="absolute inset-x-0 bottom-0 bg-field-ink/70" initial={{ height: '20%' }} animate={{ height: '60%' }} transition={{ delay: 0.6 }} /></span>
                {s.jar}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-24 h-1 rounded-full bg-white/40 z-30" />
      </motion.div>
    </div>
  )
}

/** Autoplaying scenario with captions, a scrubber and play/pause. */
export default function PhoneDemo({ scenario, big = false, controls = true }: { scenario?: string | null; big?: boolean; controls?: boolean }) {
  const reduce = useReducedMotion()
  const sc = scenarioById(scenario)
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(!reduce)
  const [shown, setShown] = useState(sc.id)
  if (shown !== sc.id) { setShown(sc.id); setStep(0) } // a new scenario starts from the top
  useEffect(() => {
    if (!playing) return
    const t = setTimeout(() => setStep((s) => (s + 1) % sc.steps.length), sc.steps[step].ms)
    return () => clearTimeout(t)
  }, [step, playing, sc])
  const cur = sc.steps[step]
  return (
    <div className={`flex flex-col items-center gap-5 ${big ? 'lg:flex-row lg:items-center lg:gap-14' : ''}`}>
      <PhoneScreen sc={sc} step={step} />
      <div className={`w-full ${big ? 'max-w-md' : 'max-w-[320px]'}`}>
        <AnimatePresence mode="wait">
          <motion.p key={`${sc.id}-${step}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className={`${big ? 'text-2xl' : 'text-[1.05rem]'} font-semibold leading-snug min-h-[3.2em]`} aria-live="polite">
            {cur.caption}
          </motion.p>
        </AnimatePresence>
        <div className="mt-4 flex items-center gap-1.5" role="tablist" aria-label="Simulation steps">
          {sc.steps.map((s, i) => (
            <button key={i} role="tab" aria-selected={i === step} aria-label={`Step ${i + 1}: ${s.caption}`} onClick={() => setStep(i)}
              className="h-1.5 flex-1 rounded-full bg-white/15 overflow-hidden">
              <motion.span key={`${sc.id}-${i}-${step}-${playing}`} className="block h-full bg-calm" initial={{ width: i < step ? '100%' : '0%' }}
                animate={{ width: i < step ? '100%' : i === step ? (playing ? '100%' : '50%') : '0%' }} transition={{ duration: i === step && playing ? s.ms / 1000 : 0, ease: 'linear' }} />
            </button>
          ))}
        </div>
        {controls && (
          <div className="mt-3 flex gap-3 small text-muted">
            <button onClick={() => setPlaying((p) => !p)} className="flex items-center gap-1 hover:text-ink">{playing ? <><Pause size={14} /> pause</> : <><Play size={14} /> play</>}</button>
            <button onClick={() => { setStep(0); setPlaying(true) }} className="flex items-center gap-1 hover:text-ink"><RotateCcw size={14} /> restart</button>
          </div>
        )}
      </div>
    </div>
  )
}
