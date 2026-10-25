import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { DoorOpen, Pause, RotateCcw, Share2, X } from 'lucide-react'
import { ComicPoster, PanelArt, PH, PW } from './ComicArt'
import { buildFutures, type Ending, type FutureInput } from '@/lib/future'
import { feel } from '@/lib/feel'
import Xray from './Xray'
import { toast } from '@/lib/hooks'

type Side = 'a' | 'b'
const STEP_MS = 3400

const DOOR = {
  a: { label: 'If you tap', sub: 'chaos behind this one', light: 'radial-gradient(circle at 50% 60%, #fff3b0 0%, #ff8a3d 35%, #ff4a1f 70%, #6b1d12 100%)', leaf: '#8a4b2a', trim: '#ff4a1f', emoji: '📱' },
  b: { label: 'If you hold', sub: 'it’s giving main character', light: 'radial-gradient(circle at 50% 40%, #ffffff 0%, #fff2a8 35%, #9ff5d6 70%, #1aa37e 100%)', leaf: '#e9e1cf', trim: '#3ee6b5', emoji: '😇' },
} as const

function Door({ side, opening, seen, onOpen, onPeek }: { side: Side; opening: boolean; seen: boolean; onOpen: () => void; onPeek: (on: boolean) => void }) {
  const d = DOOR[side]
  const reduce = useReducedMotion()
  // Peephole: press and hold to look through the keyhole without opening the door.
  const hold = useRef(0), peeked = useRef(false)
  const startHold = () => { peeked.current = false; window.clearTimeout(hold.current); hold.current = window.setTimeout(() => { peeked.current = true; feel('tick'); onPeek(true) }, 420) }
  const endHold = () => { window.clearTimeout(hold.current); if (peeked.current) onPeek(false) }
  return (
    <motion.button type="button" onClick={() => { if (peeked.current) { peeked.current = false; return } onOpen() }}
      onPointerDown={startHold} onPointerUp={endHold} onPointerLeave={endHold} onPointerCancel={endHold} onContextMenu={(e) => e.preventDefault()}
      onPanStart={() => window.clearTimeout(hold.current)} onPanEnd={(_, i) => { if (i.offset.y < -50) onOpen() }}
      whileTap={{ scale: 0.97 }} aria-label={`Open door ${side.toUpperCase()}: ${d.label}`}
      className="relative flex flex-col items-center gap-3 touch-none select-none">
      <div className="relative w-[min(40vw,170px)] aspect-[17/30] rounded-t-[999px] p-2.5" style={{ background: d.trim, perspective: 900 }}>
        <div className="absolute inset-2.5 rounded-t-[999px] overflow-hidden" style={{ background: d.light }}>
          {side === 'a'
            ? <motion.div className="absolute inset-0 grid place-items-center text-5xl" animate={reduce ? undefined : { rotate: [0, -8, 8, 0] }} transition={{ repeat: Infinity, duration: 1.2 }}>🌀</motion.div>
            : <motion.div className="absolute inset-0 grid place-items-center text-5xl" animate={reduce ? undefined : { y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 2 }}>✨</motion.div>}
        </div>
        <motion.div className="absolute inset-2.5 rounded-t-[999px] border-4 border-field-ink flex flex-col items-center justify-start pt-[28%] gap-[8%]"
          style={{ background: d.leaf, originX: 0, transformStyle: 'preserve-3d', backfaceVisibility: 'hidden' }}
          initial={false} animate={{ rotateY: opening ? -112 : seen ? -18 : 0 }}
          transition={{ duration: reduce ? 0 : 0.9, ease: [0.5, 0, 0.2, 1] }}>
          <span className="bg-field-ink text-field px-2 py-0.5 text-[11px] font-black tracking-widest">DOOR {side.toUpperCase()}</span>
          <span className="w-[62%] aspect-[3/4] border-4 border-field-ink/40 rounded-md" aria-hidden />
          <span className="w-[62%] aspect-[3/2] border-4 border-field-ink/40 rounded-md" aria-hidden />
          <span className="absolute right-[12%] top-[56%] w-3.5 h-3.5 rounded-full bg-[#ffd23f] border-2 border-field-ink" aria-hidden />
          {seen && <span className="absolute top-2 left-1/2 -translate-x-1/2 text-[10px] font-bold text-field-ink/70">seen</span>}
        </motion.div>
        {/* light leaking under the door */}
        <motion.div aria-hidden className="absolute -bottom-2 left-3 right-3 h-3 rounded-full blur-md" style={{ background: d.trim }}
          animate={reduce ? undefined : { opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.6 }} />
      </div>
      <span className="text-center">
        <span className="block font-semibold">{d.emoji} {d.label}</span>
        <span className="block small text-muted">{d.sub}</span>
      </span>
    </motion.button>
  )
}

