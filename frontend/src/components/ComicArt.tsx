import type { ReactNode } from 'react'
import { wrap, type ComicPanel, type Ending, type FutureInput, type Mood } from '@/lib/future'

/*
 * Hand-drawn (in code) comic panels. Everything is plain SVG with no fonts or images to load,
 * so a panel can be serialised straight into a PNG for sharing.
 * Panel coordinates: 400 × 500.
 */

export const PW = 400, PH = 500
const INK = '#18191b', SKIN = '#f1c39b', HAIR = '#2a1d17', HOODIE = '#4b5bd6'
const FONT = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif'

function Eyes({ mood }: { mood: Mood }) {
  switch (mood) {
    case 'tempted': return <g>
      <circle cx={-14} cy={-2} r={7} fill="#fff" stroke={INK} strokeWidth={3} /><circle cx={16} cy={-2} r={7} fill="#fff" stroke={INK} strokeWidth={3} />
      <circle cx={-10} cy={-1} r={3.5} fill={INK} /><circle cx={20} cy={-1} r={3.5} fill={INK} />
      <path d="M-22 -16 L-6 -13 M8 -17 Q16 -24 24 -15" stroke={INK} strokeWidth={3.5} fill="none" strokeLinecap="round" />
    </g>
    case 'zombie': return <g>
      <circle cx={-14} cy={-2} r={8} fill="#e8fbff" stroke={INK} strokeWidth={3} /><circle cx={16} cy={-2} r={8} fill="#e8fbff" stroke={INK} strokeWidth={3} />
      <circle cx={-14} cy={-2} r={2} fill={INK} /><circle cx={16} cy={-2} r={2} fill={INK} />
      <path d="M-24 9 Q-14 15 -4 9 M6 9 Q16 15 26 9" stroke="#8b5cf6" strokeWidth={3} fill="none" strokeLinecap="round" />
    </g>
    case 'smug': return <g>
      <path d="M-22 -2 h15 M8 -2 h15" stroke={INK} strokeWidth={4} strokeLinecap="round" />
      <circle cx={-14} cy={2} r={3} fill={INK} /><circle cx={16} cy={2} r={3} fill={INK} />
      <path d="M-23 -14 L-6 -11 M8 -12 Q16 -20 25 -16" stroke={INK} strokeWidth={3.5} fill="none" strokeLinecap="round" />
    </g>
    case 'focused': return <g>
      <circle cx={-14} cy={0} r={3.5} fill={INK} /><circle cx={16} cy={0} r={3.5} fill={INK} />
      <path d="M-23 -14 L-6 -9 M7 -9 L24 -14" stroke={INK} strokeWidth={4} strokeLinecap="round" />
    </g>
    case 'proud': return <g>
      <path d="M-22 0 Q-14 -9 -6 0 M8 0 Q16 -9 24 0" stroke={INK} strokeWidth={4} fill="none" strokeLinecap="round" />
      <ellipse cx={-22} cy={12} rx={7} ry={4} fill="#ff8f8f" opacity={0.7} /><ellipse cx={26} cy={12} rx={7} ry={4} fill="#ff8f8f" opacity={0.7} />
    </g>
  }
}

function Mouth({ mood }: { mood: Mood }) {
  switch (mood) {
    case 'tempted': return <ellipse cx={2} cy={20} rx={5} ry={6} fill={INK} />
    case 'zombie': return <path d="M-8 21 q5 -4 10 0 q5 4 10 0" stroke={INK} strokeWidth={3} fill="none" strokeLinecap="round" />
    case 'smug': return <path d="M-6 21 Q8 24 16 14" stroke={INK} strokeWidth={3.5} fill="none" strokeLinecap="round" />
    case 'focused': return <path d="M-6 20 h14" stroke={INK} strokeWidth={3.5} strokeLinecap="round" />
    case 'proud': return <path d="M-12 14 Q2 34 16 14 Z" fill={INK} />
  }
}

