# Door to the Future, Texts from future you, and the Gen Z backlog

The serious part of Parallel is a number: *this ping will cost you ~18 focus minutes*. This document is about making that number land with a Gen Z audience: a peek into the future, told as a comic, that you can screenshot and send to the group chat.

---

## Door to the Future ✅
**Every ping is a door.** Behind it is a short comic of what happens if you open it, built from your twin's real numbers but drawn as comedy.

### Where it appears
- **Multiverse:** a “Peek through the doors” card after the reveal.
- **Smart inbox:** a yellow **🚪 Peek** button on the top swipe card.
- **Real notifications (planned):** a *Peek* action on Parallel's companion notification. See [REAL_NOTIFICATIONS.md](REAL_NOTIFICATIONS.md).

### The flow
1. **Two doors, one ping.** Door A (orange frame, a spinning 🌀 behind it) is *if you tap*. Door B (mint frame, ✨) is *if you hold*. Light leaks under both. Small print gives the twin's estimate and range.
2. **Open a door:** tap it or swipe it up. It swings open on its hinge (three haptic ticks), the doorway's light floods the screen.
3. **Four panels, story-style:** progress bars at the top, about 3.4 s per panel; tap right to skip ahead, left to go back, hold to pause; arrow keys and Escape work.
4. **The ending:** a stamped title (**ENDING A: THE SCROLLFATHER** or **ENDING B: MAIN CHARACTER**), a tagline, the final panel, the honest small print, and:
   - **Share comic:** draws a 1080×1920 story poster (all four panels, the title, the estimate) and opens the share sheet, or downloads the PNG where file sharing isn't available.
   - **Other door / Back to doors:** the seen door stays ajar.
   - **Open it anyway (on purpose)** / **Hold it. Main character it is.:** records the decision (`POST /api/interventions`), which earns the badge card in the Multiverse and clears the ping in the inbox.
   - **replay**

### The panels
| | Door A: you tap | Door B: you hold |
|---|---|---|
| 1 | Phone buzzes on the desk next to your laptop, notification bubble, **BZZT!** | Phone face-down with a HELD badge, headphones on, **shhh…** |
| 2 | Zombie eyes lit by the phone, reels floating around you, **scroll scroll** | Flow state: speed lines, progress bar filling, **CLICK!** |
| 3 | Night: moon in the window, the laptop asleep (“z z z”), **chai: cold** | Arms up, “✓ DONE”, the reel saved as a reward, **DONE!** |
| 4 | **The Scrollfather:** fedora, red tie, a throne of phones, a cat on the lap. *“I'm gonna make you a reel you can't refuse.”* | **Main Character:** halo, wings, sunglasses, a #1 podium, confetti, golden rays. *“The plot was always about you.”* |

### What comes from your data
- **Clocks:** panel 1 is the moment the ping arrives; Door A's panel 3 is arrival + the twin's expected cost, and panel 4 is arrival + the p90 (worst likely case). Door B's clocks follow a focus block (+25, +50 min) then the held cost.
- **Captions:** the ping-type scripts in `lib/universes.ts` (Instagram likes, YouTube suggestions, Discord DMs, news, promos, and a generic pair), with `{task}` filled from the twin's context (“zero lines of your studying”).
- **The laptop screen** shows your current task.
- **Small print everywhere:** “an estimate, not a prophecy”, with the 80% range when known.

### How it's built
| Piece | File | Notes |
|---|---|---|
| Comic model | `src/lib/future.ts` | `buildFutures(input)` → two `Ending`s of four `ComicPanel`s (scene, mood, clock, caption, sfx). `FutureInput` is light enough for the inbox to build one without a full simulation. |
| Drawings | `src/components/ComicArt.tsx` | One recurring character (`Kid`) with swappable eyes/mouth per mood (tempted, zombie, smug, focused, proud) and props (fedora, halo, wings, shades, headphones, raised arms). Eight scenes. Caption box, clock pill, SFX text, halftone dots, thick borders. Panel space is 400×500. |
| Share poster | `ComicPoster` in `ComicArt.tsx` | Pure SVG, system fonts only, rendered off-screen, serialised with `XMLSerializer`, drawn to a 1080×1920 canvas, exported as PNG, shared with `navigator.share({ files })` or downloaded. |
| Overlay | `src/components/FuturePeek.tsx` | Portal dialog with stages `doors → comic → end`; body scroll lock; reduced-motion path. |

Why everything is drawn in code: images from the web are copyrighted and can't ship in the app; SVG layers are tiny, theme-able, animate well and rasterise cleanly for sharing.

