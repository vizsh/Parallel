import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'motion/react'
import { Bell, Clock, Copy, Inbox as InboxIcon, Layers, List, MessageSquareReply, Pause, Play, ShieldCheck } from 'lucide-react'
import { PageHead } from './AppShell'
import { Panel } from '@/components/charts'
import FuturePeek from '@/components/FuturePeek'
import HeldJar from '@/components/HeldJar'
import Receipt from '@/components/Receipt'
import SwipeDeck, { type Swipe } from '@/components/SwipeDeck'
import { api } from '@/lib/api'
import { useAuth } from '@/lib/auth'
import { toast, useApi } from '@/lib/hooks'
import { useSeo } from '@/lib/seo'

type Item = { id: string; category: string; label: string; app: string; text: string; minutes_ago: number; recommendation: string; why: string; cost: number; saved: number; p_open: number; confidence: number }
type Digest = { pending: number; due: number; groups: { category: string; label: string; next_release: number; items: { id: number; text: string; mode: string; release_at: number }[] }[] }

const REC = {
  allow: { label: 'Let through', cls: 'bg-calm text-field-ink' },
  delay: { label: 'Hold back', cls: 'bg-chaos text-field-ink' },
  summarize: { label: 'Digest', cls: 'bg-ink text-field-ink' },
  ask: { label: 'Your call', cls: 'bg-surface-2 text-ink' },
} as Record<string, { label: string; cls: string }>