type KidProps = { x: number; y: number; s?: number; mood: Mood; hoodie?: string; fedora?: boolean; halo?: boolean; shades?: boolean; headphones?: boolean; armsUp?: boolean; wings?: boolean }
/** The one recurring character. Head centre is (x, y); the torso hangs below it. */
function Kid({ x, y, s = 1, mood, hoodie = HOODIE, fedora, halo, shades, headphones, armsUp, wings }: KidProps) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {wings && <g fill="#fff" stroke={INK} strokeWidth={3.5}>
        <path d="M-50 70 Q-130 20 -120 -30 Q-95 10 -60 20 Q-110 40 -50 70 Z" /><path d="M50 70 Q130 20 120 -30 Q95 10 60 20 Q110 40 50 70 Z" />
      </g>}
      {armsUp && <path d="M-40 70 L-70 -10 M40 70 L70 -10" stroke={hoodie} strokeWidth={22} strokeLinecap="round" />}
      {armsUp && <g fill={SKIN} stroke={INK} strokeWidth={3}><circle cx={-72} cy={-16} r={11} /><circle cx={72} cy={-16} r={11} /></g>}
      <path d="M-58 130 Q-62 52 0 48 Q62 52 58 130 Z" fill={hoodie} stroke={INK} strokeWidth={4} />
      <path d="M-14 52 L0 74 L14 52" stroke={INK} strokeWidth={3} fill="none" />
      {fedora && <path d="M0 52 L-7 62 L0 100 L7 62 Z" fill="#d7263d" stroke={INK} strokeWidth={2.5} />}
      <circle r={38} fill={SKIN} stroke={INK} strokeWidth={4} />
      <path d="M-40 -6 Q-44 -46 0 -46 Q40 -46 40 -8 Q28 -26 6 -24 Q-14 -32 -40 -6 Z" fill={HAIR} />
      <Eyes mood={mood} /><Mouth mood={mood} />
      {shades && <g><path d="M-28 -8 h22 v10 q-11 8 -22 0 Z M6 -8 h22 v10 q-11 8 -22 0 Z" fill={INK} /><path d="M-6 -6 h12" stroke={INK} strokeWidth={3} /></g>}
      {headphones && <g><path d="M-40 0 Q-44 -56 0 -56 Q44 -56 40 0" stroke={INK} strokeWidth={6} fill="none" /><rect x={-48} y={-8} width={14} height={24} rx={5} fill="#3ee6b5" stroke={INK} strokeWidth={3} /><rect x={34} y={-8} width={14} height={24} rx={5} fill="#3ee6b5" stroke={INK} strokeWidth={3} /></g>}
      {fedora && <g stroke={INK} strokeWidth={4}><ellipse cx={0} cy={-30} rx={62} ry={12} fill="#26272b" /><path d="M-34 -32 Q-36 -74 0 -72 Q36 -74 34 -32 Z" fill="#26272b" /><path d="M-34 -42 Q0 -36 34 -42" stroke="#d7263d" strokeWidth={7} /></g>}
      {halo && <ellipse cx={0} cy={-66} rx={30} ry={8} fill="none" stroke="#ffd23f" strokeWidth={6} />}
    </g>
  )
}

function Laptop({ x, y, screen, tone = '#cfe9ff' }: { x: number; y: number; screen: ReactNode; tone?: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x={-62} y={-80} width={124} height={80} rx={6} fill="#2b2d31" stroke={INK} strokeWidth={4} />
      <rect x={-54} y={-72} width={108} height={64} rx={3} fill={tone} />
      <g fontFamily={FONT}>{screen}</g>
      <path d="M-78 0 h156 l-10 12 h-136 Z" fill="#a3a5aa" stroke={INK} strokeWidth={4} strokeLinejoin="round" />
    </g>
  )
}

function Phone({ x, y, s = 1, rot = 0, face = 'up', glow, children }: { x: number; y: number; s?: number; rot?: number; face?: 'up' | 'down'; glow?: boolean; children?: ReactNode }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      {glow && <circle r={70} fill="#9ff3ff" opacity={0.25} />}
      <rect x={-22} y={-38} width={44} height={76} rx={8} fill={face === 'up' ? '#111' : '#3a3c42'} stroke={INK} strokeWidth={4} />
      {face === 'up' && <rect x={-17} y={-31} width={34} height={60} rx={3} fill={glow ? '#bff7ff' : '#4b5bd6'} />}
      {children}
    </g>
  )
}

