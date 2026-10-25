import { useEffect, useRef, useState } from 'react'
import { animate, motion, useMotionValue, useReducedMotion } from 'motion/react'
import { Vibrate } from 'lucide-react'
import { CATEGORIES } from '@/lib/api'
import { feel, requestMotion, useShake } from '@/lib/feel'

export type JarItem = { id: number | string; category: string }

// Ball colour by kind of ping: social pull is chaos, people you care about are calm.
const TINT: Record<string, string> = {
  social_like: '#ff4a1f', social_dm: '#ff7a52', video_reco: '#ff4a1f', news: '#ffb547', promo: '#ffb547',
  work_chat: '#9db8ff', email: '#9db8ff', calendar: '#9db8ff', family: '#3ee6b5', security: '#3ee6b5',
}
const W = 150, H = 170, PAD = 22, TOP = 46, R = 13, MAX_BALLS = 28
const CW = W + PAD * 2, CH = H + TOP + PAD

type Ball = { key: string; x: number; y: number; vx: number; vy: number; color: string; letter: string; out: boolean }

// First fill stacks balls in rows from the bottom; later holds drop in at the mouth.
function ballFor(it: JarItem, i: number, atMouth: boolean): Ball {
  const app = CATEGORIES.find((c) => c.key === it.category)?.app ?? '?'
  const perRow = Math.floor(W / (2 * R))
  const x = atMouth ? W / 2 + ((i * 17) % 30) - 15 : R + (i % perRow) * 2 * R + (Math.floor(i / perRow) % 2) * R * 0.5
  const y = atMouth ? R : H - R - Math.floor(i / perRow) * 2 * R
  return { key: String(it.id), x, y, vx: 0, vy: 0, color: TINT[it.category] ?? '#a3a5aa', letter: app[0], out: false }
}

/**
 * A glass jar of held pings with a tiny physics sim. Balls drop in as you hold notifications;
 * tap the jar or shake the phone to tip it and pour them all out into one calm batch.
 */
