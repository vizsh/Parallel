import { useEffect, useState } from 'react'
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react'
import { Lock, Sparkles } from 'lucide-react'
import { CATEGORIES } from '@/lib/api'
import { BADGES, loadCards, type Badge, type Owned } from '@/lib/cards'

const appOf = (cat: string) => CATEGORIES.find((c) => c.key === cat)?.app ?? 'Any app'

/** A holographic trading card. Tilt it (mouse, finger or phone) and the foil follows the light. */
export function HoloCard({ badge, isNew = false, size = 'lg' }: { badge: Badge; isNew?: boolean; size?: 'lg' | 'sm' }) {
  const reduce = useReducedMotion()
  const mx = useMotionValue(0.5), my = useMotionValue(0.5)
  const sx = useSpring(mx, { stiffness: 200, damping: 20 }), sy = useSpring(my, { stiffness: 200, damping: 20 })
  const rotY = useTransform(sx, [0, 1], [-16, 16]), rotX = useTransform(sy, [0, 1], [12, -12])
  const foil = useTransform([sx, sy], ([x, y]) => `${(x as number) * 100}% ${(y as number) * 100}%`)

  useEffect(() => { // phones: the gyroscope moves the light
    if (reduce || size === 'sm') return
    const on = (e: DeviceOrientationEvent) => {
      if (e.gamma == null || e.beta == null) return
      mx.set(Math.max(0, Math.min(1, 0.5 + e.gamma / 60))); my.set(Math.max(0, Math.min(1, 0.5 + (e.beta - 45) / 60)))
    }
    window.addEventListener('deviceorientation', on)
    return () => window.removeEventListener('deviceorientation', on)
  }, [mx, my, reduce, size])

  const A = badge.side === 'a'
  const big = size === 'lg'
  return (
    <motion.div style={{ perspective: 800 }} initial={isNew && !reduce ? { rotateY: 180, scale: 0.6, opacity: 0 } : false}
      animate={{ rotateY: 0, scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 140, damping: 14 }}>
      <motion.div
        onPointerMove={(e) => { if (reduce) return; const r = e.currentTarget.getBoundingClientRect(); mx.set((e.clientX - r.left) / r.width); my.set((e.clientY - r.top) / r.height) }}
        onPointerLeave={() => { mx.set(0.5); my.set(0.5) }}
        style={{ rotateX: big ? rotX : 0, rotateY: big ? rotY : 0, transformStyle: 'preserve-3d' }}
        className={`relative overflow-hidden rounded-2xl ${A ? 'bg-chaos' : 'bg-calm'} text-field-ink ${big ? 'w-[210px] h-[294px] p-4' : 'w-full aspect-[5/7] p-2.5'} shadow-2xl select-none`}>
        {/* foil */}
        <motion.div aria-hidden className="absolute inset-0 mix-blend-overlay opacity-70 pointer-events-none"
          style={{ backgroundImage: 'linear-gradient(115deg, transparent 20%, rgba(255,255,255,.75) 35%, rgba(130,90,255,.6) 45%, rgba(0,220,255,.55) 55%, rgba(255,240,120,.6) 65%, transparent 80%)', backgroundSize: '250% 250%', backgroundPosition: foil }} />
        <div className="relative h-full flex flex-col">
          <p className={`${big ? 'small' : 'text-[10px]'} font-semibold uppercase tracking-wide`}>{A ? 'Universe A' : 'Universe B'} · {appOf(badge.category)}</p>
          <div className={`flex-1 grid place-items-center ${big ? 'my-3' : 'my-1'}`}>
            <div className={`rounded-full bg-field-ink/90 grid place-items-center ${big ? 'w-24 h-24' : 'w-10 h-10'}`}>
              <Sparkles className={A ? 'text-chaos' : 'text-calm'} size={big ? 40 : 18} aria-hidden />
            </div>
          </div>
          <p className={`${big ? 'text-xl' : 'text-[11px]'} font-bold leading-tight`}>{badge.name}</p>
          {big && <p className="small mt-1 opacity-80">{A ? 'Earned by tapping on purpose.' : 'Earned by holding the line.'}</p>}
        </div>
      </motion.div>
    </motion.div>
  )
}

/** The binder: every card you can earn, greyed out until it's yours. */
export function CardBinder({ uid, refresh = 0 }: { uid?: number; refresh?: number }) {
  const [owned, setOwned] = useState<Owned>({})
  useEffect(() => setOwned(loadCards(uid)), [uid, refresh])
  const got = BADGES.filter((b) => owned[b.id]).length
  return (
    <div>
      <p className="small text-muted mb-3">{got} of {BADGES.length} collected. Each ping type has a card for each universe, so allowing on purpose counts too.</p>
      <ul className="grid grid-cols-4 sm:grid-cols-7 gap-2">
        {BADGES.map((b) => (
          <li key={b.id} title={owned[b.id] ? `${b.name} ×${owned[b.id].n}` : 'Not collected yet'}>
            {owned[b.id]
              ? <div className="relative"><HoloCard badge={b} size="sm" />{owned[b.id].n > 1 && <span className="absolute -top-1.5 -right-1.5 bg-ink text-field-ink text-[10px] font-bold rounded-full px-1.5">×{owned[b.id].n}</span>}</div>
              : <div className="w-full aspect-[5/7] rounded-2xl border-2 border-dashed border-surface-2 grid place-items-center text-muted"><Lock size={16} aria-label="Locked" /></div>}
          </li>
        ))}
      </ul>
    </div>
  )
}
