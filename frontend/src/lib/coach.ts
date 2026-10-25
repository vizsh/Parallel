/** Coach copilot: the shapes of cards and actions the coach returns, and how the app runs an action. */
import { api } from './api'
import { feel } from './feel'
import type { Tactic } from './future'
import { queueFutureText, queueReminder } from './futureTexts'

export type Row = { label: string; value: string | number }
export type PingCardT = { type: 'ping'; category: string; app: string; label: string; text: string; cost: number; p10: number; p50: number; p90: number; p_rabbit: number; hold_cost: number; saved: number; rec: string; why: string; guard?: string | null; confidence: number; xray: Tactic[]; usually?: string | null; hour: number; task: string }
export type ReceiptCardT = { type: 'receipt'; period: 'day' | 'week' | 'app'; title: string; app?: string | null; rows: { app: string; opens: number; lost: number; held: number }[]; pings: number; opened: number; lost: number; held: number; protected: number; aura: number; priciest?: { app: string; at: string; minutes: number; task: string } | null; prev_lost?: number; change?: number; best_day?: { day: string; minutes: number } | null; longest_block?: number; archetype?: string | null; rabbit_pct?: number; longest?: number }
export type Card =
  | PingCardT
  | ReceiptCardT
  | { type: 'compare'; items: { category: string; app: string; label: string; cost: number; p_rabbit: number; rec: string }[]; verdict: string }
  | { type: 'plan'; items: { hour: number; at: string; label: string; kind: 'focus' | 'check' | 'light' | 'wind' }[]; deadline?: { title: string; days_left: number } | null; golden: { start: string; end: string } }
  | { type: 'jar'; count: number; groups: { app: string; n: number; sample: string }[]; next?: string | null }
  | { type: 'fingerprint'; hourly: number[]; best: { start: number; end: number; quality: number }; now: number; onset: string }
  | { type: 'aura'; aura?: { week: number; total: number; tier: string; line: string }; fate?: { value: number; label: string; decisions_today: number } }
  | { type: 'evidence'; facts: Row[]; top_app?: string | null }
  | { type: 'xray'; text: string; category: string; label: string; tags: Tactic[]; usually?: string | null; verdict: string }
  | { type: 'memory'; items: Row[]; told: { id: number; kind: string; text: string }[] }
  | { type: 'draft'; text: string; app: string; sendable: boolean; note: string }
  | { type: 'commands'; items: { cmd: string; desc: string }[] }

export type Action = { label: string; kind: string; payload?: Record<string, unknown>; auto?: boolean }
export type Done = { ok: boolean; message: string; undo?: { kind: string; id: number; session?: number | null }; card?: Card; until?: string }

/** Run an action locally or on the server. `ask` and `peek` are handled by the caller (they need the chat or a modal). */
export async function runAction(a: Action, uid?: number): Promise<Done> {
  const p = (a.payload ?? {}) as Record<string, unknown>
  if (a.kind === 'decide') {
    const choice = p.choice as 'allow' | 'delay'
    const r = await api<{ xp_gained: number }>('/interventions', { body: { category: p.category, choice, predicted_cost: p.cost, saved: choice === 'allow' ? 0 : p.saved, text: p.text } })
    feel(choice === 'allow' ? 'allow' : 'hold')
    queueFutureText(uid, { side: choice === 'allow' ? 'a' : 'b', category: String(p.category), app: String(p.app ?? 'that app'), minutes: choice === 'allow' ? Number(p.cost) : 1 })
    return { ok: true, message: choice === 'allow' ? `Opened on purpose · +${r.xp_gained} XP` : `Held for your checkpoint · +${r.xp_gained} XP` }
  }
  if (a.kind === 'remind') {
    await queueReminder(uid, String(p.text), Number(p.at))
    feel('success')
    return { ok: true, message: `Reminder set for ${new Date(Number(p.at)).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.` }
  }
  const r = await api<Done>('/coach/action', { body: { kind: a.kind, payload: p } })
  feel(a.kind === 'undo' ? 'tick' : 'success')
  return r
}

export const COMMANDS = [
  { cmd: '/receipt', desc: 'Today’s attention receipt' },
  { cmd: '/week', desc: 'Your week, Wrapped-style' },
  { cmd: '/plan', desc: 'Plan the rest of your day' },
  { cmd: '/hold 2h', desc: 'Hold everything except VIPs' },
  { cmd: '/focus 50', desc: 'Start a focus block' },
  { cmd: '/jar', desc: 'What’s waiting in your jar' },
  { cmd: '/why', desc: 'Why the twin decided that' },
  { cmd: '/xray ', desc: 'Paste a notification to see its tricks' },
  { cmd: '/aura', desc: 'Aura and today’s fate meter' },
  { cmd: '/me', desc: 'What the coach knows about you' },
  { cmd: '/help', desc: 'Everything the coach can do' },
]

/** Chips that fit the time of day, for an empty chat. */
export function chipsFor(hour: number): string[] {
  if (hour < 5 || hour >= 22) return ['Should I sleep or finish this?', 'Show today’s receipt', 'Wind down', 'Why am I so tired?']
  if (hour < 11) return ['Plan my day', 'What should I do right now?', 'When do I focus best?', '/week']
  if (hour < 17) return ['I can’t focus', 'Should I open this Instagram like?', 'Hold everything for 1 hour', 'What’s waiting in my jar?']
  return ['Plan my evening', 'Show today’s receipt', 'Instagram vs YouTube?', 'How do I stop doomscrolling?']
}

/** Looks like a pasted notification (app name + message, or the usual bait wording). */
export function looksLikeNotification(text: string) {
  const t = text.trim()
  return t.length > 18 && !t.startsWith('/') && !t.endsWith('?') &&
    /(liked|commented|mentioned|new notifications|see what you missed|miss you|sale|% off|streak|new video|breaking|sent you|is live|replied)/i.test(t)
}