export default function Inbox() {
  useSeo('Smart inbox', 'Live notification triage: each ping with its predicted cost and your twin’s call.', '/app/inbox', { noindex: true })
  const { user, setUser } = useAuth()
  const q = useApi<Item[]>('/notifications/queue')
  const digest = useApi<Digest>('/digest')
  const [done, setDone] = useState<Record<string, string>>({})
  const [xpBy, setXpBy] = useState<Record<string, number>>({})
  const [reply, setReply] = useState<Record<string, string>>({})
  // Phones get the swipe deck by default; desktops keep the scannable list.
  const [mode, setMode] = useState<'swipe' | 'list'>(() => (window.matchMedia('(max-width: 1023px)').matches ? 'swipe' : 'list'))
  const { i18n } = useTranslation()
  const [peek, setPeek] = useState<Item | null>(null)
  const future = useMemo(() => peek && ({
    category: peek.category, app: peek.app, text: peek.text, task: 'work', hour: new Date().getHours() + new Date().getMinutes() / 60,
    cost: peek.cost, holdCost: Math.max(0, +(peek.cost - peek.saved).toFixed(1)),
  }), [peek])
  async function draft(it: Item) {
    const r = await api<{ text: string }>(`/autoreply?category=${it.category}&lang=${i18n.language}`)
    setReply((x) => ({ ...x, [it.id]: r.text }))
  }

  async function act(it: Item, choice: 'allow' | 'delay' | 'summarize', quiet = false) {
    const r = await api<{ xp_gained: number; stats: { xp: number } }>('/interventions', { body: { category: it.category, choice, predicted_cost: it.cost, saved: choice === 'allow' ? 0 : it.saved, text: it.text } })
    setDone((d) => ({ ...d, [it.id]: choice }))
    setXpBy((x) => ({ ...x, [it.id]: r.xp_gained }))
    if (user) setUser({ ...user, xp: r.stats.xp })
    toast(choice === 'allow' ? `Opened on purpose · +${r.xp_gained} XP` : `Queued · +${r.xp_gained} XP`, choice === 'allow' ? 'chaos' : 'calm', quiet)
    digest.reload()
  }
  async function swiped(it: Item, d: Swipe) {
    try {
      // Noise is a hold that also teaches the twin this kind of ping didn't matter.
      if (d === 'noise') await api('/feedback/matter', { body: { category: it.category, mattered: false } })
      await act(it, ({ allow: 'allow', hold: 'delay', digest: 'summarize', noise: 'delay' } as const)[d], true)
    } catch (e) { toast((e as Error).message, 'chaos') }
  }
  async function acceptAll() {
    for (const it of (q.data ?? []).filter((i) => !done[i.id] && i.recommendation !== 'ask')) await act(it, it.recommendation as 'allow' | 'delay' | 'summarize')
  }
  async function release(quiet = false) {
    const r = await api<{ released: number }>('/digest/release', { method: 'POST' })
    toast(`${r.released} notifications delivered in one calm batch`, 'calm', quiet); digest.reload()
  }

  const items = q.data ?? []
  const pending = items.filter((i) => !done[i.id])
  const saved = items.filter((i) => done[i.id] && done[i.id] !== 'allow').reduce((a, i) => a + i.saved, 0)

  return (
    <>
      {future && peek && <FuturePeek input={future} open onClose={() => setPeek(null)} onChoose={(s) => swiped(peek, s === 'a' ? 'allow' : 'hold')} />}
      <PageHead title="Smart inbox" sub="Every ping, triaged by what it would cost you right now. Trusted senders always pass. Nothing here reads message content."
        action={
          <div className="flex flex-wrap gap-2">
            <div className="flex bg-surface p-1 rounded-xl" role="radiogroup" aria-label="Inbox view">
              {([['swipe', Layers, 'Swipe'], ['list', List, 'List']] as const).map(([m, I, l]) => (
                <button key={m} role="radio" aria-checked={mode === m} onClick={() => setMode(m)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg small ${mode === m ? 'bg-surface-2 text-ink' : 'text-muted'}`}><I size={15} aria-hidden /> {l}</button>
              ))}
            </div>
            <button onClick={acceptAll} disabled={!pending.length} className="btn"><ShieldCheck size={18} /> Accept all twin calls</button>
          </div>} />
      <div className="grid gap-3 xl:grid-cols-12">
        <section className="xl:col-span-8 flex flex-col gap-2" aria-label="Incoming notifications">
          {items.length > 0 && pending.length === 0 && (
            <div className="py-2 mb-2"><Receipt lines={items.map((it) => ({ app: it.app, label: it.label, choice: done[it.id], saved: it.saved, xp: xpBy[it.id] ?? 0 }))} /></div>
          )}
          {mode === 'swipe' && pending.length > 0 && <div className="py-2 mb-2"><SwipeDeck items={pending} onSwipe={(it, d) => swiped(it as Item, d)} onPeek={(it) => setPeek(it as Item)} /></div>}
          {mode === 'swipe' && Object.keys(done).length > 0 && <h2 className="small text-muted mt-2">Decided</h2>}
          <AnimatePresence initial={false}>
            {items.filter((it) => mode === 'list' || done[it.id]).map((it) => {
              const r = REC[it.recommendation] ?? REC.ask
              const d = done[it.id]
              return (
                <motion.article key={it.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: d ? 0.55 : 1, y: 0 }}
                  className="panel p-4 sm:p-5 grid sm:grid-cols-[1fr_auto] gap-4 items-center">
                  <div className="flex gap-4 items-start">
                    <span className="grid place-items-center w-10 h-10 bg-surface-2 shrink-0"><Bell size={18} /></span>
                    <div className="min-w-0">
                      <p className="small text-muted">{it.app} · {it.label} · {it.minutes_ago} min ago</p>
                      <p className="font-medium">{it.text}</p>
                      <p className="small text-muted mt-1">{Math.round(it.p_open * 100)}% you’d open it · ~{it.cost} min expected cost · {Math.round(it.confidence * 100)}% confidence</p>
                      <p className="small mt-2"><span className={`px-2 py-0.5 mr-2 font-medium ${r.cls}`}>{r.label}</span><span className="text-muted">{it.why}</span></p>
                    </div>
                  </div>
                  {d ? (
                    <div className="text-right flex flex-col items-end gap-2">
                      <p className="small font-medium">{d === 'allow' ? 'Opened' : d === 'delay' ? 'Held for checkpoint' : 'In tonight’s digest'}</p>
                      {d !== 'allow' && ['social_dm', 'work_chat', 'family'].includes(it.category) && !reply[it.id] && (
                        <button onClick={() => draft(it)} className="small flex items-center gap-1.5 text-calm hover:underline"><MessageSquareReply size={14} /> Draft auto-reply</button>
                      )}
                    </div>
                  ) : (
                    <div className="flex sm:flex-col gap-1.5">
                      <button onClick={() => act(it, 'allow')} className="btn btn-ghost !py-1.5 !px-3 small"><Play size={14} /> Allow</button>
                      <button onClick={() => act(it, 'delay')} className="btn !py-1.5 !px-3 small"><Pause size={14} /> Hold</button>
                      <button onClick={() => act(it, 'summarize')} className="btn btn-calm !py-1.5 !px-3 small"><InboxIcon size={14} /> Digest</button>
                    </div>
                  )}
                  {reply[it.id] && (
                    <div className="sm:col-span-2 bg-bg p-3 flex items-start gap-3">
                      <p className="flex-1 small">{reply[it.id]}</p>
                      <button onClick={() => { navigator.clipboard?.writeText(reply[it.id]); toast('Copied. Parallel never sends messages for you.') }} className="small flex items-center gap-1 text-muted hover:text-ink"><Copy size={14} /> Copy</button>
                    </div>
                  )}
                </motion.article>
              )
            })}
          </AnimatePresence>
          {q.loading && <p className="text-muted">Triaging…</p>}
        </section>
        <div className="xl:col-span-4 flex flex-col gap-3">
          <Panel title="Protected this session" sub="From the notifications you held or digested here.">
            <p className="text-5xl font-semibold text-calm tabular-nums">{saved.toFixed(1)}<span className="text-lg text-muted font-normal"> min</span></p>
          </Panel>
          <Panel title="Deferred queue" sub="Released at your next checkpoint or in the evening digest." action={<button onClick={() => release()} disabled={!digest.data?.pending} className="btn btn-calm !py-1.5 !px-3 small">Deliver now</button>}>
            <div className="mb-4"><HeldJar items={digest.data?.groups.flatMap((g) => g.items.map((i) => ({ id: i.id, category: g.category }))) ?? []} onPour={() => release(true)} /></div>
            {digest.data && digest.data.pending === 0 && <p className="text-muted small">Nothing waiting. Inbox zero, the calm kind.</p>}
            <ul className="flex flex-col gap-3">
              {digest.data?.groups.map((g) => (
                <li key={g.category} className="bg-surface-2 p-3">
                  <p className="flex justify-between font-medium"><span>{g.label}</span><span className="small text-muted">{g.items.length}</span></p>
                  <p className="small text-muted flex items-center gap-1"><Clock size={13} /> next release {new Date(g.next_release * 1000).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</p>
                  <ul className="mt-2 small text-muted list-disc pl-4">{g.items.slice(0, 3).map((i) => <li key={i.id}>{i.text}</li>)}</ul>
                </li>
              ))}
            </ul>
            <p className="small text-muted mt-4">Preview without the rabbit hole: you see the gist here, without opening the app’s feed.</p>
          </Panel>
        </div>
      </div>
    </>
  )
}