## Texts from future you ✅
Every decision queues a short chat from **you, N minutes from now**, timed to when the twin predicts the ping would have wrapped up.

- **Opened it (Door A):** “bro. it's 11:18 pm.” / “we opened insta ‘to see who liked it’” / “it was 3 likes and 40 reels 💀” / “studying is exactly where we left it” / “next ping? don't. trust me 🙏”
- **Held it (Door B):** “yo it's 1:00 pm, dbms block done 😌” / “the likes are still there btw” / “read them in 10 sec. felt nothing. growth” / “main character behaviour fr ✨”
- Category-specific middle lines for likes, video suggestions, DMs, news and promos, with a generic fallback.

How it works (`src/lib/futureTexts.ts`, `src/components/FutureTexts.tsx`):
- `queueFutureText(uid, { side, category, app, minutes, task })` is called after each decision in the Multiverse and the inbox. Delivery time = now + the twin's expected cost (open) or the held cost (hold), at least 1 minute.
- Stored in `localStorage['parallel.futureTexts.<uid>']` (last 30).
- **Today** shows a chat thread: pending texts show a typing indicator, “arrives 11:18 PM” and a **skip ahead** button; delivered ones appear bubble by bubble with a tick each.
- While the app is open anywhere, a toast announces new arrivals (`useFutureTextPings` in `AppShell`).
- **Native app:** the same text is scheduled as a real local notification (`@capacitor/local-notifications`) titled “You (11:18 pm)”. 🟡 Not yet tested on a device.

## Backlog
Ideas from the ideation session, roughly in order of value for effort.

| Idea | What it is | Builds on |
|---|---|---|
| **Aura points** | Holding a ping is “+500 aura”; a doomscroll is “−1000 aura, it's giving NPC”. A weekly aura total replaces plain XP in the UI. | XP in `gamify.py` |
| **Plot-twist panel** | When the reality check disagrees with the prediction, the comic gets a fifth panel: “…plot twist”, the twin admits it was wrong. | `/api/outcomes` verdict + `ComicArt` |
| **Peephole tease** | Long-press a door to see one panel through the keyhole before committing. | `FuturePeek` doors |
| **Your week as a webtoon** | Every Sunday, your 6 biggest moments become “Episode 42”, exported 9:16 for Stories. | `ComicPoster`, decisions history |
| **Door skins that level up** | Wooden door → neon → spaceship hatch → portal, unlocked along the app's existing desk-to-space progression. | `Door` component |
| **NPC mode vs main character mode** | The Today header changes from a grey crowd shot to a spotlight based on your focus. | Today overview |
| **Co-op comic** | In a co-focus room, both friends appear in the same panel; if one opens Instagram, their character wanders off-frame. | Lab co-focus rooms |
| **Lock-screen widget episode** | “Today's episode: *The Assignment Strikes Back* · 2 doors held”. | Native widget |
| **Optional sounds** | Door creak, a choir for Door B, a sad trombone for Door A. Off by default. | `feel.ts` |
| **Fate meter** | A live gauge of how today's choices are trending: Scrollfather ↔ Main Character. | decisions of the day |

## Art direction and references
Style: simple characters, thick black outlines, flat saturated fills, one big punchline panel, sound-effect lettering, clocks that jump. Comedy, never shame.

Reference material used for direction only (do **not** copy images into the app):
- Tate: [“a door to your future self”](https://tate.org.uk/schools/resources/10-minute-challenges-a-door-to-your-future-self), the door as a metaphor for futures.
- Duolingo's [2020 year in review](https://blog.duolingo.com/duolingo-2020-year-in-review/) and [UX Collective on Duolingo Wrapped](https://uxdesign.cc/duolingo-wrapped-your-year-in-languages-streaks-and-progress-43f7f95c3eac): one shareable, image-like card with meme captions.
- [Gen Z social app style (superdesign)](https://superdesign.dev/library/gen-z-social-app): saturation, thick borders, rotated stickers.
- [Dribbble: umut-sevinc](https://dribbble.com/umut-sevinc?page=2) (a door-themed mobile app) and a [door-open micro-interaction on 21st.dev](https://21st.dev/@avijit07x/components/lu-door-open.md).
- [Finch, the self-care pet app (Paste)](https://www.pastemagazine.com/article/finch-app-mental-health-virtual-pet-self-care): a character that grows as you care for yourself.
- [Red Pen Black Pen: writing-process comic](https://redpenblackpen.substack.com/p/writing-process): the procrastination-strip rhythm.
