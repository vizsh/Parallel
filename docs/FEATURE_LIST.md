# Every feature in Parallel, and how it works

One line per feature: what you see, and what happens underneath. Formulas are in [LOGIC_AND_FORMULAS.md](LOGIC_AND_FORMULAS.md); the psychology behind the design is in [PSYCHOLOGY.md](PSYCHOLOGY.md).

Status: ✅ built and tested in a browser · 🟡 built, needs a real phone to verify · 🗺️ specified, not built

---

## 1. The twin (the brain)
| Feature | How it works | Status |
|---|---|---|
| **Open prediction** | Logistic regression on your own allowed pings: time of day, task depth, minutes into the block, fatigue, importance, category → chance you open it | ✅ |
| **Rabbit-hole prediction** | Second logistic model on pings you opened → chance a quick check becomes a long escape | ✅ |
| **Time away + time to recover** | Log-normal away time per category (shrunk to a prior until you have data) + a resume model where long escapes hurt more during deep work | ✅ |
| **2,000 futures** | Monte Carlo over the chain above → expected cost, p10/p50/p90 range, histogram | ✅ |
| **Counterfactual (cost if held)** | From randomized holdouts (22% of low-importance pings held at random) so the comparison isn't biased by when you choose to hold | ✅ |
| **Decision** | Important (≥ 0.75) → allow · in a class/work block → hold · saves > 3 min (1.5 if exam ≤ 3 days) → hold · saves > 1 → digest · else allow · not enough evidence → ask you | ✅ |
| **Confidence + abstention** | Grows with similar past moments (35% → 95%); below 50% the twin asks instead of deciding | ✅ |
| **Why factors** | Each feature's push on the odds of opening vs an average moment | ✅ |
| **Population model blend** | Gradient-boosted models trained on 60 synthetic users; your own model's weight = n/(n+20) | ✅ |
| **Learns from you** | “Did this matter?” taps update importance; energy check-ins override the fatigue guess; reality checks become training rows | ✅ |
| **Routine-aware** | Your wake/bed time, chronotype, weekly blocks and deadlines shift the focus curve and decisions | ✅ |

## 2. Shields (new in v0.4)
| Feature | How it works | Status |
|---|---|---|
| **Manipulation X-ray** | The ping's wording is scanned in memory (never stored) for 7 tactics: social proof, vague teaser, fake urgency, re-engagement bait, streak pressure, algorithm bait, FOMO hook. Shown as tappable chips with a one-line explanation | ✅ |
| **Teaser unmasking** | For vague pings, says what that kind usually turns out to be (“usually 1–3 likes, no messages”) | ✅ |
| **Re-engagement shield** | “We miss you / see what you missed” pings go straight to the digest (unless VIP) | ✅ |
| **Late-night guard** | From 30 min before your bedtime until you wake, only VIPs and urgent pings pass; the rest wait for a morning digest. Toggle in Settings | ✅ |
| **Your rules win** | VIP / always / digest / mute per category, applied before every shield | ✅ |

