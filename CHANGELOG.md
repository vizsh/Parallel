# Changelog

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
