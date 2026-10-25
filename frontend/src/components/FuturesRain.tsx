import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from 'motion/react'
import { RotateCcw } from 'lucide-react'

const H = 190, BASE = 22, DOTS = 600, COLS = 4 // each dot is ~3 futures

type Drop = { x: number; y: number; ty: number; vy: number; delay: number }

/**
 * The 2,000 simulated futures fall as particles and pile up into the cost histogram,
 * so "80% of futures land between p10 and p90" is something you watch happen.
 */
export default function FuturesRain({ bins, binWidth, mean, p10, p90, tone = '#ff4a1f' }: { bins: number[]; binWidth: number; mean: number; p10: number; p90: number; tone?: string }) {
  const reduce = useReducedMotion()
  const wrap = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const [w, setW] = useState(340)
  const [run, setRun] = useState(0)

  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const ro = new ResizeObserver(() => setW(el.clientWidth))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const c = canvas.current
    if (!c) return
    const dpr = window.devicePixelRatio || 1
    c.width = w * dpr; c.height = H * dpr
    const g = c.getContext('2d')!
    g.setTransform(dpr, 0, 0, dpr, 0, 0)
    const total = bins.reduce((a, b) => a + b, 0) || 1
    const span = bins.length * binWidth
    const bw = w / bins.length
    const dot = Math.max(1.6, Math.min(bw / (COLS * 2.3), 3))
    const step = dot * 2.2
    const floor = H - BASE
    // scale the pile so the tallest bin fits under the top margin
    const counts = bins.map((b) => Math.round((b / total) * DOTS))
    const tallest = Math.max(...counts.map((n) => Math.ceil(n / COLS)), 1)
    const rowH = Math.min(step, (floor - 26) / tallest)
    const drops: Drop[] = []
    counts.forEach((n, i) => {
      for (let k = 0; k < n; k++) {
        const col = k % COLS, row = Math.floor(k / COLS)
        const x = i * bw + bw / 2 + (col - (COLS - 1) / 2) * step
        drops.push({ x, y: -10 - Math.random() * 60, ty: floor - dot - row * rowH, vy: 0, delay: Math.random() * 55 + row * 0.6 })
      }
    })
    const xOf = (min: number) => (min / span) * w
    let frame = 0, raf = 0

    function paint() {
      g.clearRect(0, 0, w, H)
      // p10–p90 band and mean marker
      g.fillStyle = 'rgba(239,240,241,0.06)'
      g.fillRect(xOf(p10), 0, Math.max(2, xOf(p90) - xOf(p10)), floor)
      g.strokeStyle = 'rgba(239,240,241,0.55)'; g.setLineDash([3, 4]); g.lineWidth = 1
      g.beginPath(); g.moveTo(xOf(mean), 14); g.lineTo(xOf(mean), floor); g.stroke(); g.setLineDash([])
      g.fillStyle = 'rgba(239,240,241,0.75)'; g.font = '11px Switzer, system-ui, sans-serif'; g.textAlign = 'center'
      g.fillText(`mean ${mean}`, Math.min(w - 30, Math.max(30, xOf(mean))), 10)
      g.fillStyle = tone
      for (const d of drops) { g.beginPath(); g.arc(d.x, d.y, dot, 0, Math.PI * 2); g.fill() }
      // axis
      g.fillStyle = 'rgba(239,240,241,0.25)'; g.fillRect(0, floor, w, 1)
      g.fillStyle = 'rgba(163,165,170,1)'; g.textAlign = 'left'
      for (let m = 0; m <= span; m += 15) { g.textAlign = m === 0 ? 'left' : m === span ? 'right' : 'center'; g.fillText(`${m}${m === span ? '+ min' : ''}`, xOf(m), H - 6) }
    }

    if (reduce) { drops.forEach((d) => { d.y = d.ty }); paint(); return }
    const loop = () => {
      frame++
      let moving = false
      for (const d of drops) {
        if (frame < d.delay) { moving = true; continue }
        if (d.y < d.ty) { d.vy += 0.45; d.y = Math.min(d.ty, d.y + d.vy); moving = true }
      }
      paint()
      if (moving) raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [bins, binWidth, mean, p10, p90, w, run, reduce, tone])

  return (
    <div ref={wrap} className="relative">
      <canvas ref={canvas} style={{ width: w, height: H }} role="img"
        aria-label={`Distribution of 2,000 simulated futures: mean ${mean} minutes, 80% between ${p10} and ${p90} minutes.`} />
      <button onClick={() => setRun((r) => r + 1)} className="absolute top-0 right-0 small text-muted hover:text-ink flex items-center gap-1" aria-label="Rain the futures again">
        <RotateCcw size={13} /> again
      </button>
    </div>
  )
}
