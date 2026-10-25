import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Bell, DoorOpen, Pause, Play, RotateCcw } from 'lucide-react'
import { PanelArt, PH, PW } from './ComicArt'
import { buildFutures, type FutureInput } from '@/lib/future'

/*
 * A self-playing phone: you're studying, a ping lands, Parallel scores it on top of the notification,
 * you peek through the doors, hold it, and it arrives later in a calm batch. Built for the landing,
 * the inbox and screen recording (open /demo full screen and record).
 */

const SAMPLE: FutureInput = { category: 'social_like', app: 'Instagram', text: 'aarav_07 and 12 others liked your post', task: 'DBMS notes', hour: 11.75, cost: 18.4, p10: 4, p90: 31, holdCost: 0.7 }

const STEPS = [
  { ms: 2200, caption: 'You’re deep in DBMS notes. Focus timer running.' },
  { ms: 2200, caption: 'A ping lands. Normally this is where 18 minutes vanish.' },
  { ms: 2800, caption: 'Parallel scores it on top of the notification, before you tap.' },
  { ms: 2600, caption: 'Peek: Door A. If you tap, the twin sees The Scrollfather.' },
  { ms: 2600, caption: 'Door B. If you hold, Main Character. You choose: hold.' },
  { ms: 2400, caption: 'It drops into the jar until your next checkpoint. Focus keeps going.' },
  { ms: 3400, caption: 'At 1:00 PM the held pings arrive together, and future you texts back.' },
]

function Finger({ x, y, show }: { x: string; y: string; show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.span aria-hidden className="absolute z-30 w-9 h-9 rounded-full bg-white/70 border-2 border-white shadow-lg pointer-events-none"
          style={{ left: x, top: y }} initial={{ opacity: 0, scale: 1.6 }} animate={{ opacity: [0, 1, 1, 0.9], scale: [1.6, 1, 0.8, 1] }} exit={{ opacity: 0 }}
          transition={{ duration: 0.9, times: [0, 0.4, 0.7, 1] }} />
      )}
    </AnimatePresence>
  )
}

function Lines({ n = 9 }: { n?: number }) {
  return <div className="flex flex-col gap-2">{Array.from({ length: n }).map((_, i) => <span key={i} className="h-2 rounded-full bg-white/15" style={{ width: `${55 + ((i * 37) % 45)}%` }} />)}</div>
}

