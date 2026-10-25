/** Door to the Future: turns one ping's predictions into two four-panel comics. */
import { GENERIC, SCRIPTS } from './universes'

export type Scene = 'buzz' | 'reels' | 'night' | 'scrollfather' | 'held' | 'flow' | 'done' | 'maincharacter' | 'plottwist'
export type Mood = 'tempted' | 'zombie' | 'smug' | 'focused' | 'proud'
export type ComicPanel = { scene: Scene; mood: Mood; clock: string; caption: string; sfx: string }
export type Ending = { side: 'a' | 'b'; title: string; tagline: string; panels: ComicPanel[] }

/** An engagement tactic the backend's Manipulation X-ray found in a ping's wording. */
export type Tactic = { tactic: string; label: string; explain: string }
/** What a peek needs. The Multiverse passes a full simulation; the inbox passes its lighter estimate. */
export type FutureInput = {
  category: string; app: string; text: string; task: string; hour: number
  cost: number; p10?: number; p90?: number; holdCost: number
  xray?: Tactic[]; usually?: string | null
}

export function clockAt(hour: number, plusMin = 0) {
  const t = Math.round(hour * 60 + plusMin)
  const h = Math.floor(t / 60) % 24, m = ((t % 60) + 60) % 60
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}

const fill = (s: string, task: string) => s.replaceAll('{task}', task.toLowerCase()).replace(/^Year 2047: /, '')

export function buildFutures(f: FutureInput): { a: Ending; b: Ending } {
  const sc = SCRIPTS[f.category] ?? GENERIC
  const worst = f.p90 ?? f.cost
  const A = sc.a.map((s) => fill(s, f.task)), B = sc.b.map((s) => fill(s, f.task))
  return {
    a: {
      side: 'a', title: 'The Scrollfather', tagline: 'I’m gonna make you a reel you can’t refuse.',
      panels: [
        { scene: 'buzz', mood: 'tempted', clock: clockAt(f.hour), caption: A[0], sfx: 'BZZT!' },
        { scene: 'reels', mood: 'zombie', clock: clockAt(f.hour, 2), caption: A[1], sfx: 'scroll scroll' },
        { scene: 'night', mood: 'zombie', clock: clockAt(f.hour, f.cost), caption: A[2], sfx: 'chai: cold' },
        { scene: 'scrollfather', mood: 'smug', clock: clockAt(f.hour, worst), caption: `Year 2047: ${A[3]}`, sfx: 'THE END?' },
      ],
    },
    b: {
      side: 'b', title: 'Main Character', tagline: 'The plot was always about you.',
      panels: [
        { scene: 'held', mood: 'focused', clock: clockAt(f.hour), caption: B[0], sfx: 'shhh…' },
        { scene: 'flow', mood: 'focused', clock: clockAt(f.hour, 25), caption: B[1], sfx: 'CLICK!' },
        { scene: 'done', mood: 'proud', clock: clockAt(f.hour, 50), caption: B[2], sfx: 'DONE!' },
        { scene: 'maincharacter', mood: 'proud', clock: clockAt(f.hour, 50 + f.holdCost), caption: `Year 2047: ${B[3]}`, sfx: '✦ ✦ ✦' },
      ],
    },
  }
}

/** The fifth panel, when reality disagrees with the twin. */
export function plotTwist(predicted: number, actual: number, hour: number): ComicPanel {
  const beat = actual < predicted
  return {
    scene: 'plottwist', mood: beat ? 'proud' : 'tempted', clock: clockAt(hour, actual),
    caption: beat
      ? `…plot twist. Twin said ${predicted} min. You did it in ${actual}. The algorithm got humbled.`
      : `…plot twist. Twin said ${predicted} min. It took ${actual}. Noted. Updating the model.`,
    sfx: beat ? 'HUMBLED' : 'oof',
  }
}

/** Greedy word wrap for SVG text, which has no layout of its own. */
export function wrap(text: string, max: number) {
  const lines: string[] = []
  let line = ''
  for (const w of text.split(/\s+/)) {
    if ((line + ' ' + w).trim().length > max && line) { lines.push(line); line = w } else line = (line + ' ' + w).trim()
  }
  if (line) lines.push(line)
  return lines
}