## 3. Phone-first interactions
| Feature | How it works | Status |
|---|---|---|
| **Swipe triage deck** | Right allow · left hold · up digest · down noise (also tells the twin it didn't matter). Distinct haptic per direction; buttons and arrow keys too | ✅ |
| **Held-pings jar** | Physics jar; each hold drops a ball; tap or shake to pour them out as one batch | ✅ / 🟡 shake |
| **Drag to fork** | Drag a token into Universe A or B with live minute counters | ✅ |
| **Energy battery** | Drag a battery to check in; one tick per level | ✅ |
| **Guess before reveal** | Bet a ping's cost first; “Ate.” / “Delulu alert” / “Dramatic much?” | ✅ |
| **Raining futures** | The 2,000 futures fall as dots into the cost histogram | ✅ |
| **Dominoes** | Universe A's chain as dominoes sized by minutes added | ✅ |
| **Holo badge cards** | Each decision earns that universe's archetype card; foil follows finger or gyroscope; 12-card binder | ✅ / 🟡 gyro |
| **Inbox receipt** | Clearing the inbox prints a shareable till receipt | ✅ |
| **Haptic language** | One `feel()` with patterns for tick, allow, hold, digest, noise, pour, success, warning; off switch in Settings | 🟡 |

## 4. Door to the Future
| Feature | How it works | Status |
|---|---|---|
| **Two doors** | Door A (if you tap) and Door B (if you hold); tap or swipe up to open | ✅ |
| **Peephole (new)** | Press and hold a door to see its ending through the keyhole without opening it | ✅ |
| **Four-panel comics** | Drawn in SVG from your numbers: clocks use arrival + expected cost and the worst likely case; captions per ping type | ✅ |
| **Endings** | The Scrollfather (tap) or Main Character (hold), stamped with the honest small print | ✅ |
| **Share poster** | 1080×1920 PNG of all four panels, via the share sheet or download | ✅ / 🟡 native share |
| **Choose this future** | Records the decision straight from the ending | ✅ |
| **Plot-twist panel (new)** | When your reality check falls outside the twin's range, a fifth panel appears: the little robot twin admits it was wrong | ✅ |

## 5. Motivation without guilt
| Feature | How it works | Status |
|---|---|---|
| **Aura points (new)** | Holds +25 per minute protected (50–500), cheap on-purpose opens +50, reality checks +100, a confirmed doomscroll (≥ 20 min) −1000. Weekly tiers: NPC era · Side quest · Main character loading · Main character | ✅ |
| **Fate meter (new)** | Today's decisions averaged from −1 (Scrollfather arc) to +1 (Main Character arc), shown as a needle on Today | ✅ |
| **Texts from future you** | Each decision queues a chat from “you, N minutes from now”, timed to the predicted cost; local notification in the native app | ✅ / 🟡 native |
| **XP, levels, world, streaks** | XP for intentional choices with anti-farming rules; streaks forgive one day a week; the world grows from desk to orbit | ✅ |

## 6. The coach (rebuilt in v0.4)
| Feature | How it works | Status |
|---|---|---|
| **25 question types** | Ping advice, compare two apps, why, what now, plan my evening, exams, best time, distractions, doomscrolling help, time lost this week, fatigue, sleep, stress (gentle, non-medical), aura, what's held, privacy, how it works/accuracy, rules, recommendations, greetings, thanks, off-topic | ✅ |
| **Memory** | The last 8 messages are kept, so “why?” and “and YouTube?” refer to what you were just talking about | ✅ |
| **Grounded facts sheet** | Every answer is built from a facts sheet computed by your models (focus now, golden hours, check moments, deadline, top distractions, last 7 days, aura, held count) | ✅ |
| **Follow-up chips** | Each reply suggests the two or three most useful next questions | ✅ |
| **Optional Claude** | With `ANTHROPIC_API_KEY` set on the server, Claude (Opus 5.5, low effort, refusal fallback enabled) writes the reply from the same facts sheet, in any of the 4 languages; otherwise the built-in engine answers. Each reply is labelled | ✅ code / needs a key to run |
| **Voice + 4 languages** | Speech in and out via the browser; English, हिन्दी, मराठी, Español (the newer question types answer in English without Claude) | ✅ |

## 7. Simulations (new in v0.4)
| Scenario | What it shows | Status |
|---|---|---|
| **Study session: the Instagram like** | Cost on top of the notification, both doors, the jar, the 1 PM batch, a text from future you | ✅ + video |
| **Developer in flow** | Three pings, three calls: algorithm bait held, Mom (VIP) passes, PR review to the 12:30 digest | ✅ + video |
| **1 AM doomscroll** | Late-night guard, Door A's worst case, future you, wind down, morning digest | ✅ + video |
| **Exam week group-chat storm** | Strict mode, 14 messages collapsed to one thread, auto-reply draft, 7 PM summary | ✅ + video |
| **The “we miss you” trap** | Manipulation X-ray, teaser unmasking, re-engagement shield, aura | ✅ + video |

Open them at **/app/simulations** (signed in) or **/demo** (public). Each has a scrubber, play/pause and an MP4 download (`frontend/public/simulations/<id>.mp4`). `/demo?scenario=<id>&clean=1` is the recording mode.

## 8. Insight pages
| Page | What it does | Status |
|---|---|---|
| **Today** | Echo the companion, focus capacity, fatigue, golden hours, energy battery, “did this matter?”, knowledge meter, jar, aura & fate, texts from future you, budget, focus reservation, checkpoint, quests | ✅ |
| **Multiverse** | What-if sliders, guess, comic universes, doors, raining futures, dominoes, X-ray, fork, cards, reality check, plot twist | ✅ |
| **Smart inbox** | Swipe deck or list, X-ray chips, shields, Peek, jar, auto-reply drafts, receipt | ✅ |
| **Fingerprint · Replay · Twin brain** | Heatmap and 3D ring; day timeline; knowledge graph | ✅ |
| **Accuracy · Data & models** | Calibration, Brier vs generic rule, drift (PSI), randomized experiments, model registry, dataset preview, audit log | ✅ |
| **Lab** | Attention budget and debt, co-focus rooms, habit experiments, developer API + SDK, team health (k ≥ 5) | ✅ |
| **Time machine · Doppelgänger** | 30 simulated days with vs without the twin; closest behavioural match and what worked for them | ✅ |
| **Settings** | Routine editor, rules, shields & feel (late-night guard, re-engagement shield, haptics, guess gate), budget, learning & retention, export, import, delete | ✅ |

## 9. Platform and privacy
| Feature | How it works | Status |
|---|---|---|
| **Metadata only** | Message text and window titles are never stored; the X-ray reads wording in memory only | ✅ |
| **Export / delete / pause** | One-tap JSON export, portable profile, full delete, pause learning, retention window | ✅ |
| **Audit log** | Every prediction is hash-chained and verifiable | ✅ |
| **Attention API + SDK** | `/v1/interrupt` tells other apps whether to interrupt now, defer or digest | ✅ |
| **PWA + Capacitor** | Installable web app; Android and iOS projects in the repo | ✅ / 🟡 APK needs the Android SDK |
| **Real notifications (Android listener)** | Read, hold and re-post real notifications with a Peek / Hold / Open companion notification | 🗺️ [REAL_NOTIFICATIONS.md](REAL_NOTIFICATIONS.md) |
