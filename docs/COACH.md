# The coach copilot

The coach is not a Q&A box. It works out the real problem behind a question, answers with the same cards the rest of the app uses, and can act for you (hold pings, mute an app, start a block, pour the jar), always with an Undo. This document describes how it is built.

Code: `backend/app/assistant.py` (intent engine, facts sheet), `backend/app/copilot.py` (cards, actions, commands, nudges, memory), `backend/app/overrides.py` (temporary rules), `backend/app/llm_coach.py` (optional Claude), `frontend/src/components/VoiceCoach.tsx` (chat), `CoachCards.tsx`, `CoachNudge.tsx`, `frontend/src/lib/coach.ts`.

---

## 1. Shape of every reply
`POST /api/assistant {text, lang, tone}` returns:

| Field | What it is |
|---|---|
| `headline` | One sentence, the answer (English; other languages keep the translated sentence in `reply`) |
| `reply` | Extra explanation. Empty when a card already shows the numbers |
| `cards[]` | Rich cards (below) |
| `actions[]` | Up to 3 buttons: `{label, kind, payload, auto?}` |
| `done` | Result of an action the request already ran, with `undo` |
| `suggest[]` | Follow-up chips |
| `source` | `rules` (built-in engine) or `claude` |

## 2. Cards
| Card | When | Contents |
|---|---|---|
| `ping` | “Should I open this?” | Cost, p10–p90 range bar, rabbit-hole odds, held cost, twin's call + reason, X-ray chips. Buttons: **Peek** (opens the doors), **Hold it**, **Open on purpose** |
| `receipt` | `/receipt`, “screen time”, “how much time did I lose” | Till receipt: apps with opens and minutes lost, focus lost, protected, pings/opened/held, aura, the priciest ping. **Share** |
| `receipt` (week) | `/week`, “my week”, “wrapped” | Plus: mostly-which-day-archetype, best day, longest block, change vs last week |
| `receipt` (app) | `/receipt instagram`, “instagram this week” | One app over 7 days: rabbit-hole share, longest escape |
| `compare` | “Instagram vs YouTube” | Two bars and a verdict; **Mute the worse one** |
| `plan` | `/plan`, “plan my evening”, “what now” | Timeline: golden hours, check moments, energy dip, wind-down, deadline banner; **Start a block**, **Hold pings till then** |
| `evidence` | “I can't focus”, sleep/tiredness | Switches today, minutes lost to the top app, fatigue, focus capacity, late nights |
| `jar` | `/jar`, “what did I miss” | Held pings grouped by app, next batch time; **Pour the jar** |
| `fingerprint` | “When do I focus best?” | 24 bars with golden hours and now highlighted |
| `aura` | `/aura` | Week's aura, tier, fate needle |
| `xray` | `/xray …` or a pasted notification | Tactics, unmasking, verdict; **Shield it till bedtime** |
| `memory` | `/me`, “what do you know about me” | Persona, golden hours, day, VIPs, nag apps, deadline, and what you told the coach (each with ✕ to forget) |
| `draft` | “Draft a reply to the group chat” | Auto-reply text with **Copy**; never sent by the app |
| `commands` | `/help` | Every slash command, tappable |

## 3. Actions (`POST /api/coach/action {kind, payload}`)
| Kind | Effect | Undo |
|---|---|---|
| `hold_all {minutes}` | Everything except VIPs and urgent pings is held until the time | yes |
| `start_block {minutes, task}` | Focus session + hold_all | yes (also ends the session) |
| `mute {category, until: tonight / exam / minutes}` | That app's pings are held until bedtime, the end of your exam day, or N minutes | yes |
| `night_off` | Late-night guard off tonight only | yes |
| `release_digest` | Pours the jar | — |
| `draft_reply {category}` | Returns a draft card | — |
| `remember {text}` · `commit_stop {hour}` | Saves a fact or a commitment | yes |
| `set_wind_down {hour}` | Late-night guard starts at that hour every night | — |
| `start_experiment {category, days}` · `keep_rule {category}` | Starts a habit experiment; makes it a permanent digest rule | — |
| `forget {id}` · `undo {kind, id}` | Removes a memory; reverses an override | — |

Client-side kinds: `decide` (records an allow/hold through `/api/interventions`), `remind` (a reminder in the future-you thread, plus a local notification in the native app), `peek` (opens the Door to the Future), `ask` (sends a message).

Temporary rules live in `coach_overrides` and are read by `apply_rules` on every decision, after your permanent rules and before the shields: **VIP/always → digest/mute rules → coach focus block or mute → re-engagement shield → late-night guard (unless a night off) → the twin.**

## 4. Commands
**Slash:** `/receipt [app]`, `/week`, `/plan`, `/hold 2h`, `/focus 50`, `/jar`, `/why`, `/xray <text>`, `/aura`, `/me`, `/help`. Typing `/` opens a menu.

**Plain language that acts immediately** (with Undo): “hold everything except Mom for 90 minutes”, “mute YouTube till my exam”, “turn off the night guard tonight”, “pour my jar”, “draft a reply to the group chat”, “remind me to call Riya at 7 pm”, “remember that I study best after a walk”, “I'll stop scrolling at 11 pm”, “try holding Discord for 5 days”.

**Paste a notification** into the box and it turns into `/xray …` automatically.

## 5. Understanding the real problem
Intents now include `cant_focus` (“I can't study”, “unproductive”, “procrastinating”). The engine maps the words to a problem, shows the evidence from your data, offers one fix and the plan for the rest of the day:

> **You:** I can't focus today
> **Coach:** *Your focus isn't broken; your day is crowded.* Today: 14 app switches, fatigue ~58%; Discord alone cost you ~41 min. One 25-minute block with pings held, then reassess.
> **[evidence card] [plan card]** · **Start a 25-min block now** · **Mute Discord till bedtime** · **Draft “busy till later” reply**

“Why am I so tired?” checks the last five nights against your bedtime and offers a nightly wind-down. Follow-ups use memory: “why?” and “and YouTube?” refer to the last ping discussed.

## 6. Proactive nudges (`GET /api/coach/nudge`)
At most **3 a day**, never the same kind twice in two hours, and **Fewer of these** mutes a kind for a week. Kinds:

| Kind | Fires when |
|---|---|
| `golden_soon` | Golden hours start within 15 minutes |
| `checkpoint` | A block just ended and pings are waiting |
| `late_night` | Within the first hour of the late-night guard |
| `exam_morning` | A deadline is ≤ 3 days away, in the first hours after waking |
| `rabbit` | A 15+ minute distraction just ended |
| `commitment` | You said you'd stop by a time and last night ran past it |
| `experiment:<id>` | A habit experiment finished; offers to keep it as a rule |
| `weekly` | Sunday evening: your week, Wrapped-style |

`?nudge=<kind>` on any app page shows a demo nudge for presentations.

## 7. Tone, speed and Claude
- **Tone switch** (Plain / Gen Z) under the chat; sent as `tone`, used for headlines and by Claude.
- **Speed:** the built-in engine answers in milliseconds; cards render instantly with spring animations; actions show a Done line with Undo.
- **Claude (optional):** with `ANTHROPIC_API_KEY` set, Claude writes the text from the facts sheet and is told which cards and buttons are already on screen, so it interprets instead of repeating numbers. Cards and actions always come from the deterministic engine.

## 8. Shortcuts
The PWA manifest adds home-screen shortcuts: **What should I do now?**, **Today's receipt**, **Hold everything for 1 hour** (all open `/app/coach?q=…` and ask immediately).