export default function HeldJar({ items, onPour, label = 'held' }: { items: JarItem[]; onPour: () => Promise<unknown>; label?: string }) {
  const reduce = useReducedMotion()
  const canvas = useRef<HTMLCanvasElement>(null)
  const balls = useRef<Ball[]>([])
  const raf = useRef(0)
  const tilt = useMotionValue(0) // degrees, clockwise
  const [pouring, setPouring] = useState(false)
  const pouringRef = useRef(false)
  const poured = useRef(new Set<string>()) // ids already poured, ignored until the parent's queue refreshes

  // Keep the sim's balls in step with the real queue: new holds drop in from the mouth.
  useEffect(() => {
    if (pouring) return
    const shown = items.filter((i) => !poured.current.has(String(i.id))).slice(0, MAX_BALLS)
    const keep = new Set(shown.map((i) => String(i.id)))
    const have = new Set(balls.current.map((b) => b.key))
    const first = balls.current.length === 0
    balls.current = balls.current.filter((b) => keep.has(b.key))
    shown.forEach((it, i) => { if (!have.has(String(it.id))) balls.current.push(ballFor(it, i, !first)) })
    if (reduce) settle()
    wake()
  }, [items, pouring]) // eslint-disable-line react-hooks/exhaustive-deps

  function step() {
    const th = (tilt.get() * Math.PI) / 180
    const gx = 0.35 * Math.sin(th), gy = 0.35 * Math.cos(th) // gravity seen from inside the tilted jar
    const bs = balls.current
    let moving = false
    for (const b of bs) {
      b.vx = (b.vx + gx) * 0.992; b.vy = (b.vy + gy) * 0.992
      b.x += b.vx; b.y += b.vy
      if (pouringRef.current && b.y < -R) b.out = true // left through the mouth
      if (!b.out) {
        if (!pouringRef.current && b.y < R) { b.y = R; b.vy = Math.abs(b.vy) * 0.3 }
        if (b.x < R) { b.x = R; b.vx = -b.vx * 0.35 }
        if (b.x > W - R) { b.x = W - R; b.vx = -b.vx * 0.35 }
        if (b.y > H - R) { b.y = H - R; b.vy = -b.vy * 0.3; b.vx *= 0.9 }
      }
    }
    for (let it = 0; it < 3; it++) {
      for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) {
        const a = bs[i], b = bs[j]
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 0.01
        if (d < 2 * R) {
          const push = (2 * R - d) / 2, nx = dx / d, ny = dy / d
          a.x -= nx * push; a.y -= ny * push; b.x += nx * push; b.y += ny * push
          const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny
          if (rel < 0) { a.vx += rel * nx * 0.5; a.vy += rel * ny * 0.5; b.vx -= rel * nx * 0.5; b.vy -= rel * ny * 0.5 }
        }
      }
    }
    balls.current = bs.filter((b) => b.y > -TOP - 3 * R && b.x > -PAD - 2 * R && b.x < W + PAD + 2 * R && b.y < H + PAD + R)
    for (const b of balls.current) if (Math.abs(b.vx) + Math.abs(b.vy) > 0.08) moving = true
    return moving
  }

  function settle() { for (let i = 0; i < 400; i++) step(); draw() }

  function draw() {
    const c = canvas.current
    if (!c) return
    const dpr = window.devicePixelRatio || 1
    if (c.width !== CW * dpr) { c.width = CW * dpr; c.height = CH * dpr }
    const g = c.getContext('2d')!
    g.setTransform(dpr, 0, 0, dpr, 0, 0)
    g.clearRect(0, 0, CW, CH)
    g.translate(PAD, TOP)
    // glass
    g.lineWidth = 3
    g.strokeStyle = 'rgba(239,240,241,0.28)'
    g.fillStyle = 'rgba(239,240,241,0.04)'
    g.beginPath()
    g.moveTo(-4, -8); g.lineTo(-4, H - 18); g.quadraticCurveTo(-4, H + 4, 18, H + 4)
    g.lineTo(W - 18, H + 4); g.quadraticCurveTo(W + 4, H + 4, W + 4, H - 18); g.lineTo(W + 4, -8)
    g.fill(); g.stroke()
    g.fillStyle = 'rgba(239,240,241,0.10)'
    g.fillRect(8, 6, 6, H - 40) // highlight
    for (const b of balls.current) {
      g.beginPath(); g.arc(b.x, b.y, R, 0, Math.PI * 2); g.fillStyle = b.color; g.fill()
      g.save(); g.translate(b.x, b.y); g.rotate((-tilt.get() * Math.PI) / 180) // letters stay upright on screen
      g.fillStyle = '#18191b'; g.font = '600 12px Switzer, system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'
      g.fillText(b.letter, 0, 1); g.restore()
    }
  }

  function wake() {
    if (raf.current) return
    const loop = () => {
      const moving = step()
      draw()
      raf.current = moving || pouringRef.current ? requestAnimationFrame(loop) : 0 // sleep when settled: no idle battery drain
    }
    raf.current = requestAnimationFrame(loop)
  }
  useEffect(() => () => { cancelAnimationFrame(raf.current); raf.current = 0 }, [])

  async function pour() {
    if (pouringRef.current || !items.length) return
    pouringRef.current = true; setPouring(true)
    items.forEach((i) => poured.current.add(String(i.id)))
    feel('pour')
    const released = onPour()
    if (reduce) { balls.current = []; draw() } else {
      wake()
      await animate(tilt, 128, { duration: 0.7, ease: 'easeInOut' })
      await new Promise((r) => setTimeout(r, 1300))
      balls.current = []
      await animate(tilt, 0, { type: 'spring', stiffness: 160, damping: 14 })
    }
    await released.catch(() => {})
    feel('success')
    pouringRef.current = false; setPouring(false)
  }
  useShake(pour, items.length > 0)

  return (
    <div className="flex flex-col items-center">
      <button onClick={async () => { await requestMotion(); pour() }} disabled={!items.length || pouring}
        className="relative disabled:cursor-default" aria-label={items.length ? `${items.length} ${label} pings. Tap to pour them out now.` : 'The jar is empty'}>
        <motion.canvas ref={canvas} style={{ width: CW, height: CH, rotate: tilt, originX: 0.5, originY: 0.7 }} aria-hidden />
        {items.length > 0 && !pouring && (
          <span className="absolute left-1/2 -translate-x-1/2 bottom-[46%] text-4xl font-semibold tabular-nums pointer-events-none drop-shadow">{items.length}</span>
        )}
      </button>
      <p className="small text-muted text-center mt-1">
        {pouring ? 'Pouring into one calm batch…'
          : items.length ? <span className="inline-flex items-center gap-1.5"><Vibrate size={14} aria-hidden /> Tap or shake to pour them out</span>
          : 'Empty jar. Nothing waiting.'}
      </p>
    </div>
  )
}