const Desk = ({ y = 400, fill = '#b27a4b' }: { y?: number; fill?: string }) => <rect x={-10} y={y} width={420} height={PH - y + 10} fill={fill} stroke={INK} strokeWidth={4} />
const Sparkle = ({ x, y, s = 1, c = '#ffd23f' }: { x: number; y: number; s?: number; c?: string }) =>
  <path transform={`translate(${x} ${y}) scale(${s})`} d="M0 -14 L4 -4 L14 0 L4 4 L0 14 L-4 4 L-14 0 L-4 -4 Z" fill={c} stroke={INK} strokeWidth={2} />

function Bubble({ x, y, w, lines, fill = '#fff', size = 16, tail = 'down' }: { x: number; y: number; w: number; lines: string[]; fill?: string; size?: number; tail?: 'down' | 'none' }) {
  const h = lines.length * (size + 4) + 16
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={14} fill={fill} stroke={INK} strokeWidth={3.5} />
      {tail === 'down' && <path d={`M${x + w - 40} ${y + h - 2} l10 22 l8 -22`} fill={fill} stroke={INK} strokeWidth={3.5} strokeLinejoin="round" />}
      {tail === 'down' && <path d={`M${x + w - 41} ${y + h - 2} h20`} stroke={fill} strokeWidth={5} />}
      <text x={x + 12} y={y + 8 + size} fontFamily={FONT} fontSize={size} fontWeight={700} fill={INK}>
        {lines.map((l, i) => <tspan key={i} x={x + 12} dy={i ? size + 4 : 0}>{l}</tspan>)}
      </text>
    </g>
  )
}

function Rays({ c, n = 14, cx = 200, cy = 260, o = 0.35 }: { c: string; n?: number; cx?: number; cy?: number; o?: number }) {
  return <g opacity={o}>{Array.from({ length: n }).map((_, i) => {
    const a = (i / n) * Math.PI * 2, b = a + Math.PI / n
    return <path key={i} d={`M${cx} ${cy} L${cx + Math.cos(a) * 600} ${cy + Math.sin(a) * 600} L${cx + Math.cos(b) * 600} ${cy + Math.sin(b) * 600} Z`} fill={c} />
  })}</g>
}

const BG: Record<ComicPanel['scene'], string> = {
  buzz: '#ffe1cf', reels: '#2b1840', night: '#141026', scrollfather: '#3a160b',
  held: '#dff7ee', flow: '#bff3e1', done: '#fff1bf', maincharacter: '#ffe27a',
}

