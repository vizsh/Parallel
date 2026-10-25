# Parallel frontend

React 19 + Vite 6 + TypeScript + Tailwind v4, shipped as a website, a PWA and Capacitor Android/iOS apps. Project overview: [../README.md](../README.md). Full context and conventions: [../docs/CONTEXT.md](../docs/CONTEXT.md).

## Commands
| Command | What it does |
|---|---|
| `npm install` | install dependencies |
| `npm run dev -- --port 5180` | dev server (add `--host` to reach it from a phone on the same Wi-Fi) |
| `npx tsc -b` | type-check |
| `npx eslint <files>` | lint the files you changed (some older files have pre-existing lint errors) |
| `npm run build` | production build into `dist/` |
| `npm run android` / `npm run ios` | build, sync and open the native project (needs Android Studio / Xcode) |

## Configuration
- `VITE_API_URL`: where the FastAPI backend lives (default `http://localhost:8787`). Put it in `.env.development.local` or `.env.production.local` (both gitignored). On a phone, `localhost` is the phone itself: use your laptop's LAN IP or a deployed URL.

## Layout
```
src/
├─ App.tsx              routes (public: /, /signin, /signup, /privacy, /contact, /demo · app: /app/*)
├─ app/                 the signed-in pages (Today = Home.tsx, Multiverse = Simulator.tsx, Inbox, …)
├─ pages/               Landing, Auth, Onboarding, Demo, Privacy, Contact, NotFound
├─ landing/             the 3D scroll-driven landing (R3F + GLSL)
├─ components/          UI pieces, including the phone-first layer:
│                         SwipeDeck · HeldJar · ForkDrag · EnergyBattery · GuessGame · FuturesRain · Dominoes
│                         BadgeCard · Receipt · FuturePeek · ComicArt · FutureTexts · PhoneDemo
└─ lib/                 api · auth · hooks (toasts, useApi) · feel (haptics) · native (Capacitor)
                        universes (comic scripts) · cards · future (comic builder) · futureTexts · i18n · seo
```

## Rules of thumb
- Every gesture has a button/keyboard equivalent; every animation has a `useReducedMotion()` path.
- Use `feel(kind)` for haptics; pass `quiet = true` to `toast()` when the component already buzzed.
- Components files export components only; shared constants, types and hooks go in `src/lib/`.
- Colour meaning: `chaos` (orange) = Universe A / cost; `calm` (mint) = Universe B / protected.
