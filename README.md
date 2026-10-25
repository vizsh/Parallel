<div align="center">

# Parallel

### Your attention digital twin

**Every ping forks your day. Parallel shows you both futures before you tap.**

Built for **CASCADE ’26 · Theme 3 · Problem 3: The Attention Digital Twin**

[Run it](RUN.md) · [Project context](docs/CONTEXT.md) · [Phone experience](docs/PHONE_EXPERIENCE.md) · [Door to the Future](docs/FUTURE_PEEK.md) · [Real notifications](docs/REAL_NOTIFICATIONS.md) · [Architecture](docs/ARCHITECTURE.md) · [Data & ML](docs/DATA_AND_ML.md) · [Mobile build](docs/MOBILE.md) · [API](docs/API.md)

![Parallel landing: the attention twin as a hologram head](docs/screenshots/landing-hero.jpg)

</div>

---

## Contents
1. [The problem in one example](#the-problem-in-one-example)
2. [What Parallel is](#what-parallel-is)
3. [See it on a phone in 15 seconds](#see-it-on-a-phone-in-15-seconds)
4. [Feature tour](#feature-tour)
5. [The phone-first, Gen Z layer](#the-phone-first-gen-z-layer)
6. [How it would run over real notifications](#how-it-would-run-over-real-notifications)
7. [Data & ML (honest version)](#data--ml-honest-version)
8. [Quick start](#quick-start)
9. [Architecture](#architecture)
10. [Repository map](#repository-map)
11. [What is built, what is simulated, what is next](#what-is-built-what-is-simulated-what-is-next)
12. [Documentation index](#documentation-index)

---

## The problem in one example

You're studying. *“aarav_07 and 12 others liked your post.”*

| Universe A: you tap it | Universe B: your twin holds it |
|---|---|
| +2 min to look → Instagram opened → +17 min of reels → +8 min to remember where you were = **~27 focus minutes gone** | Held until your next checkpoint, read in a 10-second batch = **~0.7 min** |

Everyone's attention is different. The same like can cost one person 2 minutes and another 40. Parallel learns *you*: it predicts the chain of events one notification will set off, gives a range and a confidence, compares it with the counterfactual (what happens if you hold it), and then checks itself against what really happened.

## What Parallel is

Parallel is a **digital twin of your attention**. It is three things stacked on top of each other:

| Layer | What it does | Where it lives |
|---|---|---|
| **The model** | Learns when you focus best, what pulls you away, which apps fragment you, when you're tired and which pings actually matter. Simulates 2,000 futures per ping with Monte Carlo, and estimates the counterfactual from randomized holdouts. | `backend/app/twin.py`, `backend/ml/` |
| **The decision** | For every ping: let it through, hold it until a checkpoint, or put it in a digest. Trusted senders always pass. When evidence is thin it asks you instead of deciding. | `/api/simulations`, Smart inbox |
| **The feeling** | Makes the number *felt*: swipe cards, a jar of held pings, doors that open onto comic futures, texts from future you, haptics for every choice. Comedy on top, real numbers underneath. | `frontend/src/components/*` |

It runs as a **website**, an **installable PWA**, and **Android/iOS apps** (Capacitor) from one React codebase.

## See it on a phone in 15 seconds

Open **`/demo`** (for example `http://localhost:5180/demo`). It's a self-playing phone:

1. You're deep in DBMS notes, focus timer running.
2. An Instagram notification lands and the phone buzzes.
3. Parallel's strip appears **on top of the notification**: “−18 min if you tap · 74% rabbit hole”, with **Peek / Hold / Open**.
4. Peek: Door A shows *The Scrollfather*; Door B shows *Main Character*.
5. You hold it. It drops into the jar until 1:00 PM; focus keeps going.
6. At 1:00 PM the held pings arrive as one calm batch, and **future you texts back**.

Add `?clean=1` (`/demo?clean=1`) for a recording mode with just the phone and captions. Record it with any screen recorder (Windows: `Win + Alt + R`; macOS: `Cmd + Shift + 5`) to get a video for slides. The Smart inbox has a **See it on a phone** button that opens the same demo.

## Feature tour

### The twin learns everything the problem statement asks for
| The twin learns… | How | Where you see it |
|---|---|---|
| When you focus best | Focus quality by weekday × hour, shifted by your declared wake/bed time and chronotype | Fingerprint heatmap, 3D ring, golden hours |
| What causes interruptions | Calibrated p(open \| context): task depth, fatigue, time, sender, recent switches | Multiverse “why” factors, Twin brain |
| Which content causes prolonged sessions | p(rabbit hole) plus dwell-time models per app/category | Fragmentation bars, Replay |
| Which notifications matter | Your “did this matter?” taps, rules and randomized uplift per category | Smart inbox, Today |
| When you're fatigued | Behavioural estimate plus your 10-second energy check-ins | Today, planner, coach |
| Which apps fragment you | Breaks per day × cost per break; tool apps vs nag apps | Fingerprint, attention debt |
| “If I allow this now?” + counterfactual | 2,000 Monte Carlo futures; randomized holdouts; T-learner | **Multiverse** (hero feature) |

### Personas: the twin's starting guess
On day one the twin has no history, so it borrows the typical pattern of your kind of busy, then moves towards *you* as your data arrives. Its personal weight grows as n/(n+20).

| Persona | Starting focus peaks | Work tools | Most frequent pings | Fatigue usually from |
|---|---|---|---|---|
| Student | 10 AM and 9:30 PM | Notion, Docs, lectures | Social likes, DMs | 4 PM |
| Developer | 11 AM and 11 PM | VS Code, Terminal, GitHub | Work chat, email, news | 4:30 PM |
| Creator | 2 PM and 8 PM | Figma, Docs, Notion | Social likes (their feed is also their work) | 6 PM |
| Professional | 9:30 AM and 3 PM | Excel, Docs, Notion | Work chat, email, meetings | 3 PM |

### Pages
| Page | What it does |
|---|---|
| **Today** | Echo the 3D companion, focus capacity, fatigue, golden hours, energy battery check-in, “did this matter?”, knowledge meter, held-pings jar, **texts from future you**, attention budget, focus reservation, context checkpoint, quests |
| **Multiverse** | Pick a ping and the moment it arrives. Guess its cost first, then see two comic universes over grounded numbers, raining futures, dominoes, the **Door to the Future**, a drag-to-fork decision, a holo badge card and a reality check that grades the prediction |
| **Smart inbox** | Swipe deck on phones (right allow, left hold, up digest, down noise), list on desktop, Peek on every card, deferred queue with a pourable jar, auto-reply drafts in 4 languages, and a till receipt when you clear it |
| **Fingerprint** | Your attention heatmap, 3D ring and fragmentation by app |
| **Replay** | Your day as a timeline of switches and focus blocks |
| **Twin brain** | Explorable knowledge graph of tasks, times, triggers, apps and outcomes |
| **Accuracy** | Calibration, comparison against a generic rule, drift (PSI), prediction-vs-reality |
| **Data & models** | Dataset preview, model registry, metrics vs baselines, hash-chained audit log |
| **Coach** | Voice and text coach in English, हिन्दी, मराठी, Español. Every number comes from the models |
| **Lab** | Attention budget and debt, co-focus rooms, habit experiments, developer Attention API + JS SDK, team health (aggregates only, k ≥ 5) |
| **Settings** | Routine, weekly schedule, deadlines, tool vs nag apps, VIPs, privacy: pause learning, retention, export, delete |

### It knows your day
- **7-step onboarding:** persona and goals → wake/bed time and chronotype → weekly schedule (templates) → deadlines and exams → tool vs nag apps → who always gets through. Schedule and deadline steps can be skipped; the same editor lives in Settings.
- **Schedule-aware decisions:** during a class or work block, low-value pings are held and the reason names the block (“You're in Lectures until 1:00 PM…”). A deadline within 3 days makes the twin stricter.
- **Best moments to check held pings**, from when your blocks end. On native these become local reminders.

### Trust and privacy
- Metadata only: message text and window titles are never stored.
- Pause learning, set a retention window, export a portable profile, delete everything.
- Gamification without guilt: XP for *intentional* choices (allowing on purpose counts), anti-farming rules, a daily cap on holding back, no shame mechanics.

## The phone-first, Gen Z layer

The core numbers are serious; the way you meet them doesn't have to be. Everything below is built, tested at 375 px, and documented in **[docs/PHONE_EXPERIENCE.md](docs/PHONE_EXPERIENCE.md)**.

| Feature | What it feels like |
|---|---|
| **Swipe triage deck** | Tinder for pings. Right allow, left hold, up digest, down “noise” (also teaches the twin it didn't matter). Stamps, a price tag in focus minutes, and a distinct haptic per direction. |
| **Held-pings jar** | A physics jar. Every hold drops a ball in, coloured by category. Tap or **shake the phone** to pour them out as one calm batch. |
| **Drag to fork** | Drag a token into Universe A or B. Live “+min” counters run as you drag; it ticks every quarter of the way. |
| **Energy battery** | Drag a battery up or down to check in. One tick per level. |
| **Guess before reveal** | Bet how many minutes the ping would eat before the twin answers. “Ate.” / “Delulu alert.” / “Dramatic much?” |
| **Raining futures** | The 2,000 simulated futures fall as dots and pile into the cost histogram. |
| **Dominoes** | Universe A's chain as dominoes sized by the minutes each step adds. They fall, one haptic each. |
| **Holo badge cards** | Each decision earns that universe's archetype card (*Main Character Energy*, *Professional Thumb Athlete*…). The foil follows your finger or the gyroscope. 12 to collect in a binder. |
| **Inbox receipt** | Clear the inbox and a till receipt prints: focus protected, opened on purpose, XP, “NO REELS WERE HARMED”, Share. |
| **Door to the Future** | Two doors per ping. Each opens onto a four-panel comic drawn in code from your numbers, ending on **The Scrollfather** or **Main Character**, with a shareable 1080×1920 poster. See **[docs/FUTURE_PEEK.md](docs/FUTURE_PEEK.md)**. |
| **Texts from future you** | Every decision queues a chat from “you, N minutes from now”, timed to the twin's predicted cost: “bro. it's 11:18 pm. we opened insta ‘to see who liked it’ 💀”. On Android/iOS it arrives as a real local notification. |
| **Phone demo** | `/demo`: a self-playing phone showing a notification landing and Parallel working on top of it. |

A single haptic language runs through all of it (`frontend/src/lib/feel.ts`): native Capacitor haptics in the app, `navigator.vibrate` on Android Chrome, silent elsewhere, and a `parallel.haptics = off` switch.

## How it would run over real notifications

Today the inbox is fed by realistic sample pings. The production design is documented step by step in **[docs/REAL_NOTIFICATIONS.md](docs/REAL_NOTIFICATIONS.md)**. In short:

- **Android (the real target):** a `NotificationListenerService` (the user grants *Notification access*) sees each notification's package, category and timing, **drops the text**, asks the twin, and either lets it through, snoozes/cancels it and re-posts it at the checkpoint, or adds it to the digest. A heads-up “Parallel” notification with **Peek / Hold / Open** actions is how it appears *on top of* the original. Usage access (`UsageStatsManager`) gives the app timeline.
- **iOS:** apps cannot read other apps' notifications. Parallel works through Focus filters, Screen Time (FamilyControls) and its own inbox.
- **Desktop:** ActivityWatch today (`POST /api/ingest/activitywatch`); Windows `UserNotificationListener` later.

The API reports this capability matrix at `GET /api/platform/capabilities`.

## Data & ML (honest version)
- `python -m ml.dataset` creates a **synthetic** population: 60 users × 30 days, **81,582 notification events × 35 columns** and 149,649 app sessions, saved as CSVs and SQLite tables.
- `python -m ml.train` trains population models evaluated on **users never seen in training**:

| Target | Model | Unseen-user result | Baseline |
|---|---|---|---|
| p(open) | Gradient boosting + isotonic | **AUC 0.845** | 0.728 |
| p(rabbit hole) | Gradient boosting + isotonic | **AUC 0.802** | — |
| Focus cost p10–p90 | Quantile GBMs | **79% coverage**, MAE 5.5 min | MAE 6.0 |
| Counterfactual | T-learner | **0.9 min** gap vs randomized truth | — |

- Every account's history lives in SQLite (`user_segments`, `user_notifications`). Real events (`source='live'`) are appended, and the twin refits from the database.
- Details: **[docs/DATA_AND_ML.md](docs/DATA_AND_ML.md)**.

## Quick start
```bash
git clone https://github.com/vizsh/Parallel.git
cd Parallel
./run.sh
```
On Windows: `powershell -ExecutionPolicy Bypass -File .\run.ps1`. Then open **http://localhost:5180** (API on **8787**). The script creates the Python venv, installs both halves, builds the synthetic dataset and trains the models on first run.

| Demo login | Password |
|---|---|
| student@parallel.app · developer@parallel.app · creator@parallel.app · professional@parallel.app | `parallel123` |

**On your phone (same Wi-Fi, no installs):** start the API with `--host 0.0.0.0`, start Vite with `--host`, set `VITE_API_URL=http://<laptop-LAN-IP>:8787` in `frontend/.env.development.local`, open `http://<laptop-LAN-IP>:5180` and use *Add to Home screen*. Allow Python and Node through the firewall on private networks if the phone can't connect. Full instructions: **[RUN.md](RUN.md)** and **[docs/MOBILE.md](docs/MOBILE.md)**.

**APK:** needs the Android SDK (it comes with Android Studio): `cd frontend && npm run android`, then *Build → Build APK(s)*. Java alone isn't enough, because Gradle needs Android's platform jars and build tools to compile and package the native shell.

## Architecture
```
React 19 (web · PWA · Capacitor Android/iOS) ──HTTPS/JWT──▶ FastAPI ──▶ SQLite
   3D landing (R3F + GLSL) · 12 app screens        twin.py · routine.py · population.py    users · profiles · history
   phone layer: swipe · jar · doors · texts         routine_api · platform_api · assistant   predictions · audit chain
   i18n (4 languages) · voice coach · haptics       ▲ versioned models (ml/train.py)         ds_* population dataset
```
The life of one ping, end to end, is in **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** and **[docs/CONTEXT.md](docs/CONTEXT.md)**.

| Layer | Stack |
|---|---|
| Frontend | React 19, Vite 6, TypeScript, Tailwind v4, motion (Framer Motion), three.js + React Three Fiber, GSAP, react-i18next |
| Native | Capacitor 8 (Android, iOS): haptics, local notifications, status bar, app |
| Backend | FastAPI, SQLite, scikit-learn, NumPy/pandas, JWT auth |
| ML | Gradient boosting + isotonic calibration, quantile GBMs, T-learner, Monte Carlo rollouts |

## Repository map
```
Parallel/
├─ README.md · RUN.md · CHANGELOG.md · CONTRIBUTING.md · run.sh · run.ps1
├─ docs/
│  ├─ CONTEXT.md             ← start here: the whole project's context, decisions and gotchas
│  ├─ PHONE_EXPERIENCE.md    every playful phone interaction, how it works, where it lives
│  ├─ FUTURE_PEEK.md         Door to the Future + Texts from future you + the Gen Z backlog
│  ├─ REAL_NOTIFICATIONS.md  running over real notifications: Android, iOS, desktop, permissions
│  ├─ ARCHITECTURE.md · DATA_AND_ML.md · MOBILE.md · API.md · FEATURES.md · ROADMAP.md
│  ├─ IDEATION.md · PRESENTER_GUIDE.md · Parallel_Project_Report.(pdf|docx)
│  └─ screenshots/
├─ sdk/parallel-sdk.js                  Attention API client
├─ backend/
│  ├─ app/   main · twin · routine · routine_api · platform_api · population · history · synth · assistant · gamify
│  ├─ ml/    dataset.py · train.py
│  └─ tests/ test_api.py
└─ frontend/
   ├─ src/landing/     TwinWorld (WebGL world) · shapes · scroll
   ├─ src/pages/       Landing · Auth · Onboarding (7 steps) · Demo · Privacy · Contact · NotFound
   ├─ src/app/         Today · Multiverse · Inbox · Fingerprint · Replay · Brain · Lab · Accuracy · Data & models · Coach · Settings
   ├─ src/components/  SwipeDeck · HeldJar · ForkDrag · EnergyBattery · GuessGame · FuturesRain · Dominoes · BadgeCard
   │                   Receipt · FuturePeek · ComicArt · FutureTexts · PhoneDemo · Universes · RoutineEditor · VoiceCoach · charts
   ├─ src/lib/         api · auth · feel (haptics) · future (comic builder) · futureTexts · cards · universes · native · i18n
   ├─ android/ · ios/  Capacitor native projects
   └─ public/          PWA manifest, service worker, icons, robots, sitemap, OG image
```

## What is built, what is simulated, what is next

| | Status |
|---|---|
| Personal twin, Multiverse, Smart inbox, population models, registry, audit | ✅ built and working |
| Routine-aware decisions, onboarding, check-ins, check moments | ✅ built |
| Phone-first layer (swipe, jar, fork drag, battery, guess, rain, dominoes, cards, receipt) | ✅ built, tested at phone width in a browser |
| Door to the Future, Texts from future you, `/demo` | ✅ built, tested in a browser |
| Haptics, shake and gyro on a real device | 🟡 code in place; vibration works in Android Chrome; shake and tilt need HTTPS or the native app; not yet tested on hardware |
| Inbox pings | 🟡 realistic samples from the API, not your phone's real notifications |
| Day-0 history and accuracy numbers | 🟡 synthetic, shaped by your declared routine; real data replaces it as it arrives |
| Badge cards and future texts | 🟡 stored on the device (localStorage), not synced to the backend |
| Android NotificationListener plugin | 🗺️ next; fully specified in [REAL_NOTIFICATIONS.md](docs/REAL_NOTIFICATIONS.md) |
| Signed APK / store builds | 🗺️ needs Android Studio (SDK) or a CI build |

The ordered plan is in **[docs/ROADMAP.md](docs/ROADMAP.md)**; the Gen Z feature backlog (aura points, plot-twist panels, weekly webtoon, door skins, co-op comics…) is in **[docs/FUTURE_PEEK.md](docs/FUTURE_PEEK.md#backlog)**.

## Documentation index
| Doc | Read it when you want… |
|---|---|
| [docs/CONTEXT.md](docs/CONTEXT.md) | the full story: what exists, why it was built this way, conventions, gotchas, how to continue (also written for AI coding agents) |
| [docs/PHONE_EXPERIENCE.md](docs/PHONE_EXPERIENCE.md) | how each interactive phone component works and where its code is |
| [docs/FUTURE_PEEK.md](docs/FUTURE_PEEK.md) | the Door to the Future spec, the comic system, future texts, the Gen Z backlog and art references |
| [docs/REAL_NOTIFICATIONS.md](docs/REAL_NOTIFICATIONS.md) | how Parallel would sit on top of real notifications on Android, iOS and desktop |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | the system diagram and request flow |
| [docs/DATA_AND_ML.md](docs/DATA_AND_ML.md) | the dataset, features, models and evaluation |
| [docs/MOBILE.md](docs/MOBILE.md) | PWA, Android and iOS builds |
| [docs/API.md](docs/API.md) | every endpoint |
| [docs/FEATURES.md](docs/FEATURES.md) | the 75-item backlog with status |
| [docs/IDEATION.md](docs/IDEATION.md) | the problem, research, competitors and differentiators |
| [docs/PRESENTER_GUIDE.md](docs/PRESENTER_GUIDE.md) | a demo script for judges |
| [RUN.md](RUN.md) | running it on Mac, Windows and phones |

## Honest limits
- **Day-0 history is generated.** It follows your declared routine, but it is not behaviour you actually showed. Settings says so, and real data replaces it.
- **Accuracy numbers are on synthetic data.** The best upgrade is a few days of your own ActivityWatch data (`POST /api/ingest/activitywatch?tz_offset_min=330`; ActivityWatch times are UTC, 330 is IST).
- **iOS can't read other apps' notifications.** Android and desktop are the realistic first platforms.
- **Fatigue is a behavioural estimate**, never a medical claim.
- **The comics are comedy over estimates.** Every one says so: “an estimate, not a prophecy”.