/** The phone itself. `step` drives every scene; it's controlled so a page can autoplay or scrub it. */
export function PhoneScreen({ step }: { step: number }) {
  const f = useMemo(() => buildFutures(SAMPLE), [])
  const clock = step >= 6 ? '1:00' : '11:45'
  const held = step >= 5
  return (
    <div className="relative w-[280px] h-[580px] rounded-[46px] bg-[#0b0b0c] p-[10px] shadow-[0_30px_80px_-20px_rgba(0,0,0,.8)] ring-1 ring-white/10 shrink-0">
      <motion.div className="relative w-full h-full rounded-[36px] overflow-hidden bg-[#121316] text-ink"
        animate={step === 1 ? { x: [0, -3, 3, -2, 2, 0] } : { x: 0 }} transition={{ duration: 0.45, delay: 0.3 }}>
        {/* status bar */}
        <div className="flex items-center justify-between px-6 pt-3 text-[11px] font-semibold"><span className="tabular-nums">{clock}</span><span className="w-20 h-5 rounded-full bg-black absolute left-1/2 -translate-x-1/2 top-2" /><span>5G ▮▮▮</span></div>

        {/* the study app */}
        <div className="px-5 pt-6">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-semibold">DBMS · Unit 4 notes</p>
            <motion.span className="text-[11px] px-2 py-0.5 rounded-full bg-calm/20 text-calm tabular-nums" animate={{ opacity: [1, 0.6, 1] }} transition={{ repeat: Infinity, duration: 2 }}>
              ● focus {step >= 6 ? '75:00' : step >= 5 ? '27:12' : '23:41'}
            </motion.span>
          </div>
          <p className="mt-4 text-[17px] font-bold leading-tight">Normalization: 1NF → BCNF</p>
          <div className="mt-4"><Lines /></div>
          <div className="mt-5 rounded-xl bg-white/5 p-3"><Lines n={4} /></div>
        </div>

        {/* the notification, and Parallel's strip on top of it */}
        <AnimatePresence>
          {step >= 1 && step <= 4 && (
            <motion.div key="notif" className="absolute left-3 right-3 top-9 z-10" initial={{ y: -140 }} animate={{ y: 0 }} exit={{ y: 300, x: 70, scale: 0.15, opacity: 0.4 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}>
              <div className="rounded-2xl bg-[#2a2c31]/95 backdrop-blur p-3 shadow-xl">
                <div className="flex items-center gap-2 text-[11px] text-muted"><span className="w-5 h-5 rounded-md bg-gradient-to-br from-[#f58529] via-[#dd2a7b] to-[#8134af]" /> Instagram · now</div>
                <p className="mt-1 text-[13px] font-semibold leading-snug">{SAMPLE.text}</p>
              </div>
              <AnimatePresence>
                {step >= 2 && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="overflow-hidden">
                    <div className="mt-1.5 rounded-2xl bg-field text-field-ink p-3 shadow-xl">
                      <p className="text-[10px] font-black tracking-widest">PARALLEL</p>
                      <p className="text-[13px] font-bold leading-snug mt-0.5">−18 min if you tap · 74% rabbit hole</p>
                      <p className="text-[11px] opacity-70">You’re 23 min into a deep block. Twin says: hold.</p>
                      <div className="mt-2 grid grid-cols-3 gap-1.5 text-[11px] font-bold">
                        <span className={`rounded-lg py-1.5 text-center bg-[#ffd23f] flex items-center justify-center gap-1 ${step === 3 || step === 4 ? 'ring-2 ring-field-ink' : ''}`}><DoorOpen size={12} /> Peek</span>
                        <span className={`rounded-lg py-1.5 text-center bg-chaos ${step === 4 ? 'ring-2 ring-field-ink' : ''}`}>Hold</span>
                        <span className="rounded-lg py-1.5 text-center bg-black/10">Open</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {/* peeking through the doors */}
        <AnimatePresence>
          {(step === 3 || step === 4) && (
            <motion.div key="peek" className="absolute left-9 right-9 bottom-5 z-20 rounded-2xl overflow-hidden bg-black/85 p-2 shadow-2xl"
              initial={{ y: 260, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 260, opacity: 0 }} transition={{ type: 'spring', stiffness: 220, damping: 24, delay: 0.5 }}>
              <p className={`text-[10px] font-black tracking-widest mb-1 ${step === 3 ? 'text-chaos' : 'text-calm'}`}>{step === 3 ? 'DOOR A · THE SCROLLFATHER' : 'DOOR B · MAIN CHARACTER'}</p>
              <motion.svg key={step} viewBox={`0 0 ${PW} ${PH}`} className="w-full h-auto block rounded-lg" initial={{ rotateY: -90 }} animate={{ rotateY: 0 }} transition={{ duration: 0.5, delay: 0.7 }}>
                <PanelArt p={(step === 3 ? f.a : f.b).panels[3]} f={SAMPLE} uid={`demo${step}`} />
              </motion.svg>
            </motion.div>
          )}
        </AnimatePresence>

        {/* the jar of held pings */}
        <AnimatePresence>
          {held && step < 6 && (
            <motion.div key="jar" className="absolute left-1/2 -translate-x-1/2 bottom-5 z-10 flex items-center gap-2 rounded-full bg-chaos/90 text-field-ink px-3 py-2 text-[12px] font-bold"
              initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }} transition={{ delay: 0.35 }}>
              <span className="w-4 h-5 rounded-b-md rounded-t-sm border-2 border-field-ink relative overflow-hidden"><motion.span className="absolute inset-x-0 bottom-0 bg-field-ink/70" initial={{ height: '20%' }} animate={{ height: '60%' }} transition={{ delay: 0.6 }} /></span>
              3 held · until 1:00 PM
            </motion.div>
          )}
        </AnimatePresence>

        {/* checkpoint: digest + a text from future you */}
        <AnimatePresence>
          {step >= 6 && (
            <motion.div key="digest" className="absolute inset-x-3 top-9 z-10 flex flex-col gap-2" initial={{ y: -120, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }} transition={{ type: 'spring', stiffness: 240, damping: 24 }}>
              <div className="rounded-2xl bg-field text-field-ink p-3 shadow-xl">
                <p className="text-[10px] font-black tracking-widest flex items-center gap-1"><Bell size={11} /> PARALLEL · CHECKPOINT</p>
                <p className="text-[13px] font-bold mt-0.5">3 pings, one calm batch</p>
                <p className="text-[11px] opacity-70">Instagram ×2 · YouTube · 18.4 focus min protected</p>
              </div>
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.9 }} className="rounded-2xl bg-[#2a2c31]/95 p-3 shadow-xl">
                <p className="text-[11px] text-muted flex items-center gap-1.5"><span className="w-5 h-5 rounded-full bg-gradient-to-br from-chaos to-calm grid place-items-center text-[10px] font-black text-field-ink">Y</span> You · from 1:00 PM</p>
                <p className="mt-1 text-[13px]">yo it’s 1:00 pm, dbms block done 😌</p>
                <p className="text-[13px]">the likes are still there btw. main character behaviour fr ✨</p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <Finger x="38%" y="34%" show={step === 3} />
        <Finger x="52%" y="34%" show={step === 4} />
        {/* home indicator */}
        <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-24 h-1 rounded-full bg-white/40" />
      </motion.div>
    </div>
  )
}

/** Autoplaying demo with captions, step dots and play/pause. */
export default function PhoneDemo({ big = false }: { big?: boolean }) {
  const reduce = useReducedMotion()
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(!reduce)
  useEffect(() => {
    if (!playing) return
    const t = setTimeout(() => setStep((s) => (s + 1) % STEPS.length), STEPS[step].ms)
    return () => clearTimeout(t)
  }, [step, playing])
  return (
    <div className={`flex flex-col items-center gap-5 ${big ? 'lg:flex-row lg:items-center lg:gap-14' : ''}`}>
      <PhoneScreen step={step} />
      <div className={`w-full ${big ? 'max-w-md' : 'max-w-[320px]'}`}>
        <AnimatePresence mode="wait">
          <motion.p key={step} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className={`${big ? 'text-2xl' : 'text-[1.05rem]'} font-semibold leading-snug min-h-[3.2em]`} aria-live="polite">
            {STEPS[step].caption}
          </motion.p>
        </AnimatePresence>
        <div className="mt-4 flex items-center gap-1.5" role="tablist" aria-label="Demo steps">
          {STEPS.map((s, i) => (
            <button key={i} role="tab" aria-selected={i === step} aria-label={`Step ${i + 1}: ${s.caption}`} onClick={() => setStep(i)}
              className="h-1.5 flex-1 rounded-full bg-white/15 overflow-hidden">
              <motion.span key={`${i}-${step}-${playing}`} className="block h-full bg-calm" initial={{ width: i < step ? '100%' : '0%' }}
                animate={{ width: i < step ? '100%' : i === step ? (playing ? '100%' : '50%') : '0%' }} transition={{ duration: i === step && playing ? s.ms / 1000 : 0, ease: 'linear' }} />
            </button>
          ))}
        </div>
        <div className="mt-3 flex gap-3 small text-muted">
          <button onClick={() => setPlaying((p) => !p)} className="flex items-center gap-1 hover:text-ink">{playing ? <><Pause size={14} /> pause</> : <><Play size={14} /> play</>}</button>
          <button onClick={() => { setStep(0); setPlaying(true) }} className="flex items-center gap-1 hover:text-ink"><RotateCcw size={14} /> restart</button>
        </div>
      </div>
    </div>
  )
}
