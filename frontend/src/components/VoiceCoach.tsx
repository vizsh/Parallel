import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'motion/react'
import { Mic, MicOff, Send, Sparkles, Square, Volume2, VolumeX, X } from 'lucide-react'
import { api } from '@/lib/api'
import { onSpeakingChange, speak as speakText, stop as stopSpeech } from '@/lib/speech'
import { LANGS } from '@/lib/i18n'
import { ForkMark } from './Brand'
import { CardView, DoneLine } from './CoachCards'
import FuturePeek from './FuturePeek'
import { useAuth } from '@/lib/auth'
import { chipsFor, COMMANDS, looksLikeNotification, runAction, type Action, type Card, type Done, type PingCardT } from '@/lib/coach'

type Msg = { role: 'user' | 'twin'; text: string; card?: { type: string; category?: string } | null; suggest?: string[]; source?: 'claude' | 'rules'
  headline?: string; cards?: Card[]; actions?: Action[]; done?: Done | null; acted?: Done[] }
type Reply = { reply: string; card: Msg['card']; suggest?: string[]; source?: Msg['source']; headline?: string; cards?: Card[]; actions?: Action[]; done?: Done | null }

const CARD_LINKS: Record<string, { to: string; label: string }> = {
  simulate: { to: '/app/multiverse', label: 'Open in Multiverse' },
  fingerprint: { to: '/app/fingerprint', label: 'See your fingerprint' },
  apps: { to: '/app/fingerprint#apps', label: 'See app fragmentation' },
  recommendations: { to: '/app', label: 'See all recommendations' },
  accuracy: { to: '/app/accuracy', label: 'See accuracy report' },
}

const SUGGEST: Record<string, string[]> = {
  en: ['Should I open this Instagram like?', 'What should I do right now?', 'Plan my evening', 'How much time did I lose this week?', 'Instagram vs YouTube?', 'How do I stop doomscrolling?'],
  hi: ['क्या मैं यह इंस्टा लाइक खोलूं?', 'मैं कब सबसे अच्छा फोकस करता हूँ?', 'कौन सा ऐप ध्यान भटकाता है?', 'क्या मैं थक गया हूँ?'],
  mr: ['ही इन्स्टा सूचना उघडू का?', 'माझा फोकस कधी सर्वोत्तम असतो?', 'कोणते ॲप लक्ष विचलित करते?', 'मी थकलो आहे का?'],
  es: ['¿Debería abrir este me gusta de Instagram?', '¿Cuándo me concentro mejor?', '¿Qué app me distrae más?', '¿Estoy cansado?'],
}

function getRecognition(): any {
  const w = window as any
  const SR = w.SpeechRecognition || w.webkitSpeechRecognition
  return SR ? new SR() : null
}