function Scene({ p, f }: { p: ComicPanel; f: FutureInput }) {
  const task = f.task.toUpperCase()
  switch (p.scene) {
    case 'buzz': return <g>
      <Kid x={130} y={300} mood="tempted" />
      <Desk />
      <Laptop x={120} y={400} screen={<text x={0} y={-36} textAnchor="middle" fontSize={13} fontWeight={800} fill={INK}>{task}</text>} />
      <Phone x={300} y={400} rot={-8}><path d="M-34 -20 l-10 -6 M-34 0 h-12 M34 -20 l10 -6 M34 0 h12" stroke={INK} strokeWidth={3} strokeLinecap="round" /></Phone>
      <Bubble x={186} y={250} w={200} lines={wrap(`${f.app}: ${f.text}`, 22).slice(0, 3)} size={15} />
    </g>
    case 'reels': return <g>
      <circle cx={200} cy={290} r={170} fill="#5ee7ff" opacity={0.18} />
      {[[60, 170, -12, '#ff4a1f'], [330, 190, 10, '#ffd23f'], [70, 330, 8, '#8b5cf6'], [335, 340, -10, '#3ee6b5']].map(([x, y, r, c], i) => (
        <g key={i} transform={`translate(${x} ${y}) rotate(${r})`}>
          <rect x={-30} y={-42} width={60} height={84} rx={8} fill={c as string} stroke={INK} strokeWidth={3} />
          <path d="M-8 -10 l18 10 l-18 10 Z" fill="#fff" />
          <text x={0} y={34} textAnchor="middle" fontFamily={FONT} fontSize={12} fontWeight={800} fill="#fff">♥ {[99, 412, '1.2k', '8k'][i]}</text>
        </g>
      ))}
      <Kid x={200} y={250} s={1.55} mood="zombie" />
      <Phone x={200} y={420} s={1.7} glow />
    </g>
    case 'night': return <g>
      <rect x={30} y={130} width={130} height={110} fill="#22305f" stroke={INK} strokeWidth={4} />
      <circle cx={120} cy={168} r={20} fill="#fff6c9" /><circle cx={130} cy={160} r={18} fill="#22305f" />
      <Sparkle x={60} y={160} s={0.5} c="#fff6c9" /><Sparkle x={80} y={215} s={0.4} c="#fff6c9" />
      <path d="M95 130 v110 M30 185 h130" stroke={INK} strokeWidth={4} />
      <Kid x={235} y={318} s={0.95} mood="zombie" />
      <circle cx={262} cy={360} r={50} fill="#9ff3ff" opacity={0.25} />
      <Desk fill="#5a3a24" />
      <Laptop x={110} y={400} tone="#3a3c42" screen={<text x={0} y={-34} textAnchor="middle" fontSize={20} fontWeight={800} fill="#a3a5aa">z z z</text>} />
      <g transform="translate(330 400)"><path d="M-20 -46 h40 l-5 46 h-30 Z" fill="#e9d3b4" stroke={INK} strokeWidth={4} /><path d="M20 -36 q16 0 12 14 q-3 8 -14 8" fill="none" stroke={INK} strokeWidth={4} />
        <path d="M-8 -60 q-6 -8 0 -14 M6 -58 q-6 -8 0 -14" stroke="#a3a5aa" strokeWidth={3} fill="none" opacity={0.5} /></g>
      <Phone x={262} y={392} s={0.8} glow />
    </g>
    case 'scrollfather': return <g>
      <Rays c="#ff4a1f" o={0.22} />
      {/* a throne of phones */}
      {Array.from({ length: 9 }).map((_, i) => <rect key={i} x={70 + (i % 3) * 90} y={300 + Math.floor(i / 3) * 62} width={80} height={56} rx={8} fill={i % 2 ? '#111' : '#26272b'} stroke="#ff4a1f" strokeWidth={3} />)}
      <rect x={60} y={180} width={280} height={130} rx={18} fill="#6b1d12" stroke={INK} strokeWidth={4} />
      <Kid x={200} y={210} s={1.05} mood="smug" hoodie="#1b1b1f" fedora />
      {/* the cat */}
      <g transform="translate(200 335)"><ellipse rx={46} ry={26} fill="#9ea2ab" stroke={INK} strokeWidth={4} /><circle cx={-34} cy={-16} r={18} fill="#9ea2ab" stroke={INK} strokeWidth={4} />
        <path d="M-48 -28 l4 -16 l9 10 M-28 -30 l6 -14 l5 14" fill="#9ea2ab" stroke={INK} strokeWidth={3} strokeLinejoin="round" />
        <path d="M-41 -16 h5 M-30 -16 h5" stroke={INK} strokeWidth={3} strokeLinecap="round" /></g>
    </g>
    case 'held': return <g>
      <Kid x={150} y={300} mood="focused" headphones />
      <Desk fill="#c98f5e" />
      <Laptop x={140} y={400} screen={<text x={0} y={-36} textAnchor="middle" fontSize={13} fontWeight={800} fill={INK}>{task}</text>} />
      <g transform="translate(305 412) rotate(90)"><rect x={-12} y={-34} width={24} height={68} rx={6} fill="#3a3c42" stroke={INK} strokeWidth={4} /></g>
      <g transform="translate(305 376)"><rect x={-34} y={-14} width={68} height={28} rx={14} fill="#3ee6b5" stroke={INK} strokeWidth={3} /><text y={6} textAnchor="middle" fontFamily={FONT} fontSize={15} fontWeight={900} fill={INK}>HELD</text></g>
    </g>
    case 'flow': return <g>
      <Rays c="#3ee6b5" n={18} cx={170} cy={300} o={0.4} />
      <Kid x={170} y={290} mood="focused" headphones />
      <path d="M100 392 q10 -14 20 0 M210 392 q10 -14 20 0" stroke={INK} strokeWidth={3} fill="none" />
      <Desk fill="#c98f5e" />
      <Laptop x={170} y={400} screen={<g><text x={0} y={-48} textAnchor="middle" fontSize={11} fontWeight={800} fill={INK}>{task}</text><rect x={-40} y={-36} width={80} height={10} rx={5} fill="#fff" stroke={INK} strokeWidth={2} /><rect x={-40} y={-36} width={60} height={10} rx={5} fill="#1aa37e" /></g>} />
      <Sparkle x={300} y={210} s={1.3} c="#fff" /><Sparkle x={330} y={300} s={0.9} /><Sparkle x={60} y={220} s={0.8} c="#fff" />
    </g>
    case 'done': return <g>
      <Rays c="#ffd23f" o={0.45} cx={160} cy={260} />
      <Kid x={160} y={270} mood="proud" armsUp />
      <Desk fill="#c98f5e" />
      <Laptop x={150} y={400} tone="#d6ffef" screen={<text x={0} y={-30} textAnchor="middle" fontSize={22} fontWeight={900} fill="#1aa37e">✓ DONE</text>} />
      <Phone x={320} y={392} rot={12}><path d="M0 4 c-10 -10 -14 -2 -8 4 l8 8 l8 -8 c6 -6 2 -14 -8 -4 Z" fill="#ff4a1f" /></Phone>
      <Bubble x={240} y={250} w={140} lines={['reel = reward']} size={14} />
    </g>
    case 'maincharacter': return <g>
      <Rays c="#fff" n={16} o={0.5} cx={200} cy={240} />
      <path d="M150 0 L250 0 L340 440 L60 440 Z" fill="#fff" opacity={0.35} />
      {[[60, 150, '#ff4a1f'], [330, 140, '#3ee6b5'], [90, 260, '#4b5bd6'], [320, 250, '#ff4a1f'], [200, 120, '#3ee6b5']].map(([x, y, c], i) => <rect key={i} x={x as number} y={y as number} width={12} height={6} transform={`rotate(${i * 37} ${x} ${y})`} fill={c as string} />)}
      <Kid x={200} y={250} s={1.05} mood="proud" halo shades wings />
      <rect x={120} y={392} width={160} height={70} fill="#ffd23f" stroke={INK} strokeWidth={4} />
      <text x={200} y={442} textAnchor="middle" fontFamily={FONT} fontSize={36} fontWeight={900} fill={INK}>#1</text>
      <Sparkle x={70} y={340} s={1.2} c="#fff" /><Sparkle x={335} y={330} s={1} c="#fff" />
    </g>
  }
}

