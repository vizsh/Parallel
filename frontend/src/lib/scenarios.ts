/**
 * Simulations: realistic, self-playing phone scenarios that show how Parallel behaves on top of real notifications.
 * Each step fully describes the phone at that moment; the player animates between steps.
 */
import type { FutureInput } from './future'

export type Screen = 'study' | 'code' | 'reels' | 'edit' | 'lock'
export type Btn = { label: string; kind: 'peek' | 'hold' | 'open' | 'digest' | 'reply' | 'calm' }
export type SimStep = {
  ms: number
  caption: string
  clock: string
  screen: Screen
  focus?: string                      // focus pill in the app bar
  banner?: { tone: 'deadline' | 'guard'; text: string }
  notif?: { app: string; text: string; count?: number; tint: string }
  strip?: { title: string; sub: string; tone: 'hold' | 'shield' | 'guard' | 'digest'; tags?: string[]; buttons?: Btn[]; press?: string }
  pass?: { app: string; text: string; note: string; tint: string }
  peek?: 'a' | 'b'
  jar?: string
  aura?: string
  reply?: string
  digest?: { title: string; sub: string }
  text?: { at: string; lines: string[] }
  dim?: boolean
  shake?: boolean
}
export type Scenario = {
  id: string; title: string; tagline: string; persona: string; shows: string[]
  app: { title: string; heading: string }
  input: FutureInput
  steps: SimStep[]
}

const IG = 'linear-gradient(135deg,#f58529,#dd2a7b,#8134af)'
const YT = 'linear-gradient(135deg,#ff0000,#b30000)'
const WA = 'linear-gradient(135deg,#25d366,#128c7e)'
const SLACK = 'linear-gradient(135deg,#4a154b,#e01e5a)'
const DISCORD = 'linear-gradient(135deg,#5865f2,#404eed)'

const HPD: Btn[] = [{ label: 'Peek', kind: 'peek' }, { label: 'Hold', kind: 'hold' }, { label: 'Open', kind: 'open' }]