export function useCoach() {
  const { i18n } = useTranslation()
  const lang = i18n.language as 'en' | 'hi' | 'mr' | 'es'
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [busy, setBusy] = useState(false)
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [speaking, setSpeakingState] = useState(false)
  const [speak, setSpeakPref] = useState(() => { try { return localStorage.getItem('parallel.voice') !== 'off' } catch { return true } })
  const [tone, setToneState] = useState<'plain' | 'genz'>(() => { try { return localStorage.getItem('parallel.coachTone') === 'genz' ? 'genz' : 'plain' } catch { return 'plain' } })
  const { user } = useAuth()
  const recRef = useRef<any>(null)
  const reqRef = useRef<AbortController | null>(null)
  const supported = typeof window !== 'undefined' && !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
  const speechLang = LANGS.find((l) => l.code === lang)?.speech ?? 'en-IN'

  useEffect(() => onSpeakingChange(setSpeakingState), [])

  // Any click or key press anywhere stops the twin talking (except the voice controls themselves).
  useEffect(() => {
    if (!speaking) return
    const halt = (e: Event) => {
      if ((e.target as HTMLElement)?.closest?.('[data-voice-control]')) return
      stopSpeech()
    }
    window.addEventListener('pointerdown', halt, true)
    window.addEventListener('keydown', halt, true)
    return () => { window.removeEventListener('pointerdown', halt, true); window.removeEventListener('keydown', halt, true) }
  }, [speaking])

  function setTone(v: 'plain' | 'genz') { setToneState(v); try { localStorage.setItem('parallel.coachTone', v) } catch { /* ignore */ } }
  /** Attach an action's result to a message (Done line, Undo). */
  function attach(i: number, d: Done) { setMsgs((m) => m.map((x, j) => (j === i ? { ...x, acted: [...(x.acted ?? []), d] } : x))) }

  function setSpeak(v: boolean) {
    setSpeakPref(v)
    try { localStorage.setItem('parallel.voice', v ? 'on' : 'off') } catch { /* ignore */ }
    if (!v) stopSpeech()
  }

  async function ask(text: string) {
    if (!text.trim()) return
    stopSpeech()
    reqRef.current?.abort()
    const ctrl = new AbortController()
    reqRef.current = ctrl
    const timer = window.setTimeout(() => ctrl.abort(), 25000)
    setMsgs((m) => [...m, { role: 'user', text }])
    setBusy(true)
    try {
      const r = await api<Reply>('/assistant', { body: { text, lang, tone }, signal: ctrl.signal })
      setMsgs((m) => [...m, { role: 'twin', text: r.reply, card: r.card, suggest: r.suggest, source: r.source, headline: r.headline, cards: r.cards, actions: r.actions, done: r.done }])
      for (const a of r.actions ?? []) if (a.auto) runAction(a, user?.id).catch(() => {}) // e.g. a reminder you asked for
      if (speak) speakText([r.headline, r.reply].filter(Boolean).join('. '), speechLang)
    } catch (e) {
      if (ctrl.signal.aborted && reqRef.current !== ctrl) return // superseded by a newer question
      setMsgs((m) => [...m, { role: 'twin', text: ctrl.signal.aborted ? 'That took too long. Try again in a moment.' : (e as Error).message }])
    } finally {
      window.clearTimeout(timer)
      if (reqRef.current === ctrl) { setBusy(false); reqRef.current = null }
    }
  }

  // Listening session: continuous recognition that waits for a natural pause before sending.
  const sessionRef = useRef<{ active: boolean; text: string; last: number; timer: number; started: number } | null>(null)

  function finishListening(send: boolean) {
    const ses = sessionRef.current
    if (!ses) return
    ses.active = false
    window.clearTimeout(ses.timer)
    sessionRef.current = null
    try { recRef.current?.stop() } catch { /* ignore */ }
    setListening(false)
    setInterim('')
    if (send && ses.text.trim()) ask(ses.text.trim())
  }

  function startRecognizer() {
    const ses = sessionRef.current
    if (!ses) return
    const rec = getRecognition()
    if (!rec) { finishListening(false); return }
    rec.lang = speechLang
    rec.continuous = true      // don't stop at the first short pause
    rec.interimResults = true  // show words as they are heard
    rec.maxAlternatives = 1
    let committed = ''         // final text from this recognizer instance
    const base = ses.text
    rec.onresult = (e: any) => {
      let live = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]
        if (r.isFinal) committed += r[0].transcript
        else live += r[0].transcript
      }
      ses.text = (base + ' ' + committed).replace(/\s+/g, ' ').trim()
      setInterim((ses.text + ' ' + live).replace(/\s+/g, ' ').trim())
      ses.last = Date.now()
      // send after ~2 s of silence once something has been said
      window.clearTimeout(ses.timer)
      ses.timer = window.setTimeout(() => finishListening(true), live ? 2600 : 2000)
    }
    rec.onerror = (e: any) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed' || e.error === 'audio-capture') finishListening(false)
    }
    rec.onend = () => {
      // Chrome ends sessions on its own; if the user is still talking (or hasn't started yet), keep going
      if (!ses.active) return
      const quietFor = Date.now() - ses.last
      const waitedFor = Date.now() - ses.started
      if ((ses.text && quietFor < 2000) || (!ses.text && waitedFor < 9000)) startRecognizer()
      else finishListening(true)
    }
    recRef.current = rec
    try { rec.start() } catch { /* already started */ }
  }

  function listen() {
    stopSpeech() // never let the mic hear the twin's own voice
    if (sessionRef.current?.active) { finishListening(true); return } // tap again = done talking, send it
    if (!supported) return
    sessionRef.current = { active: true, text: '', last: Date.now(), timer: 0, started: Date.now() }
    setListening(true)
    setInterim('')
    startRecognizer()
  }

  useEffect(() => () => { if (sessionRef.current) sessionRef.current.active = false; recRef.current?.abort?.(); reqRef.current?.abort(); stopSpeech() }, [])

  return { msgs, busy, ask, listen, listening, interim, supported, speak, setSpeak, speaking, stop: stopSpeech, lang, tone, setTone, attach, uid: user?.id }
}