/** One panel: scene, caption box, clock and sound effect. `uid` keeps pattern ids unique on the page. */
export function PanelArt({ p, f, uid }: { p: ComicPanel; f: FutureInput; uid: string }) {
  const lines = wrap(p.caption, 30).slice(0, 4)
  const dark = p.scene === 'reels' || p.scene === 'night' || p.scene === 'scrollfather'
  const capH = lines.length * 23 + 20
  return (
    <g>
      <defs>
        <pattern id={`dots-${uid}`} width={10} height={10} patternUnits="userSpaceOnUse"><circle cx={5} cy={5} r={1.6} fill={dark ? '#fff' : INK} /></pattern>
        <clipPath id={`clip-${uid}`}><rect width={PW} height={PH} /></clipPath>
      </defs>
      <g clipPath={`url(#clip-${uid})`}>
        <rect width={PW} height={PH} fill={BG[p.scene]} />
        <rect width={PW} height={PH} fill={`url(#dots-${uid})`} opacity={0.09} />
        <Scene p={p} f={f} />
        <rect x={14} y={14} width={PW - 28} height={capH} fill="#fff7d6" stroke={INK} strokeWidth={4} />
        <text x={28} y={40} fontFamily={FONT} fontSize={18} fontWeight={700} fill={INK}>
          {lines.map((l, i) => <tspan key={i} x={28} dy={i ? 23 : 0}>{l}</tspan>)}
        </text>
        <g transform={`translate(18 ${PH - 52})`}>
          <rect width={128} height={34} rx={17} fill={INK} stroke="#fff" strokeWidth={2} />
          <circle cx={18} cy={17} r={8} fill="none" stroke="#fff" strokeWidth={2.5} /><path d="M18 12 v5 h4" stroke="#fff" strokeWidth={2.5} fill="none" />
          <text x={34} y={23} fontFamily={FONT} fontSize={17} fontWeight={800} fill="#fff">{p.clock}</text>
        </g>
        <text x={PW - 22} y={PH - 26} textAnchor="end" transform={`rotate(-7 ${PW - 22} ${PH - 26})`} fontFamily={FONT} fontSize={30} fontWeight={900} fontStyle="italic"
          fill="#ffd23f" stroke={INK} strokeWidth={6} paintOrder="stroke" strokeLinejoin="round">{p.sfx}</text>
      </g>
      <rect x={2} y={2} width={PW - 4} height={PH - 4} fill="none" stroke={INK} strokeWidth={6} />
    </g>
  )
}

