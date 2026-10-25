# The phone experience

How every interactive, phone-first piece of Parallel works, where its code lives and what was tested. The goal of this layer: **every core decision is a thumb gesture with its own feel**, and every number from the twin becomes something you can watch happen.

Status legend: ✅ built and tested in a browser at 375×812 · 🟡 built, needs real-device check

---

## The haptic language (`src/lib/feel.ts`)
One function, `feel(kind)`, so a choice feels the same everywhere:

| Kind | Used for | Web vibration (ms) | Native |
|---|---|---|---|
| `tick` | dragging, sliders, each domino, each text bubble | 6 (throttled to one per 45 ms) | light impact |
| `allow` | letting a ping through | 18 | medium impact |
| `hold` | holding a ping | 14 · 70 · 14 | double light |
| `digest` | adding to the digest | 8 · 45 · 8 · 45 · 8 | triple tap |
| `noise` | “this didn't matter” | 40 | heavy impact |
| `pour` | pouring the jar | a ripple of 6 ms taps | ripple |
| `success` / `warning` | confirmations, Door B / Door A | 12 · 60 · 24 / 30 · 50 · 30 | notification types |

- Native uses `@capacitor/haptics`; Android Chrome uses `navigator.vibrate` (only after the first user tap); iOS Safari and desktop are silent.
- `localStorage['parallel.haptics'] = 'off'` turns it off.
- `useShake(onShake, enabled)` detects three sharp `devicemotion` jolts within 700 ms (2 s cooldown). `requestMotion()` asks iOS for motion permission. 🟡 Needs HTTPS or the native app.

## Smart inbox

### Swipe triage deck ✅ (`components/SwipeDeck.tsx`)
- **Right** allow · **left** hold · **up** digest · **down** noise (hold + tells the twin this kind of ping didn't matter via `POST /api/feedback/matter`).
- A card commits past 110 px or on a fast flick (velocity counts). Stamps fade in as you drag; the card rotates with the drag.
- Each card shows the app, the text, a rotated “−X focus min” price tag, the open probability, “Twin says …” and the reason.
- **Peek** button (top right) opens the Door to the Future for that ping without starting a drag.
- Buttons under the deck and arrow keys do the same as swipes. Phones get the deck by default; desktops get the list (toggle in the header).

### Held-pings jar ✅ / shake 🟡 (`components/HeldJar.tsx`)
- A canvas physics jar. Every held ping is a ball coloured by category; new holds drop in at the mouth.
- **Tap or shake to pour:** the jar tilts to 128°, the balls tumble out, the queue is released in one batch (`POST /api/digest/release`), then the jar springs back.
- The animation loop sleeps when everything has settled (battery friendly).
- Used in the inbox's deferred-queue panel and on Today (“Best moments to check held pings”).

### Receipt ✅ (`components/Receipt.tsx`)
When every ping has a decision, a till receipt slides out of a slot: one line per ping, focus protected, opened on purpose, XP, “NO REELS WERE HARMED”, a barcode, and **Share** (native share sheet or clipboard).

## Multiverse

### Guess before reveal ✅ (`components/GuessGame.tsx`)
Before any numbers, you bet how many minutes the ping would eat (0–60, a thumb-sized slider). The result puts **You · Twin · Reality** on one bar with the twin's 80% range shaded:
- inside the range: “Ate. You know yourself.”
- under: “Delulu alert: the quick check is never quick.”
- over: “Dramatic much? This one's not that deep.”

Skippable (“Just show me”), and the gate can be turned off with the *Guess before reveal* checkbox.

### Raining futures ✅ (`components/FuturesRain.tsx`)
600 dots (≈3 futures each) fall with gravity and pile into the cost histogram, with the p10–p90 band and the mean marked. “again” replays it.

### Dominoes ✅ (`components/Dominoes.tsx`)
Universe A's most likely chain as dominoes. Each one's height is the minutes that step adds; they tip in sequence (a tick each) and land on “N min gone”.

### Drag to fork ✅ (`components/ForkDrag.tsx`)
Drag the token left into Universe A (allow) or right into Universe B (hold). Live “+min” counters follow the drag, a tick fires every quarter of the way, and it commits at 72% of the track. Small Allow / Hold / Digest buttons stay underneath.

### Holo badge cards ✅ / gyro 🟡 (`components/BadgeCard.tsx`, `lib/cards.ts`)
Each decision earns the archetype card of the universe you stepped into (12 in total: 5 categories + a generic pair, × 2 universes). The new card flips in; its foil follows your finger, the mouse or the gyroscope. The **binder** shows all 12, locked until collected, with ×N counts. Stored on the device.

### Door to the Future ✅ (`components/FuturePeek.tsx`)
See **[FUTURE_PEEK.md](FUTURE_PEEK.md)**.

## Today

### Energy battery ✅ (`components/EnergyBattery.tsx`)
A vertical 5-segment battery. Drag up or down (a tick per level), release to commit the check-in. `role="slider"` with arrow-key support.

### Texts from future you ✅ / native notification 🟡 (`components/FutureTexts.tsx`, `lib/futureTexts.ts`)
See **[FUTURE_PEEK.md](FUTURE_PEEK.md#texts-from-future-you)**.

## The phone demo ✅ (`components/PhoneDemo.tsx`, `/demo`)
A self-playing phone for pitches and onboarding. Seven scenes, about 18 seconds per loop:

| # | Scene | Caption |
|---|---|---|
| 1 | Studying in a notes app, focus timer running | You're deep in DBMS notes. |
| 2 | Instagram banner drops in; the phone shakes | A ping lands. |
| 3 | Parallel's strip expands under the banner: “−18 min if you tap · 74% rabbit hole”, Peek / Hold / Open | Parallel scores it on top of the notification, before you tap. |
| 4 | A finger taps Peek; Door A's Scrollfather panel flips in | Peek: Door A. |
| 5 | Door B's Main Character panel; the finger taps Hold | You choose: hold. |
| 6 | The notification shrinks into the jar pill: “3 held · until 1:00 PM” | Focus keeps going. |
| 7 | 1:00 PM: “3 pings, one calm batch” + a text from future you | Future you texts back. |

- Step dots double as a scrubber; play/pause and restart; captions are `aria-live`.
- Reduced motion: it doesn't autoplay; step through with the dots.
- `/demo?clean=1` hides everything except the phone and captions, for screen recording into a video or GIF (Windows `Win + Alt + R`, macOS `Cmd + Shift + 5`, or the phone's own screen recorder when opened on a phone).
- The comic panels inside the demo are the same `PanelArt` drawings the real feature uses.
- Entry points: `/demo`, and **See it on a phone** in the Smart inbox header.

## Accessibility checklist used for every component
- A non-gesture path (buttons, arrow keys, Escape) for every gesture.
- `aria-label`s that state the effect (“Hold: until your checkpoint”), `role="slider"` / `role="dialog"` where appropriate, `aria-live` for things that change on their own.
- `useReducedMotion()` → instant or static versions.
- Haptics are a bonus channel, never the only signal.

## Trying it on a real phone
See [RUN.md](../RUN.md) and [MOBILE.md](MOBILE.md). Over Wi-Fi as a web app: swipes, drags, the doors, the jar tap, vibration (Android Chrome) all work. Shake and gyro tilt need HTTPS or the native app.