async function posterPng(svg: SVGSVGElement) {
  const xml = new XMLSerializer().serializeToString(svg)
  const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml;charset=utf-8' }))
  try {
    const img = new Image()
    await new Promise((ok, bad) => { img.onload = ok; img.onerror = bad; img.src = url })
    const c = document.createElement('canvas')
    c.width = 1080; c.height = 1920
    c.getContext('2d')!.drawImage(img, 0, 0)
    return await new Promise<Blob>((ok, bad) => c.toBlob((b) => (b ? ok(b) : bad(new Error('Could not draw the comic'))), 'image/png'))
  } finally { URL.revokeObjectURL(url) }
}

/**
 * Door to the Future. Two doors; behind each, a four-panel comic of what this ping does to you,
 * drawn from your twin's numbers. Ends on The Scrollfather or Main Character, with a poster to share.
 */
export default function FuturePeek({ input, open, onClose, onChoose, chosen }: {
  input: FutureInput; open: boolean; onClose: () => void; onChoose?: (side: Side) => void; chosen?: boolean
}) {
  const reduce = useReducedMotion()
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const futures = useMemo(() => buildFutures(input), [input])
  const [stage, setStage] = useState<'doors' | 'comic' | 'end'>('doors')
  const [side, setSide] = useState<Side>('a')
  const [opening, setOpening] = useState<Side | null>(null)
  const [seen, setSeen] = useState<Record<Side, boolean>>({ a: false, b: false })
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [peeking, setPeeking] = useState<Side | null>(null)
  const poster = useRef<HTMLDivElement>(null)
  const pressed = useRef(0) // a long press pauses; releasing it shouldn't also skip
  const e: Ending = futures[side]
  const range = input.p10 != null && input.p90 != null ? `${input.p10}–${input.p90}` : undefined

  useEffect(() => { if (open) { setStage('doors'); setOpening(null); setSeen({ a: false, b: false }) } }, [open])
  useEffect(() => { // lock the page behind, close on Escape
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const key = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') onClose()
      if (stage === 'comic' && ev.key === 'ArrowRight') next()
      if (stage === 'comic' && ev.key === 'ArrowLeft') setI((n) => Math.max(0, n - 1))
    }
    window.addEventListener('keydown', key)
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', key) }
  })
  useEffect(() => { // story-style auto advance
    if (stage !== 'comic' || paused) return
    const t = setTimeout(next, STEP_MS)
    return () => clearTimeout(t)
  })

  function openDoor(s: Side) {
    if (opening) return
    setSide(s); setOpening(s); setI(0)
    feel('tick'); setTimeout(() => feel('tick'), 180); setTimeout(() => feel('tick'), 360)
    setTimeout(() => { feel(s === 'a' ? 'warning' : 'success'); setStage('comic'); setOpening(null); setSeen((x) => ({ ...x, [s]: true })) }, reduce ? 0 : 1250)
  }
  function next() {
    if (i < 3) { setI(i + 1); feel('tick') }
    else { setStage('end'); feel(side === 'a' ? 'noise' : 'success') }
  }

  async function share() {
    const svg = poster.current?.querySelector('svg')
    if (!svg) return
    setSharing(true)
    try {
      const blob = await posterPng(svg)
      const file = new File([blob], `parallel-ending-${side}.png`, { type: 'image/png' })
      const text = side === 'a' ? `My twin says this ping turns me into The Scrollfather 💀` : `Held the ping. Main Character arc unlocked ✨`
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: `Ending ${side.toUpperCase()}: ${e.title}`, text })
      else {
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob); a.download = file.name; a.click()
        setTimeout(() => URL.revokeObjectURL(a.href), 1000)
        toast('Comic saved as an image')
      }
    } catch (err) { if ((err as Error).name !== 'AbortError') toast((err as Error).message, 'chaos') } finally { setSharing(false) }
  }

  if (!open) return null
  const A = side === 'a'
  return createPortal(
    <motion.div role="dialog" aria-modal="true" aria-label="Door to the Future" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="fixed inset-0 z-[60] bg-[#0d0d0f] text-ink flex flex-col overflow-y-auto">
      <div className="flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top),12px)] pb-2">
        <p className="small text-muted truncate">{input.app} · “{input.text}”</p>
        <button onClick={onClose} className="p-2 -mr-2 text-muted hover:text-ink" aria-label="Close"><X size={22} /></button>
      </div>

      {stage === 'doors' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-8 px-4 pb-10">
          <div className="text-center">
            <h2 className="text-3xl font-semibold">Two doors. One ping.</h2>
            <p className="small text-muted mt-2">Tap a door or swipe it up to open it. Press and hold to peek through the keyhole.</p>
          </div>
          {input.xray && input.xray.length > 0 && (
            <div className="w-full max-w-sm"><p className="small text-muted mb-1.5 text-center">X-ray of this ping</p><div className="flex justify-center"><Xray tags={input.xray} usually={input.usually} /></div></div>
          )}
          <div className="flex gap-5 sm:gap-10">
            <Door side="a" opening={opening === 'a'} seen={seen.a} onOpen={() => openDoor('a')} onPeek={(on) => setPeeking(on ? 'a' : null)} />
            <Door side="b" opening={opening === 'b'} seen={seen.b} onOpen={() => openDoor('b')} onPeek={(on) => setPeeking(on ? 'b' : null)} />
          </div>
          <p className="small text-muted text-center max-w-xs">Comedy on top, your twin’s numbers underneath: ~{input.cost} min if you tap{range ? ` (80% range ${range})` : ''}.</p>
          <AnimatePresence>
            {peeking && (
              <motion.div key="keyhole" aria-live="polite" className="fixed inset-0 z-20 grid place-items-center bg-black/85 pointer-events-none"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="flex flex-col items-center gap-3">
                  <motion.div className="w-[min(72vw,280px)] aspect-[4/5] overflow-hidden" initial={{ scale: 0.4 }} animate={{ scale: 1 }}
                    style={{ WebkitMaskImage: 'radial-gradient(circle at 50% 38%, #000 34%, transparent 35%), linear-gradient(#000, #000)', WebkitMaskSize: '100% 100%, 26% 46%', WebkitMaskPosition: '0 0, 50% 92%', WebkitMaskRepeat: 'no-repeat', maskImage: 'radial-gradient(circle at 50% 38%, #000 34%, transparent 35%), linear-gradient(#000, #000)', maskSize: '100% 100%, 26% 46%', maskPosition: '0 0, 50% 92%', maskRepeat: 'no-repeat' }}>
                    <svg viewBox={`0 0 ${PW} ${PH}`} className="w-full h-full" aria-label={`Peeking at door ${peeking.toUpperCase()}: ${futures[peeking].title}`}>
                      <PanelArt p={futures[peeking].panels[3]} f={input} uid={`${uid}peep`} />
                    </svg>
                  </motion.div>
                  <p className="small text-muted">Peeking at door {peeking.toUpperCase()}… let go to close</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {stage === 'comic' && (
        <div className="flex-1 flex flex-col items-center px-4 pb-6">
          <div className="w-full max-w-[420px] flex gap-1.5 mb-3" aria-hidden>
            {e.panels.map((_, n) => (
              <div key={n} className="h-1 flex-1 rounded-full bg-white/20 overflow-hidden">
                <motion.div key={`${n}-${i}-${paused}`} className={`h-full ${A ? 'bg-chaos' : 'bg-calm'}`}
                  initial={{ width: n < i ? '100%' : '0%' }} animate={{ width: n < i ? '100%' : n === i && !paused ? '100%' : '0%' }}
                  transition={{ duration: n === i ? STEP_MS / 1000 : 0, ease: 'linear' }} />
              </div>
            ))}
          </div>
          <p className={`small font-semibold mb-2 ${A ? 'text-chaos' : 'text-calm'}`}>Door {side.toUpperCase()} · panel {i + 1} of 4</p>
          <div className="relative w-full max-w-[420px]" onPointerDown={() => { pressed.current = Date.now(); setPaused(true) }} onPointerUp={() => setPaused(false)} onPointerLeave={() => setPaused(false)}>
            <motion.svg key={i} viewBox={`0 0 ${PW} ${PH}`} className="w-full h-auto block" role="img" aria-label={`Panel ${i + 1}: ${e.panels[i].caption}. ${e.panels[i].clock}.`}
                initial={reduce ? false : { opacity: 0, scale: 0.9, rotate: A ? -2 : 2 }} animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 320, damping: 22 }}>
                <PanelArt p={e.panels[i]} f={input} uid={`${uid}v${i}`} />
              </motion.svg>
            {/* story-style tap zones */}
            <button className="absolute inset-y-0 left-0 w-1/3" aria-label="Previous panel" onClick={(ev) => { if (ev.detail === 0 || Date.now() - pressed.current < 400) setI((n) => Math.max(0, n - 1)) }} />
            <button className="absolute inset-y-0 right-0 w-2/3" aria-label="Next panel" onClick={(ev) => { if (ev.detail === 0 || Date.now() - pressed.current < 400) next() }} />
          </div>
          <p className="small text-muted mt-3 flex items-center gap-1.5">{paused ? <><Pause size={13} /> paused</> : 'Tap to skip ahead · hold to pause'}</p>
        </div>
      )}

      {stage === 'end' && (
        <div className="flex-1 flex flex-col items-center px-4 pb-8 gap-4">
          <motion.div initial={reduce ? false : { scale: 2.2, rotate: -14, opacity: 0 }} animate={{ scale: 1, rotate: -4, opacity: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 14 }}
            className={`mt-2 px-5 py-3 border-4 border-field-ink text-field-ink text-center shadow-[6px_6px_0_#000] ${A ? 'bg-chaos' : 'bg-calm'}`}>
            <p className="text-[12px] font-black tracking-[0.3em]">ENDING {side.toUpperCase()}</p>
            <p className="text-3xl font-black uppercase leading-none mt-1">{e.title}</p>
          </motion.div>
          <p className="italic text-center">“{e.tagline}”</p>
          <svg viewBox={`0 0 ${PW} ${PH}`} className="w-full max-w-[300px] h-auto" role="img" aria-label={`Final panel: ${e.panels[3].caption}`}>
            <PanelArt p={e.panels[3]} f={input} uid={`${uid}end`} />
          </svg>
          <p className="small text-muted text-center max-w-xs">
            {A ? `Your twin’s estimate: ${input.cost} focus min${range ? `, 80% range ${range}` : ''}.` : `Held, it costs about ${input.holdCost} min when you review it later.`} An estimate, not a prophecy.
          </p>
          <div className="grid grid-cols-2 gap-2 w-full max-w-[340px]">
            <button onClick={share} disabled={sharing} className={`btn justify-center !py-2.5 ${A ? '' : 'btn-calm'}`}><Share2 size={16} /> {sharing ? 'Drawing…' : 'Share comic'}</button>
            <button onClick={() => { setStage('doors'); setI(0) }} className="btn btn-ghost justify-center !py-2.5"><DoorOpen size={16} /> {seen[A ? 'b' : 'a'] ? 'Back to doors' : 'Other door'}</button>
            {onChoose && !chosen && (
              <button onClick={() => { onChoose(side); onClose() }} className="btn btn-ghost justify-center !py-2.5 col-span-2">
                {A ? 'Open it anyway (on purpose)' : 'Hold it. Main character it is.'}
              </button>
            )}
            <button onClick={() => { setStage('comic'); setI(0) }} className="col-span-2 small text-muted hover:text-ink flex items-center justify-center gap-1"><RotateCcw size={13} /> replay</button>
          </div>
          {/* off-screen poster, rasterised on share */}
          <div ref={poster} aria-hidden className="fixed -left-[20000px] top-0 pointer-events-none">
            <ComicPoster e={e} f={input} cost={A ? input.cost : Math.max(0, +(input.cost - input.holdCost).toFixed(1))} range={A ? range : undefined} uid={`${uid}poster`} />
          </div>
        </div>
      )}

      <AnimatePresence>
        {opening && !reduce && (
          <motion.div aria-hidden className="fixed inset-0 z-10 pointer-events-none" style={{ background: DOOR[opening].light }}
            initial={{ opacity: 0, scale: 0.2 }} animate={{ opacity: [0, 0, 1], scale: [0.2, 0.2, 1.4] }} exit={{ opacity: 0 }}
            transition={{ duration: 1.25, times: [0, 0.55, 1] }} />
        )}
      </AnimatePresence>
    </motion.div>,
    document.body,
  )
}