/**
 * The shareable poster: a 1080 × 1920 story with all four panels, the ending's title and the honest small print.
 * Rendered off-screen and rasterised; no web fonts, so what you see is what the PNG gets.
 */
export function ComicPoster({ e, f, cost, range, uid }: { e: Ending; f: FutureInput; cost: number; range?: string; uid: string }) {
  const A = e.side === 'a'
  const pw = 500, ph = 625
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={1080} height={1920} viewBox="0 0 1080 1920">
      <rect width={1080} height={1920} fill={A ? '#ff4a1f' : '#3ee6b5'} />
      <text x={540} y={92} textAnchor="middle" fontFamily={FONT} fontSize={38} fontWeight={700} fill={INK}>If I open this {f.app} ping…</text>
      <text x={540} y={150} textAnchor="middle" fontFamily={FONT} fontSize={30} fontWeight={900} letterSpacing={12} fill={INK}>{A ? 'ENDING A' : 'ENDING B'}</text>
      <text x={540} y={240} textAnchor="middle" fontFamily={FONT} fontSize={e.title.length > 14 ? 84 : 96} fontWeight={900} fill={INK}>{e.title.toUpperCase()}</text>
      <text x={540} y={300} textAnchor="middle" fontFamily={FONT} fontSize={32} fontStyle="italic" fill={INK}>“{e.tagline}”</text>
      {e.panels.map((p, i) => (
        <svg key={i} x={25 + (i % 2) * (pw + 30)} y={340 + Math.floor(i / 2) * (ph + 30)} width={pw} height={ph} viewBox={`0 0 ${PW} ${PH}`}>
          <PanelArt p={p} f={f} uid={`${uid}-p${i}`} />
        </svg>
      ))}
      <text x={540} y={1720} textAnchor="middle" fontFamily={FONT} fontSize={44} fontWeight={800} fill={INK}>
        {A ? `Predicted cost: ${cost} focus min` : `Held it. Saved ~${cost} focus min`}
      </text>
      <text x={540} y={1775} textAnchor="middle" fontFamily={FONT} fontSize={30} fill={INK}>{range ? `80% range ${range} min · ` : ''}an estimate, not a prophecy</text>
      <text x={540} y={1860} textAnchor="middle" fontFamily={FONT} fontSize={38} fontWeight={900} letterSpacing={8} fill={INK}>PARALLEL</text>
    </svg>
  )
}