export const SCENARIOS: Scenario[] = [
  {
    id: 'study', title: 'Study session: the Instagram like', persona: 'Student', tagline: 'One like, two futures, one calm batch later.',
    shows: ['Cost on top of the notification', 'Door to the Future', 'The jar', 'Texts from future you'],
    app: { title: 'DBMS · Unit 4 notes', heading: 'Normalization: 1NF → BCNF' },
    input: { category: 'social_like', app: 'Instagram', text: 'aarav_07 and 12 others liked your post', task: 'DBMS notes', hour: 11.75, cost: 18.4, p10: 4, p90: 31, holdCost: 0.7 },
    steps: [
      { ms: 2200, clock: '11:45', screen: 'study', focus: '● focus 23:41', caption: 'You’re deep in DBMS notes. Focus timer running.' },
      { ms: 2200, clock: '11:45', screen: 'study', focus: '● focus 23:41', shake: true, notif: { app: 'Instagram', text: 'aarav_07 and 12 others liked your post', tint: IG }, caption: 'A ping lands. Normally this is where 18 minutes vanish.' },
      { ms: 2800, clock: '11:45', screen: 'study', focus: '● focus 23:41', notif: { app: 'Instagram', text: 'aarav_07 and 12 others liked your post', tint: IG },
        strip: { title: '−18 min if you tap · 74% rabbit hole', sub: 'You’re 23 min into a deep block. Twin says: hold.', tone: 'hold', tags: ['Social proof'], buttons: HPD }, caption: 'Parallel scores it on top of the notification, before you tap.' },
      { ms: 2600, clock: '11:45', screen: 'study', focus: '● focus 23:41', notif: { app: 'Instagram', text: 'aarav_07 and 12 others liked your post', tint: IG },
        strip: { title: '−18 min if you tap · 74% rabbit hole', sub: 'You’re 23 min into a deep block. Twin says: hold.', tone: 'hold', buttons: HPD, press: 'Peek' }, peek: 'a', caption: 'Peek: Door A. If you tap, the twin sees The Scrollfather.' },
      { ms: 2600, clock: '11:45', screen: 'study', focus: '● focus 23:41', notif: { app: 'Instagram', text: 'aarav_07 and 12 others liked your post', tint: IG },
        strip: { title: '−18 min if you tap · 74% rabbit hole', sub: 'You’re 23 min into a deep block. Twin says: hold.', tone: 'hold', buttons: HPD, press: 'Hold' }, peek: 'b', caption: 'Door B. If you hold, Main Character. You choose: hold.' },
      { ms: 2400, clock: '11:46', screen: 'study', focus: '● focus 27:12', jar: '3 held · until 1:00 PM', caption: 'It drops into the jar until your next checkpoint. Focus keeps going.' },
      { ms: 3400, clock: '1:00', screen: 'study', focus: '● focus 75:00', digest: { title: '3 pings, one calm batch', sub: 'Instagram ×2 · YouTube · 18.4 focus min protected' },
        text: { at: '1:00 PM', lines: ['yo it’s 1:00 pm, dbms block done 😌', 'the likes are still there btw. main character behaviour fr ✨'] }, caption: 'At 1:00 PM the held pings arrive together, and future you texts back.' },
    ],
  },
  {
    id: 'dev', title: 'Developer in flow: three pings, three calls', persona: 'Developer', tagline: 'Hold the bait, pass the VIP, digest the PR.',
    shows: ['Different decisions per ping', 'VIPs always pass', 'Algorithm bait X-ray', 'Digest at a checkpoint'],
    app: { title: 'payments-api · retry.ts', heading: 'fix: double charge on retry' },
    input: { category: 'video_reco', app: 'YouTube', text: "New video: 'I coded for 24 hours straight'", task: 'Debugging', hour: 11.33, cost: 24, p10: 3, p90: 52, holdCost: 0.6 },
    steps: [
      { ms: 2300, clock: '11:20', screen: 'code', focus: '● flow 41:10', caption: 'Deep in a payments bug. 41 minutes of flow.' },
      { ms: 2600, clock: '11:20', screen: 'code', focus: '● flow 41:10', shake: true, notif: { app: 'YouTube', text: "New video: 'I coded for 24 hours straight'", tint: YT },
        strip: { title: '−24 min if you tap · 70% rabbit hole', sub: 'Nobody is waiting for this. Twin says: hold.', tone: 'hold', tags: ['Algorithm bait'], buttons: HPD }, caption: 'YouTube recommends a video. X-ray flags it: a recommender picked it, no person is waiting.' },
      { ms: 2200, clock: '11:21', screen: 'code', focus: '● flow 42:05', jar: '1 held · until 12:30 PM', caption: 'Held. Flow keeps going.' },
      { ms: 2600, clock: '11:34', screen: 'code', focus: '● flow 55:30', pass: { app: 'WhatsApp', text: 'Mom: call me when you’re free', note: 'VIP · always gets through', tint: WA }, jar: '1 held · until 12:30 PM', caption: 'Mom is a VIP. Parallel never holds her.' },
      { ms: 2900, clock: '11:52', screen: 'code', focus: '● flow 73:10', notif: { app: 'Slack', text: 'Teammate: can you review my PR when free?', tint: SLACK },
        strip: { title: 'Digest at 12:30 PM', sub: 'Work chat, not urgent. Joins your checkpoint batch.', tone: 'digest', buttons: [{ label: 'Digest', kind: 'digest' }, { label: 'Open', kind: 'open' }], press: 'Digest' }, jar: '1 held · until 12:30 PM',
        caption: 'A PR review matters, just not this minute. It joins the 12:30 digest.' },
      { ms: 2300, clock: '12:18', screen: 'code', focus: '● flow 99:00', jar: '2 waiting · 12:30 PM', caption: '99 minutes unbroken. Bug fixed, tests green.' },
      { ms: 3400, clock: '12:30', screen: 'code', focus: '✓ done', digest: { title: '12:30 · your checkpoint', sub: 'PR review · 1 video · 31 focus min protected' },
        text: { at: '12:30 PM', lines: ['the double-charge bug is dead 🫡', 'review the PR now, it’s a 6 min job'] }, caption: 'At the checkpoint: one calm batch, in the right order.' },
    ],
  },
  {
    id: 'night', title: '1 AM doomscroll: the late-night guard', persona: 'Student', tagline: '“Just one reel” at 12:52 AM, and an 8 AM class.',
    shows: ['Late-night guard', 'Door A worst case', 'Texts from future you', 'Morning digest'],
    app: { title: 'Reels', heading: '' },
    input: { category: 'video_reco', app: 'YouTube', text: 'Shorts you might like 🔥', task: 'sleep', hour: 0.87, cost: 55, p10: 12, p90: 135, holdCost: 0.5 },
    steps: [
      { ms: 2300, clock: '12:52', screen: 'reels', caption: '12:52 AM. “Just one reel” became forty.' },
      { ms: 2700, clock: '12:53', screen: 'reels', shake: true, notif: { app: 'YouTube', text: 'Shorts you might like 🔥', tint: YT },
        strip: { title: '🌙 Late-night guard', sub: 'Past your 11:30 PM wind-down. Held till morning.', tone: 'guard', tags: ['Algorithm bait'], buttons: HPD }, caption: 'A new ping tries to stretch the night. The late-night guard holds it.' },
      { ms: 2700, clock: '12:53', screen: 'reels', strip: { title: '🌙 Late-night guard', sub: 'Past your 11:30 PM wind-down. Held till morning.', tone: 'guard', buttons: HPD, press: 'Peek' }, peek: 'a', caption: 'Peek at Door A: the twin’s worst likely case runs past 3 AM.' },
      { ms: 2800, clock: '12:54', screen: 'reels', dim: true, text: { at: '8:05 AM', lines: ['bro. 8 am class. we slept at 3 💀', 'please. put it down.'] }, caption: 'Future you weighs in.' },
      { ms: 2600, clock: '12:55', screen: 'reels', dim: true, strip: { title: 'Wind down?', sub: 'Feeds pause and the screen dims until 7:00 AM. VIPs still ring.', tone: 'guard', buttons: [{ label: 'Wind down', kind: 'calm' }, { label: 'Not yet', kind: 'open' }], press: 'Wind down' }, caption: 'One tap: feeds pause, the screen dims.' },
      { ms: 2400, clock: '12:58', screen: 'lock', dim: true, jar: '4 held · morning digest', caption: 'Phone down by 12:58 AM. Four pings wait for morning.' },
      { ms: 3400, clock: '7:30', screen: 'lock', digest: { title: 'Good morning · 4 pings, 1 batch', sub: 'Nothing urgent happened overnight.' }, aura: '+500 aura · held the line', caption: '7:30 AM: one batch, nothing missed, six and a half hours of sleep.' },
    ],
  },
  {
    id: 'exam', title: 'Exam week: the group-chat storm', persona: 'Student', tagline: '14 messages in 3 minutes, two days before the exam.',
    shows: ['Deadline strict mode', 'Burst grouping', 'Auto-reply draft', 'Catch-up summary'],
    app: { title: 'DBMS · past papers', heading: 'Q4: Transactions & ACID' },
    input: { category: 'social_dm', app: 'Discord', text: 'Riya: bro did you see this 😂', task: 'Revision', hour: 17.2, cost: 14, p10: 2, p90: 33, holdCost: 0.8 },
    steps: [
      { ms: 2400, clock: '5:10', screen: 'study', focus: '● revision 12:40', banner: { tone: 'deadline', text: 'DBMS exam in 2 days · stricter mode' }, caption: 'Two days to the DBMS exam. Parallel is in stricter mode.' },
      { ms: 2100, clock: '5:12', screen: 'study', focus: '● revision 14:02', banner: { tone: 'deadline', text: 'DBMS exam in 2 days · stricter mode' }, shake: true, notif: { app: 'Discord', text: 'Riya: bro did you see this 😂', count: 1, tint: DISCORD }, caption: 'The group chat wakes up.' },
      { ms: 2300, clock: '5:15', screen: 'study', focus: '● revision 17:20', banner: { tone: 'deadline', text: 'DBMS exam in 2 days · stricter mode' }, shake: true, notif: { app: 'Discord', text: 'Kabir: GOA PLAN IS ON 🌴🌴', count: 14, tint: DISCORD }, caption: '…and doesn’t stop. 14 messages in 3 minutes.' },
      { ms: 2800, clock: '5:15', screen: 'study', focus: '● revision 17:30', banner: { tone: 'deadline', text: 'DBMS exam in 2 days · stricter mode' }, notif: { app: 'Discord', text: '14 messages · #batch-2027', count: 14, tint: DISCORD },
        strip: { title: '14 messages → 1 held thread', sub: 'Grouped into one item. Nothing from your VIPs.', tone: 'hold', tags: ['FOMO hook'], buttons: [{ label: 'Reply later', kind: 'reply' }, { label: 'Hold', kind: 'hold' }], press: 'Reply later' }, caption: 'Parallel collapses the storm into one held thread.' },
      { ms: 2900, clock: '5:16', screen: 'study', focus: '● revision 18:10', banner: { tone: 'deadline', text: 'DBMS exam in 2 days · stricter mode' }, reply: 'Studying for DBMS till 7, will catch up after 🙏', caption: 'An auto-reply draft. You tap send; Parallel never sends for you.' },
      { ms: 2300, clock: '6:08', screen: 'study', focus: '● revision 52:00', banner: { tone: 'deadline', text: 'DBMS exam in 2 days · stricter mode' }, jar: '1 thread · until 7:00 PM', caption: '52 minutes of past papers. The chat carries on without you.' },
      { ms: 3400, clock: '7:00', screen: 'study', focus: '✓ block done', digest: { title: '7:00 PM · #batch-2027 summary', sub: '14 messages: one meme, Goa plans, nothing urgent' },
        text: { at: '7:00 PM', lines: ['exam’s gonna be fine 📚', 'the meme was mid anyway'] }, caption: 'At 7 PM you catch up in one go.' },
    ],
  },
  {
    id: 'reengage', title: 'The “we miss you” trap: Manipulation X-ray', persona: 'Creator', tagline: 'Instagram notices you’ve been away. Parallel notices why.',
    shows: ['Manipulation X-ray', 'Teaser unmasking', 'Re-engagement shield', 'Aura points'],
    app: { title: 'Premiere · thumbnail_v3', heading: 'Thumbnail v3: final pass' },
    input: { category: 'social_like', app: 'Instagram', text: 'You have 9 new notifications. See what you missed 👀', task: 'Editing', hour: 20.6, cost: 21, p10: 3, p90: 44, holdCost: 0.5 },
    steps: [
      { ms: 2300, clock: '8:36', screen: 'edit', focus: '● editing 48:00', caption: 'Editing a thumbnail. Haven’t opened Instagram since lunch.' },
      { ms: 2300, clock: '8:37', screen: 'edit', focus: '● editing 49:10', shake: true, notif: { app: 'Instagram', text: 'You have 9 new notifications. See what you missed 👀', tint: IG }, caption: 'Instagram notices you’ve been away.' },
      { ms: 3000, clock: '8:37', screen: 'edit', focus: '● editing 49:15', notif: { app: 'Instagram', text: 'You have 9 new notifications. See what you missed 👀', tint: IG },
        strip: { title: '🔍 X-ray: 2 tactics', sub: 'Sent because you were away, not because something happened.', tone: 'shield', tags: ['Re-engagement bait', 'Vague teaser'] }, caption: 'Manipulation X-ray names the tactics.' },
      { ms: 3000, clock: '8:37', screen: 'edit', focus: '● editing 49:20', notif: { app: 'Instagram', text: 'You have 9 new notifications. See what you missed 👀', tint: IG },
        strip: { title: 'Unmasked: usually 1–3 likes, no messages', sub: 'Shielded into your 9:00 PM digest.', tone: 'shield', buttons: [{ label: 'Digest', kind: 'digest' }, { label: 'Open anyway', kind: 'open' }], press: 'Digest' }, caption: 'Teaser unmasked from your own history. Shielded.' },
      { ms: 2300, clock: '8:38', screen: 'edit', focus: '● editing 50:00', jar: 'Shielded · 9:00 PM digest', aura: '+500 aura · held the line', caption: 'Back to the edit. +500 aura.' },
      { ms: 3000, clock: '9:00', screen: 'edit', focus: '✓ exported', digest: { title: '9:00 PM · Instagram', sub: '9 notifications: 3 likes, 6 “suggested for you”. 0 messages.' }, caption: 'At 9 PM: three likes, six suggestions, zero messages. Called it.' },
      { ms: 3000, clock: '9:01', screen: 'edit', focus: '✓ exported', text: { at: '9:01 PM', lines: ['thumbnail v3 is done and it slaps 🔥', 'the likes did not need us lol'] }, caption: 'Future you agrees.' },
    ],
  },
]

export const scenarioById = (id?: string | null) => SCENARIOS.find((s) => s.id === id) ?? SCENARIOS[0]