export function CoachChat({ coach, tall = false }: { coach: ReturnType<typeof useCoach>; tall?: boolean }) {
  const { t } = useTranslation()
  const [text, setText] = useState('')
  const [peek, setPeek] = useState<PingCardT | null>(null)
  const [busyAct, setBusyAct] = useState<string | null>(null)
  const end = useRef<HTMLDivElement>(null)
  const slash = text.startsWith('/') && !text.includes(' ') ? COMMANDS.filter((c) => c.cmd.startsWith(text.toLowerCase())) : []

  async function act(i: number, a: Action) {
    if (a.kind === 'ask') return coach.ask(String(a.payload?.text ?? ''))
    if (a.kind === 'peek') return setPeek(a.payload as unknown as PingCardT)
    const key = `${i}-${a.label}`
    setBusyAct(key)
    try { coach.attach(i, await runAction(a, coach.uid)) } catch (e) { coach.attach(i, { ok: false, message: (e as Error).message }) } finally { setBusyAct(null) }
  }
  async function undo(i: number, d: Done) {
    try { coach.attach(i, await runAction({ label: 'Undo', kind: 'undo', payload: d.undo }, coach.uid)) } catch { /* already undone */ }
  }
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }) }, [coach.msgs.length, coach.busy])
  return (
    <div className={`flex flex-col ${tall ? 'h-[calc(100svh-17rem)] lg:h-[calc(100svh-220px)] min-h-[420px]' : 'h-[460px]'}`}>
      <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-1" aria-live="polite">
        {coach.msgs.length === 0 && (
          <div className="text-muted small">
            <p>{t('coach.hint')}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(coach.lang === 'en' ? chipsFor(new Date().getHours()) : SUGGEST[coach.lang] ?? SUGGEST.en).map((s) => (
                <button key={s} onClick={() => coach.ask(s)} className="bg-surface-2 hover:bg-bg text-ink px-3 py-2 text-left">{s}</button>
              ))}
            </div>
          </div>
        )}
        {coach.msgs.map((m, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className={`px-4 py-3 ${m.role === 'user' ? 'max-w-[88%] self-end bg-chaos text-field-ink' : `self-start bg-surface-2 ${m.cards?.length ? 'w-full max-w-[96%]' : 'max-w-[88%]'}`}`}>
            {m.headline && <p className="text-[1.05rem] font-semibold leading-snug">{m.headline}</p>}
            {m.text && <p className={`text-[1rem] leading-snug ${m.headline ? 'mt-1 text-ink/90' : ''}`}>{m.text}</p>}
            {m.done && <div className="mt-2"><DoneLine d={m.done} onUndo={() => undo(i, m.done!)} /></div>}
            {m.cards?.length ? <div className="mt-2.5 flex flex-col gap-2">{m.cards.map((c, n) => <CardView key={n} c={c} onAsk={coach.ask} onForget={(id) => act(i, { label: 'Forget', kind: 'forget', payload: { id } })} />)}</div> : null}
            {m.actions?.some((a) => !a.auto) && (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {m.actions.filter((a) => !a.auto).map((a) => (
                  <motion.button key={a.label} whileTap={{ scale: 0.95 }} disabled={busyAct === `${i}-${a.label}`} onClick={() => act(i, a)}
                    className={`rounded-full px-3.5 py-2 small font-semibold disabled:opacity-50 ${a.kind === 'peek' ? 'bg-[#ffd23f] text-field-ink' : a.kind === 'decide' && a.payload?.choice === 'allow' ? 'bg-bg text-ink ring-1 ring-white/15' : 'bg-calm text-field-ink'}`}>
                    {a.label}
                  </motion.button>
                ))}
              </div>
            )}
            {m.acted?.map((d, n) => <div key={n} className="mt-2"><DoneLine d={d} onUndo={d.undo ? () => undo(i, d) : undefined} /></div>)}
            {m.card && CARD_LINKS[m.card.type] && (
              <Link to={CARD_LINKS[m.card.type].to + (m.card.category ? `?category=${m.card.category}` : '')} className="mt-2 inline-block small underline text-calm">{CARD_LINKS[m.card.type].label}</Link>
            )}
            {m.role === 'twin' && m.source && <span className="block mt-1.5 text-[10px] uppercase tracking-wider text-muted">{m.source === 'claude' ? 'Claude · grounded in your numbers' : 'Twin · from your models'}</span>}
          </motion.div>
        ))}
        {!coach.busy && (() => { // follow-up chips under the latest reply, so a conversation keeps going with one tap
          const last = coach.msgs[coach.msgs.length - 1]
          return last?.role === 'twin' && last.suggest?.length ? (
            <div className="flex flex-wrap gap-1.5 -mt-1">
              {last.suggest.map((s) => <button key={s} onClick={() => coach.ask(s)} className="rounded-full border border-surface-2 hover:border-calm px-3 py-1.5 small">{s}</button>)}
            </div>
          ) : null
        })()}
        {coach.busy && (
          <div className="self-start bg-surface-2 px-4 py-3 flex gap-1" aria-label="Thinking with your data">
            {[0, 1, 2].map((i) => <motion.span key={i} className="w-1.5 h-1.5 rounded-full bg-muted" animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.9, delay: i * 0.15 }} />)}
          </div>
        )}
        <div ref={end} />
      </div>
      {slash.length > 0 && (
        <ul className="mt-2 rounded-xl bg-bg ring-1 ring-white/10 p-1.5 max-h-48 overflow-y-auto" role="listbox" aria-label="Commands">
          {slash.map((c) => (
            <li key={c.cmd}><button type="button" onClick={() => { if (c.cmd.includes(' ')) setText(c.cmd); else { coach.ask(c.cmd); setText('') } }}
              className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-surface-2 small flex gap-3"><code className="text-calm font-mono w-24 shrink-0">{c.cmd.trim()}</code><span className="text-muted">{c.desc}</span></button></li>
          ))}
        </ul>
      )}
      <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); coach.ask(text); setText('') }}>
        {coach.supported && (
          <button type="button" data-voice-control onClick={coach.listen} aria-pressed={coach.listening} aria-label={coach.listening ? t('coach.listen') : t('coach.speak')}
            className={`shrink-0 w-12 grid place-items-center transition-colors ${coach.listening ? 'bg-chaos text-field-ink animate-pulse' : 'bg-surface-2 hover:bg-bg'}`}>
            {coach.listening ? <MicOff size={20} /> : <Mic size={20} />}
          </button>
        )}
        <label className="sr-only" htmlFor="coach-input">{t('coach.placeholder')}</label>
        <input id="coach-input" className="input flex-1" value={coach.listening ? coach.interim : text} readOnly={coach.listening}
          onChange={(e) => setText(e.target.value)} placeholder={coach.listening ? t('coach.listen') : 'Ask, or type / for commands'}
          onPaste={(e) => { const v = e.clipboardData.getData('text'); if (looksLikeNotification(v)) { e.preventDefault(); setText('/xray ' + v.trim()) } }} />
        <button className="btn !px-4" aria-label="Send" disabled={!text.trim()}><Send size={18} /></button>
      </form>
      <div className="mt-2 flex items-center justify-between small text-muted">
        {coach.speaking && (
          <button data-voice-control onClick={coach.stop} className="flex items-center gap-1.5 text-chaos font-medium hover:underline" aria-label="Stop speaking">
            <Square size={13} fill="currentColor" /> Stop speaking
          </button>
        )}
        <div className="flex items-center rounded-full bg-surface-2 p-0.5" role="radiogroup" aria-label="Coach tone">
          {(['plain', 'genz'] as const).map((v) => <button key={v} role="radio" aria-checked={coach.tone === v} onClick={() => coach.setTone(v)} className={`px-2.5 py-0.5 rounded-full text-[12px] ${coach.tone === v ? 'bg-ink text-field-ink font-semibold' : ''}`}>{v === 'plain' ? 'Plain' : 'Gen Z'}</button>)}
        </div>
        <button data-voice-control onClick={() => coach.setSpeak(!coach.speak)} className="flex items-center gap-1.5 hover:text-ink">
          {coach.speak ? <Volume2 size={15} /> : <VolumeX size={15} />} Voice replies {coach.speak ? 'on' : 'off'}
        </button>
        {coach.listening ? <span className="text-chaos">Listening… pause for 2 s or tap the mic to send</span> : !coach.supported && <span>Voice input needs Chrome or Edge</span>}
      </div>
      {peek && <FuturePeek open input={{ category: peek.category, app: peek.app, text: peek.text, task: peek.task, hour: peek.hour, cost: peek.cost, p10: peek.p10, p90: peek.p90, holdCost: peek.hold_cost, xray: peek.xray, usually: peek.usually }}
        onClose={() => setPeek(null)} />}
    </div>
  )
}

export default function VoiceCoachFab() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const coach = useCoach()
  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div role="dialog" aria-label={t('coach.title')} initial={{ opacity: 0, y: 20, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.96 }}
            className="fixed z-50 bottom-24 right-4 left-4 sm:left-auto sm:w-[400px] panel p-4 shadow-2xl border border-surface-2">
            <div className="flex items-center justify-between mb-3">
              <p className="flex items-center gap-2 font-medium"><ForkMark size={22} /> {t('coach.title')}</p>
              <button onClick={() => setOpen(false)} aria-label="Close coach" className="p-1 hover:text-chaos"><X size={20} /></button>
            </div>
            <CoachChat coach={coach} />
          </motion.div>
        )}
      </AnimatePresence>
      <button onClick={() => setOpen(!open)} aria-expanded={open} aria-label={t('coach.title')}
        className="fixed z-50 bottom-20 lg:bottom-6 right-4 h-14 pl-4 pr-5 bg-calm text-field-ink fork-cut flex items-center gap-2 font-medium shadow-xl hover:-translate-y-0.5 transition-transform">
        <Sparkles size={20} /> <span className="hidden sm:inline">{t('coach.title')}</span>
      </button>
    </>
  )
}
