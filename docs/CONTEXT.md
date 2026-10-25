# Parallel: full project context

This is the document to read before touching the code. It explains what Parallel is, how it got here, why things are the way they are, the conventions the code follows, and the traps that cost time before. It is written for new teammates and for AI coding agents picking the project up cold.

> Last updated: 2026-10-25 (v0.3.0). Repository: https://github.com/vizsh/Parallel

---

## 1. One paragraph
Parallel is an **attention digital twin** built for CASCADE ’26 (Theme 3, Problem 3). For every notification it predicts the chain of events tapping would set off for *this* person (open → feed → rabbit hole → slow return), gives a cost in focus minutes with a range and a confidence, estimates the counterfactual (what happens if it's held), recommends allow / hold / digest, and checks itself against what really happened. On top of those numbers sits a deliberately playful, phone-first layer (swipe cards, a jar, doors onto comic futures, texts from future you) so the cost is *felt*, not just read.

## 2. Product principles (the rules every feature follows)
1. **Numbers are real, stories are comedy.** Every comic, text and card is generated *from* the model's numbers and says so (“an estimate, not a prophecy”). Never invent a number in the UI.
2. **Triage, not blocking.** Research (Fitz et al. 2019) shows batching helps but switching notifications off raises anxiety. Parallel holds and batches; it never silently drops.
3. **Your rules win.** Trusted senders always pass. Allowing a ping *on purpose* is a valid choice and earns XP too.
4. **Honest about uncertainty.** Ranges everywhere, abstention when evidence is thin, accuracy shown rather than claimed.
5. **Metadata only.** Message text and window titles are never stored. Comics use the app name and the category, not the content (the inbox sample text is shown on screen only).
6. **No shame mechanics.** Streaks forgive, XP has anti-farming rules and a daily cap on holding back.
7. **Phone first.** Every new interaction is designed for a thumb at 375 px, with a keyboard and screen-reader path and a reduced-motion path.

## 3. History
| Version | What happened |
|---|---|
| v0.1.0 (hackathon) | Personal twin, Multiverse simulator, smart inbox, fingerprint, replay, twin brain, accuracy center, Lab, coach, 3D landing, synthetic population dataset and trained models. Original repo: `SDP42/parallel`. |
| v0.2.0 | Routine-aware twin (7-step onboarding, schedule, deadlines, tool vs nag apps), ongoing inputs on Today, time machine, doppelgänger, auto-reply drafts, PWA + Capacitor Android/iOS, brain-first landing, Word report. |
| v0.3.0 (this repo) | **Phone-first playful layer.** Batch 1: swipe triage deck, held-pings jar, drag-to-fork, energy battery, haptic language. Batch 2: guess before reveal, raining futures, dominoes, holo badge cards + binder, inbox receipt. Then **Door to the Future** (comic peek), **Texts from future you**, and the **`/demo` phone animation**. Docs rewritten. Moved to `vizsh/Parallel`. |

How the v0.3 work was decided (from the conversation that produced it):
- The team asked whether the UI fits a phone app. Answer: the layout was already responsive with a tab bar and safe areas, but interactions were desktop-ish (buttons and sliders). So the plan became “make every core decision a thumb gesture with a distinct haptic”.
- Real-device notification handling was explained but **not built** (see [REAL_NOTIFICATIONS.md](REAL_NOTIFICATIONS.md)). It needs a native Android plugin and a real device.
- The Gen Z “peek into the future” idea came from reference comics (a 4-panel procrastination strip, a “Timeline A: just one reel / Timeline B: locked in” mock). It became the Door to the Future.
- An APK was requested, but building one needs the Android SDK, which the team chose not to download. So phone testing is done over Wi-Fi as a web app, and the APK path is documented.

## 4. How a ping flows through the system
```
 notification arrives (today: /api/notifications/queue sample; future: Android listener)
        │  category, app, time, sender class: never the text
        ▼
 POST /api/simulations  ─▶ twin.simulate()
        │   features: hour, task depth, fatigue, minutes into block, recent switches, schedule block, deadline pressure
        │   models:   p(open), p(rabbit hole), dwell & resume quantiles  (personal LR blended with population GBM)
        │   2,000 Monte Carlo rollouts → cost distribution (p10/p50/p90, histogram)
        │   counterfactual: randomized holdouts + T-learner → cost if held
        │   recommendation: allow / delay / summarize / ask (abstains when evidence is thin)
        ▼
 UI: Multiverse (guess → reveal → doors → fork) or Inbox (swipe deck / list, Peek)
        │
        ▼
 POST /api/interventions  (the decision, XP)  ─▶ queueFutureText() (client)  ─▶ addCard() (client)
        │
        ▼
 POST /api/outcomes  (reality check: actual minutes) ─▶ verdict, model refits from live rows
```

## 5. Where things live (frontend)
| Concern | File |
|---|---|
| API client, `Sim` type, `CATEGORIES` | `frontend/src/lib/api.ts` |
| Haptic language `feel(kind)`, `useShake`, `requestMotion` | `frontend/src/lib/feel.ts` |
| Native bridge (status bar, back button, local reminders) | `frontend/src/lib/native.ts` |
| Toasts (`toast(text, tone, quiet)`) | `frontend/src/lib/hooks.ts` |
| Comic scripts per category + badge list | `frontend/src/lib/universes.ts` |
| Badge card storage | `frontend/src/lib/cards.ts` |
| Comic builder for the doors (`buildFutures`, `clockAt`, `wrap`) | `frontend/src/lib/future.ts` |
| Texts from future you (templates, queue, hooks) | `frontend/src/lib/futureTexts.ts` |
| Swipe deck | `frontend/src/components/SwipeDeck.tsx` |
| Held-pings jar (canvas physics) | `frontend/src/components/HeldJar.tsx` |
| Drag to fork | `frontend/src/components/ForkDrag.tsx` |
| Energy battery | `frontend/src/components/EnergyBattery.tsx` |
| Guess game | `frontend/src/components/GuessGame.tsx` |
| Raining futures | `frontend/src/components/FuturesRain.tsx` |
| Dominoes | `frontend/src/components/Dominoes.tsx` |
| Holo cards + binder | `frontend/src/components/BadgeCard.tsx` |
| Receipt | `frontend/src/components/Receipt.tsx` |
| Door to the Future (doors, story viewer, ending, share) | `frontend/src/components/FuturePeek.tsx` |
| Comic drawings + share poster (pure SVG) | `frontend/src/components/ComicArt.tsx` |
| Future texts thread | `frontend/src/components/FutureTexts.tsx` |
| Phone demo animation | `frontend/src/components/PhoneDemo.tsx`, page `frontend/src/pages/Demo.tsx` (`/demo`) |
| Pages | `frontend/src/app/*.tsx` (Today = `Home.tsx`, Multiverse = `Simulator.tsx`) |

Backend: `backend/app/main.py` (routes, auth, sample queue), `twin.py` (simulation and decisions), `routine.py` (schedule rules), `population.py` (model loading/blending), `gamify.py` (XP, capabilities, archetypes), `ml/dataset.py`, `ml/train.py`.

## 6. Conventions
**Styling**
- Tailwind v4 with tokens in `frontend/src/index.css`: `bg`, `surface`, `surface-2`, `ink`, `muted`, `chaos` (#ff4a1f, Universe A / cost), `calm` (#3ee6b5, Universe B / protected), `field` / `field-ink` (light card on dark).
- Shared classes: `.panel`, `.btn`, `.btn-calm`, `.btn-ghost`, `.input`, `.small`, `.fork-cut` (clipped corner), `.range-lg` (thumb-sized slider).
- Universe A is always chaos orange; Universe B is always calm mint. The comic posters follow the same rule.

**Motion and feel**
- `motion/react` for everything animated; canvas for particle-heavy things (jar, rain).
- Every component checks `useReducedMotion()` and falls back to a static or instant state.
- Every meaningful choice calls `feel(kind)`: `tick` (continuous feedback), `allow`, `hold`, `digest`, `noise`, `pour`, `success`, `warning`. Pass `quiet = true` to `toast()` when the component already gave haptic feedback, so you don't double-buzz.
- Gestures always have a button and keyboard equivalent (arrow keys on the deck, `role="slider"` on the battery, Escape/arrows in the door viewer).

**State that lives on the device (localStorage keys)**
| Key | What |
|---|---|
| `parallel.haptics` | `off` disables haptics |
| `parallel.guessFirst` | `off` skips the guess gate |
| `parallel.cards.<uid>` | collected badge cards `{id: {n, first}}` |
| `parallel.futureTexts.<uid>` | queued and delivered future texts (last 30) |
Wrap every access in try/catch (private mode can throw).

**Code**
- Keep files that export React components free of other exports (Vite fast refresh warns otherwise). Shared constants, types and hooks go in `src/lib/`.
- Comments explain *why*, briefly; match the surrounding density.
- Pure SVG for anything that may be exported as an image (no web fonts, no `foreignObject`), so it can be rasterised through a canvas.

## 7. Environment and gotchas (each of these cost real time)
| Gotcha | What to do |
|---|---|
| `python -m ml.train` crashed on Windows with `UnicodeEncodeError` | Fixed in v0.3 (`write_text(..., encoding="utf-8")`). If you see it elsewhere, set `PYTHONUTF8=1`. |
| Ports 8787/5180 already in use (another checkout running) | Run on other ports and point the frontend at the API: `VITE_API_URL=http://<host>:<port>` in `frontend/.env.development.local` (gitignored by `*.local`). |
| Phone can't reach the dev server | Start uvicorn with `--host 0.0.0.0` and Vite with `--host`; use the laptop's LAN IP; allow Python/Node through the Windows firewall on private networks. |
| Shake to pour and card tilt do nothing on the phone | `devicemotion`/`deviceorientation` need a secure context (HTTPS) on Chrome and a permission tap on iOS (`requestMotion()`). Over plain LAN http they won't fire. They work in the native app and on an HTTPS deploy. |
| Console: “Blocked call to navigator.vibrate” | Chrome blocks vibration before the first user tap. `feel()` checks `navigator.userActivation.hasBeenActive`; synthetic clicks in automated tests still trigger the warning, harmlessly. |
| Canvas animation didn't draw after a hot reload | React StrictMode runs effects twice; the cleanup must reset the stored `requestAnimationFrame` id to 0 (see `HeldJar.tsx`). |
| Animations look frozen in an automated browser | A hidden/background tab runs rAF at 0 fps. Front the tab before judging animation timing. |
| APK build | Needs the Android SDK (Android Studio). Java 17+ alone is not enough: Gradle needs `android.jar`, `aapt2`, `d8` and signing tools. Alternative: a CI workflow that builds the APK. |
| Lint | `npm run lint` reports some pre-existing errors in older files (RoutineEditor, VoiceCoach, charts, main.tsx). New files are kept lint-clean; `npx tsc -b` and `npm run build` must pass. |
| The inbox repeats the same pings | `/api/notifications/queue` returns the same realistic sample set each load. Real notifications need the Android listener. |

## 8. Testing approach
- `backend/tests/test_api.py`: run with `cd backend && python -m pytest`.
- Frontend: `npx tsc -b`, `npx eslint <changed files>`, `npm run build`.
- UI: every v0.3 feature was exercised in a browser at a 375×812 phone viewport (swipe, pour, fork drag, battery, guess, rain, dominoes, cards, receipt, both doors, both endings, poster rasterisation, inbox peek → decision, future texts queue → typing → delivery, all seven `/demo` scenes).
- **Not yet verified on real hardware:** haptics on a physical phone, shake, gyro tilt, the native share sheet inside the Capacitor app, local notifications for future texts.

## 9. What to build next (in order)
1. **Android NotificationListener plugin.** The one piece that turns the prototype into the product. Spec: [REAL_NOTIFICATIONS.md](REAL_NOTIFICATIONS.md#the-android-plugin-step-by-step).
2. **An HTTPS deploy** (Render/Fly API + Vercel/Netlify web), so sensors work and anyone can install the PWA.
3. **A CI APK build** (GitHub Actions with `setup-java` + `android-actions/setup-android`) so nobody needs the SDK locally.
4. **Sync cards and future texts to the backend** (two small tables) so they survive device changes.
5. **Gen Z backlog** in [FUTURE_PEEK.md](FUTURE_PEEK.md#backlog): aura points, plot-twist panel, weekly webtoon, door skins, co-op comics.
6. **`@capacitor/share`** for sharing the comic poster from inside the native app.
