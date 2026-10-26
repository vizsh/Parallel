import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { MessageSquare, Flame, Shield, Sparkles, Copy, Check, Send, Smartphone, Terminal, KeyRound, RefreshCw, CheckCircle2 } from 'lucide-react'
import { api } from '@/lib/api'
import { toast, useApi } from '@/lib/hooks'

type DebriefResponse = {
  ok: boolean
  data: {
    date_str: string
    focus_time: string
    peak_window: string
    simulated_count: number
    suppressed_count: number
    minutes_saved: number
    top_trigger: string
    streak_days: number
    level: number
    world_name: string
    world_desc: string
    next_tier: string
    next_at: number
    xp_today: number
    xp_total: number
    insight: string
    persona: string
    user_name: string
  }
  formatted_text: string
}

type BridgeStatus = {
  ok: boolean
  connected: boolean
  registered?: boolean
  user?: { id?: string; name?: string } | null
  lastCode?: string | null
  error?: string
}

export default function WhatsAppMirror() {
  const debrief = useApi<DebriefResponse>('/whatsapp/debrief')
  const [copied, setCopied] = useState(false)
  const [codeCopied, setCodeCopied] = useState(false)
  const [phoneInput, setPhoneInput] = useState('')
  const [pairingCode, setPairingCode] = useState<string | null>(null)
  const [loadingCode, setLoadingCode] = useState(false)
  const [bridgeStatus, setBridgeStatus] = useState<BridgeStatus | null>(null)

  const [testCmd, setTestCmd] = useState('summary')
  const [chatLog, setChatLog] = useState<{ sender: 'user' | 'bot'; text: string }[]>([
    {
      sender: 'bot',
      text: '🌙 Welcome to Parallel on WhatsApp! Reply "summary" for your daily Attention Mirror, "focus 45" to start a sprint, or "sim instagram" to test an interruption.'
    }
  ])
  const [loading, setLoading] = useState(false)
  const [showSimulator, setShowSimulator] = useState(false)

  const data = debrief.data?.data

  // Fetch bridge status periodically
  async function checkBridgeStatus() {
    try {
      const res = await api<BridgeStatus>('/whatsapp/bridge/status')
      setBridgeStatus(res)
      if (res.connected) {
        setPairingCode(null)
      }
    } catch {
      // Bridge may still be spinning up
    }
  }

  useEffect(() => {
    checkBridgeStatus()
    const timer = setInterval(checkBridgeStatus, 6000)
    return () => clearInterval(timer)
  }, [])

  async function copyToClipboard() {
    if (!debrief.data?.formatted_text) return
    await navigator.clipboard.writeText(debrief.data.formatted_text)
    setCopied(true)
    toast('WhatsApp Attention Mirror copied to clipboard!')
    setTimeout(() => setCopied(false), 2000)
  }

  async function copyPairingCode() {
    if (!pairingCode) return
    await navigator.clipboard.writeText(pairingCode)
    setCodeCopied(true)
    toast('Pairing code copied!')
    setTimeout(() => setCodeCopied(false), 2000)
  }

  async function requestPairingCode(e: React.FormEvent) {
    e.preventDefault()
    const clean = phoneInput.replace(/[^0-9]/g, '')
    if (clean.length < 10) {
      toast('Please enter a valid phone number with country code (e.g. 919876543210)', 'chaos')
      return
    }

    setLoadingCode(true)
    try {
      const res = await api<{ ok: boolean; code?: string; connected?: boolean; error?: string }>('/whatsapp/bridge/pair-code', {
        method: 'POST',
        body: { phone: clean }
      })

      if (res.connected) {
        toast('WhatsApp is already connected and active!')
        checkBridgeStatus()
      } else if (res.code) {
        setPairingCode(res.code)
        toast('Pairing code generated! Enter it in WhatsApp on your phone.')
      } else if (res.error) {
        toast(res.error, 'chaos')
      }
    } catch (e) {
      toast((e as Error).message, 'chaos')
    } finally {
      setLoadingCode(false)
    }
  }

  async function sendTestMessage(msg?: string) {
    const textToSend = msg || testCmd
    if (!textToSend.trim()) return

    setChatLog((prev) => [...prev, { sender: 'user', text: textToSend }])
    setLoading(true)
    if (!msg) setTestCmd('')

    try {
      const res = await api<{ ok: boolean; reply: string }>('/whatsapp/incoming', {
        method: 'POST',
        body: {
          phone: phoneInput || '+919876543210',
          message: textToSend
        }
      })
      if (res.reply) {
        setChatLog((prev) => [...prev, { sender: 'bot', text: res.reply }])
      }
    } catch (e) {
      toast((e as Error).message, 'chaos')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-surface border border-field-border p-6 relative overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-field-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#25D366]/20 border border-[#25D366]/40 flex items-center justify-center text-[#25D366]">
            <MessageSquare size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg text-ink">WhatsApp Attention Mirror</h3>
              {bridgeStatus?.connected ? (
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-medium border border-emerald-500/20 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Linked
                </span>
              ) : (
                <span className="text-xs px-2 py-0.5 rounded bg-[#25D366]/10 text-[#25D366] font-medium border border-[#25D366]/20">
                  Part 6 Live
                </span>
              )}
            </div>
            <p className="text-xs text-muted">Daily 8:00 PM attention reflection & gamified streak delivered to your chat</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSimulator(!showSimulator)}
            className="px-3 py-1.5 text-xs font-medium border border-field-border bg-bg hover:bg-surface-2 transition-colors flex items-center gap-1.5 text-ink">
            <Terminal size={14} /> {showSimulator ? 'Hide Test Chat' : 'Test WhatsApp Bot'}
          </button>
          <button
            onClick={copyToClipboard}
            className="px-3 py-1.5 text-xs font-medium bg-[#25D366] text-black hover:opacity-90 transition-opacity flex items-center gap-1.5 font-semibold">
            {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? 'Copied' : 'Copy for WhatsApp'}
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-6 mt-6">
        {/* Left: Live WhatsApp Mirror Card Preview */}
        <div className="space-y-4">
          <div className="text-xs font-mono uppercase tracking-wider text-muted flex items-center gap-2">
            <Smartphone size={13} /> WhatsApp Message Preview
          </div>

          <div className="bg-[#0b141a] text-[#e9edef] rounded-lg p-5 font-sans border border-[#202c33] shadow-lg relative max-w-xl">
            {/* WhatsApp Bubble Accent */}
            <div className="text-xs text-[#8696a0] mb-2 font-mono">Parallel Attention Twin · 8:00 PM</div>

            <div className="space-y-3 text-sm leading-relaxed whitespace-pre-line">
              <div className="font-bold text-[#00a884] text-base flex items-center gap-2">
                🌙 PARALLEL ATTENTION MIRROR
              </div>
              <div className="text-xs text-[#8696a0] italic">
                Daily Debrief · {data?.date_str ?? 'Today'}
              </div>

              <div className="bg-[#111b21] p-3 rounded border border-[#202c33] space-y-1.5 my-2">
                <div className="flex justify-between items-center">
                  <span className="text-[#8696a0]">🎯 Focus Achieved:</span>
                  <span className="font-semibold text-white">{data?.focus_time ?? '4h 15m'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#8696a0]">⚡ Peak Window:</span>
                  <span className="font-medium text-[#ffd279]">{data?.peak_window ?? '10:00 AM – 11:30 AM'}</span>
                </div>
              </div>

              <div className="space-y-1 text-xs">
                <div className="font-semibold text-[#8696a0] uppercase tracking-wide text-[11px]">🛡️ Attention Defense</div>
                <div>• Potential interruptions simulated: <strong className="text-white">{data?.simulated_count ?? 26}</strong></div>
                <div>• Distractions suppressed: <strong className="text-[#00a884]">{data?.suppressed_count ?? 18}</strong></div>
                <div>• Focus time protected: <strong className="text-white">~{data?.minutes_saved ?? 62} minutes saved</strong></div>
                <div>• Top deflected trigger: <strong className="text-[#ffd279]">{data?.top_trigger ?? 'Instagram (8 pings)'}</strong></div>
              </div>

              <div className="bg-[#111b21] p-2.5 rounded border border-[#202c33] flex items-center justify-between text-xs my-2">
                <div className="flex items-center gap-2">
                  <Flame size={16} className="text-[#ff5c5c]" />
                  <span>Streak: <strong className="text-white">Day {data?.streak_days ?? 4}</strong></span>
                </div>
                <div className="flex items-center gap-1.5 text-[#ffd279]">
                  <Sparkles size={14} />
                  <span>+{data?.xp_today ?? 120} XP ({data?.world_name ?? 'Garage lab'})</span>
                </div>
              </div>

              <div className="bg-[#182229] border-l-2 border-[#00a884] p-3 rounded-r text-xs text-[#d1d7db] italic">
                "{data?.insight ?? 'Your deep-work blocks were rock solid today.'}"
              </div>

              <div className="text-[11px] text-[#8696a0] pt-1 border-t border-[#202c33]">
                Reply <span className="text-[#00a884] font-mono">focus 45</span> to start a sprint, or <span className="text-[#00a884] font-mono">sim</span> to test a distraction.
              </div>
            </div>
          </div>
        </div>

        {/* Right: Phone Pairing with 8-character Code */}
        <div className="space-y-5">
          {/* Link Phone with Pairing Code */}
          <div className="bg-bg p-4 border border-field-border rounded">
            <h4 className="text-sm font-semibold text-ink mb-1 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <KeyRound size={16} className="text-[#25D366]" /> Link with Pairing Code
              </span>
              {bridgeStatus?.connected && (
                <span className="text-xs text-emerald-400 flex items-center gap-1 font-normal">
                  <CheckCircle2 size={13} /> Active
                </span>
              )}
            </h4>
            <p className="text-xs text-muted mb-3">
              Enter your WhatsApp number with country code (e.g. <code className="text-ink">919876543210</code>) to get an 8-character pairing code without QR scan.
            </p>

            {bridgeStatus?.connected ? (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded text-xs text-emerald-300 space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <Check size={14} /> WhatsApp Successfully Connected!
                </div>
                <p className="text-muted">
                  Your WhatsApp account is paired. You will receive the daily 8:00 PM Attention Mirror directly in chat.
                </p>
              </div>
            ) : (
              <form onSubmit={requestPairingCode} className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="tel"
                    placeholder="e.g. 919876543210"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    className="bg-surface px-3 py-1.5 text-xs border border-field-border text-ink flex-1 focus:outline-none focus:border-[#25D366]"
                  />
                  <button
                    type="submit"
                    disabled={loadingCode}
                    className="px-3 py-1.5 text-xs font-semibold bg-[#25D366] text-black hover:opacity-90 disabled:opacity-50">
                    {loadingCode ? 'Generating...' : 'Get Code'}
                  </button>
                </div>

                {/* Display Pairing Code if Generated */}
                {pairingCode && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mt-3 p-3 bg-surface border-2 border-[#25D366] rounded space-y-2">
                    <div className="text-[11px] text-muted uppercase tracking-wider font-semibold">
                      Your 8-Character Pairing Code:
                    </div>
                    <div className="flex items-center justify-between bg-bg p-2 rounded border border-field-border">
                      <span className="font-mono text-xl font-bold tracking-widest text-[#25D366]">
                        {pairingCode}
                      </span>
                      <button
                        type="button"
                        onClick={copyPairingCode}
                        className="px-2 py-1 text-xs font-medium border border-field-border bg-surface hover:bg-surface-2 transition-colors flex items-center gap-1 text-ink">
                        {codeCopied ? <Check size={13} /> : <Copy size={13} />} {codeCopied ? 'Copied' : 'Copy'}
                      </button>
                    </div>

                    <div className="text-[11px] text-muted space-y-1 pt-1">
                      <div className="font-semibold text-ink">How to enter this code on WhatsApp:</div>
                      <div>1. Open WhatsApp on your phone</div>
                      <div>2. Tap <strong>Settings (or ⋮) &gt; Linked Devices &gt; Link a Device</strong></div>
                      <div>3. Tap <strong>"Link with phone number instead"</strong> and type the code above!</div>
                    </div>
                  </motion.div>
                )}
              </form>
            )}
          </div>

          {/* Quick Prompts */}
          <div className="bg-bg p-4 border border-field-border rounded space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted">Quick WhatsApp Triggers</h4>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: '🌙 Summary', cmd: 'summary' },
                { label: '🎯 Focus 45m', cmd: 'focus 45' },
                { label: '📊 Sim Instagram', cmd: 'sim instagram' },
                { label: '🔥 Streak Check', cmd: 'streak' },
                { label: '❓ Help', cmd: 'help' }
              ].map((btn) => (
                <button
                  key={btn.cmd}
                  onClick={() => {
                    setShowSimulator(true)
                    sendTestMessage(btn.cmd)
                  }}
                  className="px-2.5 py-1 text-xs border border-field-border bg-surface hover:border-chaos transition-colors text-ink">
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          {/* Key Stat Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-bg p-3 border border-field-border text-center">
              <div className="text-xl font-bold text-calm">{data?.focus_time ?? '4h 15m'}</div>
              <div className="text-[11px] text-muted uppercase tracking-wider mt-1">Protected Focus</div>
            </div>
            <div className="bg-bg p-3 border border-field-border text-center">
              <div className="text-xl font-bold text-chaos">~{data?.minutes_saved ?? 62} min</div>
              <div className="text-[11px] text-muted uppercase tracking-wider mt-1">Interruption Cost Saved</div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive WhatsApp Simulator Drawer */}
      <AnimatePresence>
        {showSimulator && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-6 pt-6 border-t border-field-border">
            <div className="bg-[#0b141a] rounded-lg border border-[#202c33] overflow-hidden">
              <div className="bg-[#202c33] px-4 py-3 flex items-center justify-between text-xs text-white font-medium">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#00a884] animate-pulse" />
                  <span>Interactive WhatsApp Bot Bridge</span>
                </div>
                <span className="text-[#8696a0] font-mono text-[11px]">POST /api/whatsapp/incoming</span>
              </div>

              {/* Chat Messages */}
              <div className="p-4 space-y-3 max-h-72 overflow-y-auto">
                {chatLog.map((c, i) => (
                  <div
                    key={i}
                    className={`flex ${c.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-md p-3 rounded-lg text-xs whitespace-pre-line shadow ${
                        c.sender === 'user'
                          ? 'bg-[#005c4b] text-[#e9edef] rounded-tr-none'
                          : 'bg-[#202c33] text-[#e9edef] rounded-tl-none font-sans'
                      }`}>
                      {c.text}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="text-xs text-[#8696a0] italic flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#00a884] animate-ping" />
                    Twin is processing through regex rules & ML pipeline...
                  </div>
                )}
              </div>

              {/* Input Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  sendTestMessage()
                }}
                className="bg-[#202c33] p-2 flex gap-2">
                <input
                  type="text"
                  placeholder="Type a command (summary, focus 45, sim instagram)..."
                  value={testCmd}
                  onChange={(e) => setTestCmd(e.target.value)}
                  className="bg-[#2a3942] text-white px-3 py-2 text-xs flex-1 rounded focus:outline-none placeholder-[#8696a0]"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-[#00a884] text-black font-semibold rounded hover:opacity-90 text-xs flex items-center gap-1">
                  <Send size={13} /> Send
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
