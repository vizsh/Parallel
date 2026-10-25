# Changelog

## v0.5.0 — the coach becomes a copilot
### Added
- **Answers as cards:** ping price (with Peek / Hold / Open), attention receipts (day, week Wrapped-style, per app), compare, plan timeline, evidence, jar, fingerprint, aura, X-ray, memory, reply draft, command list.
- **Actions with Undo:** hold everything, start a focus block, mute an app until tonight or the exam, a night off from the guard, pour the jar, draft a reply, reminders, remember facts, commitments, experiments.
- **Commands:** slash commands (`/receipt`, `/week`, `/plan`, `/hold 2h`, `/focus 50`, `/jar`, `/why`, `/xray`, `/aura`, `/me`, `/help`) with a menu, plain-language actions, and paste-a-notification X-ray.
- **Problem diagnosis:** “I can't focus” → evidence from your data, one fix, today's plan; “why am I tired” → last five nights vs bedtime.
- **Proactive nudges:** at most 3 a day (golden hours, checkpoint, late night, exam morning, rabbit hole, slipped commitment, finished experiment, weekly), each mutable.
- **Memory:** “what do you know about me” as an editable card; commitments are checked the next day.
- **Tone switch** (Plain / Gen Z), time-of-day chips, home-screen quick-ask shortcuts, Claude told which cards are on screen.
- **Temporary rules** (`coach_overrides`) applied on every decision; `GET /api/coach/overrides`.
- Docs: `docs/COACH.md`.

## v0.4.0 — shields, simulations and a coach that actually talks
### Added
- **Simulations:** five self-playing phone scenarios (study session, developer in flow, 1 AM doomscroll, exam-week group chat, the “we miss you” trap) at `/app/simulations` and `/demo`, each recorded as a 1080×1920 MP4 in `frontend/public/simulations/`.
- **Manipulation X-ray:** names the engagement tactic in each ping (7 tactics), with teaser unmasking. Shown in the inbox, swipe cards, Multiverse and on the doors.
- **Shields:** re-engagement shield (“we miss you” → digest) and a late-night guard (only VIPs from 30 min before bed until wake), toggle in Settings (`PATCH /api/me/guards`).
- **Aura points and the fate meter** on Today, from your decisions (`aura`, `fate` in `/api/gamification/profile`).
- **Peephole** (press and hold a door) and the **plot-twist panel** (fifth comic panel when reality falls outside the twin's range).
- **Coach rebuilt:** 25 question types, conversation memory, follow-up chips, a grounded facts sheet, and optional Claude (Opus 5.5, `ANTHROPIC_API_KEY`) with automatic fallback to the built-in engine.
- **Shields & feel** panel in Settings: late-night guard, re-engagement shield, haptics on/off, guess-before-reveal on/off.
- **Docs:** `FEATURE_LIST.md` (every feature and how it works), updated API, formulas and context.

### Fixed
- The late-night guard never overrides a more specific hold reason (for example “You're in Lectures until 1:00 PM”).

## v0.3.0 — phone-first, Gen Z layer
### Added
- **Haptic language** (`lib/feel.ts`): one distinct feel per kind of choice; native haptics, `navigator.vibrate` fallback, shake detection, an off switch.
- **Smart inbox:** swipe triage deck (right allow, left hold, up digest, down noise), Peek on every card, a physics **held-pings jar** you tap or shake to pour, and a **till receipt** when the inbox is cleared.
- **Multiverse:** **guess before reveal** (You vs Twin vs Reality), **raining futures** histogram, **dominoes** for Universe A's chain, **drag to fork**, **holo badge cards** with a 12-card binder.
- **Today:** **energy battery** check-in, the jar for check moments, **Texts from future you** (timed to the twin's predicted cost; local notifications in the native app).
- **Door to the Future:** two doors per ping opening onto four-panel comics drawn in SVG from the twin's numbers, ending on *The Scrollfather* or *Main Character*, with a shareable 1080×1920 poster and “choose this future”.
- **`/demo`:** a self-playing phone showing a notification landing and Parallel working on top of it; `?clean=1` recording mode; linked from the Smart inbox.
- **Docs:** README rewritten; new `docs/CONTEXT.md`, `docs/PHONE_EXPERIENCE.md`, `docs/FUTURE_PEEK.md`, `docs/REAL_NOTIFICATIONS.md`.

### Fixed
- `python -m ml.train` crashed on Windows (`UnicodeEncodeError`): training outputs are now written as UTF-8.
- The coach crashed (`KeyError: 'ask'`) whenever the twin abstained; it now tells you to decide yourself, in all four languages.

### Known limits
- Haptics, shake, gyro tilt, native sharing and future-text notifications are not yet verified on a physical phone; shake and tilt need HTTPS or the native app.
- Badge cards and future texts are stored on the device only.
- The inbox still uses sample pings; the Android listener is specified in `docs/REAL_NOTIFICATIONS.md`, not built.

## v0.2.0 — routine-aware twin, mobile app, brain-first landing
### Added
- **7-step onboarding:**
  - persona and goals
  - wake/bed time and chronotype
  - weekly schedule editor with templates (skippable)
  - deadlines and exams (skippable)
  - tool vs nag apps
  - who always gets through

  The same editor is in Settings.
- **The twin uses your schedule:**
  - the focus curve, day-0 history, planner and recommendations all follow it
  - during a class or work block, low-value pings are held and the reason names the block
  - a deadline within 3 days makes the twin stricter and adds a "guard your golden hours" recommendation
- **Ongoing inputs on Today:**
  - a 10-second energy check-in
  - "did this matter?" taps that replace the generic importance of each alert type
  - a meter showing how well the twin knows you and what to add next
- **"Best moments to check held pings"**, based on when your declared blocks end. On native, these can become local reminders.
- **Time machine:** 30 simulated days, your current habits vs following the twin.
- **Attention doppelgänger:** your closest behavioural match among the 60 population users, and what worked for them.
- **Auto-reply drafts** for held DMs and work chat, in en/hi/mr/es. Never sent automatically.
- **Mobile:**
  - PWA (manifest, icons, offline shell)
  - Capacitor 8 with `android/` and `ios/` projects
  - safe areas
  - phone tab bar with a More sheet
  - haptics and the Android back button
- **Landing:** brain-first opening. Scrolling zooms through the brain into the twin's head.
- **Docs:** ARCHITECTURE, MOBILE, DATA_AND_ML, ROADMAP, CONTRIBUTING, and a Word project report.

### Fixed
- ActivityWatch ingest: it wrote to a removed `title` column. It now stores deduplicated events, turns them into live segments the fingerprint learns from, and accepts `tz_offset_min` because ActivityWatch times are UTC (pass 330 for IST).
- Horizontal overflow on phones from grids without explicit columns.
- The phone tab bar pointed at the wrong page after the Data & models page was added.

### Known limits
- Day-0 history is still generated. It now follows your declared routine, but it is not behaviour you actually showed; the Settings page says so, and real data replaces it as it arrives.
- Accuracy numbers are still on synthetic data. The best upgrade for a demo is a few days of your own ActivityWatch data.
- The ChatGPT share link in the brief never loaded, so none of its ideas are in this build.

## v0.1.0 — hackathon build
- Personal twin, Multiverse simulator, smart inbox, fingerprint, replay, twin brain, accuracy center, Lab, coach, 3D landing, population dataset and trained models.
