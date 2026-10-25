# The logic and the formulas behind Parallel

Every number Parallel shows comes from one of the formulas below. They are transcribed from the code (file and function named in each section), so this document is the reference for reviewers, judges and anyone changing the maths.

Notation: `h` hour of day (0–24, fractional), `d` task depth (0.3 light, 0.6 medium, 1.0 deep), `m` minutes into the current focus block, `f` fatigue (0–1), `c` notification category, `I_c` importance of category `c` (0 noise … 1 urgent), `σ(z) = 1/(1+e^(−z))` the logistic function, `LN(μ, s)` a log-normal with log-mean `μ` and log-sd `s`.

---

## 0. The whole idea in one equation
For a notification `c` arriving in context `x = (h, d, m, f)`:

```
Cost_allow(x)  = Away(x) + Resume(x)               a random variable, simulated 2,000 times
Cost_hold(c)   = E[cost of randomized holdouts of c] + urgency penalty
Saved(x)       = E[Cost_allow(x)] − Cost_hold(c)
Decision       = rules(Importance, schedule block, deadline, Saved, Confidence)
```
Everything else (the comics, the doors, the texts from future you) is a presentation of `Cost_allow`, its range, and `Saved`.

---

## 1. The causal chain of one notification
```
ping ──p_open──▶ opened ──p_rabbit──▶ rabbit hole (long, log-normal away time)
  │                 └──(1−p_rabbit)──▶ quick check (short away time)
  └──(1−p_open)──▶ glanced, not opened (small "attention residue" cost)
after any open: Resume time to get back into the task, growing with away time and task depth
```
This chain is the same in the ground-truth generator, the personal twin and the population models; only how each piece is estimated differs.

---

## 2. The personal twin (`backend/app/twin.py`, class `Twin`)

### 2.1 Features (`featurize`)
```
x = [ sin(2πh/24), cos(2πh/24), d, min(m,120)/60, f, I_c, onehot(c) (10 categories) ]
```
Hour is encoded on a circle so 23:00 and 01:00 are close.

### 2.2 Will you open it? (`_fit`, `open_model`)
Logistic regression with L2 regularisation (C = 0.8), trained on notifications that were **allowed** in your history:
```
p_open(x) = σ(w·x + b)
```

### 2.3 Will it become a rabbit hole? (`rabbit_model`)
Logistic regression (C = 0.8) trained on notifications you **opened**:
```
p_rabbit(x) = P(rabbit hole | opened, x) = σ(v·x + a)
P(rabbit hole) shown in the UI = p_open · p_rabbit
```

### 2.4 How long are you gone? (dwell, empirical-Bayes shrinkage)
Rabbit-hole away time is log-normal per category. With few personal observations it is pulled towards the category prior `r_c` (median rabbit minutes, e.g. 17 for social likes, 24 for video suggestions):
```
μ_c = (κ · ln r_c + Σ_i ln a_i) / (κ + n_c)        κ = PRIOR_STRENGTH = 8 pseudo-observations
s_c = std(ln a_i) if n_c > 3 else 0.5,  floor 0.25
quick check: μ_q = mean(ln a_i of non-rabbit opens), s_q = std (default ln 1.5 and 0.4)
```
`κ = 8` means your own data outweighs the prior after 8 rabbit holes in that category.

### 2.5 How long to get back into it? (`resume_model`)
Linear regression with an interaction term, plus its residual noise:
```
Resume = β0 + β1·Away + β2·d + β3·(Away·d) + ε,   ε ~ N(0, s_r²)
glance cost (not opened) g = mean resume time of allowed-but-unopened pings (default 0.6 min)
```
The interaction captures attention residue: a long escape hurts more when the task was deep.

### 2.6 Monte Carlo: 2,000 futures (`simulate`)
For each rollout `k = 1…2000` (seeded, so the same question gives the same answer):
```
O_k ~ Bernoulli(p_open)
R_k = O_k · Bernoulli(p_rabbit)
A_k = O_k · ( R_k · e^{N(μ_c, s_c)} + (1−R_k) · e^{N(μ_q, s_q)} )
ρ_k = O_k · max(0.5, β0 + β1A_k + β2d + β3A_k d + ε_k) + (1−O_k) · g
C_k = A_k + ρ_k                                     focus minutes lost if you allow it
```
Reported: `E[C]` (expected cost), `p10, p50, p90` of `C`, a 20-bin histogram over 0–60 min (the "raining futures"), median away and resume among opened futures, and `exp(μ_c)` as "minutes if hooked".

### 2.7 What holding costs (the counterfactual arm)
The history's logging policy held back **22%** of low-importance pings **at random** (§6). Those randomized holdouts give an unbiased estimate of the hold arm:
```
Cost_hold(c) = mean(cost of randomized holdouts of c)  [default 0.7 min]
             + 4 · I'_c   if I'_c > 0.5   (risk of delaying something that matters)
Saved = E[C_allow] − Cost_hold
```

### 2.8 Importance you taught it (`learned_importance` in `main.py`)
Beta-binomial update of each category's importance from “did this matter?” taps, with the prior worth 6 taps:
```
I'_c = (6 · I_c + yes_c) / (6 + n_c)
if you marked the delivering app as a "nag":  I'_c ← 0.6 · I'_c
```

### 2.9 The decision (`simulate`, then the API overrides)
Evaluated in this order; the first rule that fires wins:
```
1. I'_c ≥ 0.75                                   → ALLOW   ("genuinely important")
2. inside a class/work/lab/exam/meeting/study block and I'_c < 0.5
                                                 → HOLD    ("You're in Lectures until 1:00 PM…")
3. Saved > τ,  τ = 1.5 if a deadline is ≤ 3 days away else 3.0
                                                 → HOLD
4. Saved > 1                                     → DIGEST
5. otherwise                                     → ALLOW   ("low risk right now")
Abstain: if Confidence < 0.5 and the result isn't ALLOW and you're not in a block → ASK
User rules (applied last, always win): VIP or "always" → ALLOW · "digest" → DIGEST · "never" → HOLD
```

### 2.10 Confidence and abstention
`n_sim` = past pings of the same category within ±3 h and ±0.35 depth:
```
Confidence = min(0.95, 0.35 + 0.6 · (1 − e^{−n_sim / 25}))
```
Starts at 35%, reaches ~73% at 25 similar events, caps at 95%. Below 50% the twin asks instead of deciding.

### 2.11 “Why” factors (attribution)
Each feature's push on the log-odds of opening, versus an average moment `x̄` (12:00, d = 0.6, m = 30, f = 0.35):
```
effect_j = w_j · (x_j − x̄_j)          sin and cos are summed into one "time of day" factor
```
Positive = more likely to open. The top four are shown.

### 2.12 Blending with the population model (`/api/simulate` in `main.py`)
```
w_personal = n_sim / (n_sim + 20)
p_open_blend = w · p_open_personal + (1 − w) · p_open_population
cost_p50_blend = w · cost_p50_personal + (1 − w) · cost_p50_population
```
With no similar personal events the population model decides; after 20 it's 50/50; after 80, 80% personal.

### 2.13 The moment right now (`context_now`)
```
fatigue (no events today) = min(0.9, max(0.1, 0.045·(h − 8) + 0.15·[h > fatigue_onset]))
fresh energy check-in E ∈ {1..5} (last 3 h):  f ← 0.4·f + 0.6·(1 − (E − 1)/4)
depth = 1.0 if F(h) > 0.65,  0.6 if F(h) > 0.4,  else 0.3;  forced to 1.0 inside a class/work block
```
The check-in gets 60% of the weight because a direct report beats a behavioural guess.

---

## 3. Your day (`backend/app/personas.py`, `routine.py`)

### 3.1 Focus curve
Each persona has peaks `(centre c_k, width w_k, amplitude a_k)`, e.g. student `(10:00, 1.6, 1.0)` and `(21:30, 1.4, 0.75)`:
```
F(h) = clip( 0.25 + Σ_k a_k · exp(−(h − c_k)² / (2 w_k²)) − 0.18 · exp(−(h − 14)² / (2·0.8²)), 0.05, 1 )
F(h) ← 0.4 · F(h)  before 08:00
```
The negative term is the post-lunch dip.

### 3.2 Shifted to your declared routine
```
shift = chronotype (morning −1.5 h, neutral 0, evening +1.5 h) + 0.6 · (wake − 7.5)
F_you(h) = F((h − shift) mod 24) · (1 if awake else 0.25)
```

### 3.3 Deadline pressure and check moments
- The closest deadline within 14 days counts; ≤ 3 days left lowers the hold threshold from 3.0 to 1.5 min.
- Check moments = ends of today's declared blocks + the end of your golden hours + one hour before bed (or the next top of the hour), deduplicated, first four.
- A checkpoint after a decision = now + 25 min, rounded up to the next 5 minutes.

---

## 4. Insights built on top of the twin (`twin.py`)

| Insight | Formula |
|---|---|
| **Fingerprint heatmap** | for weekday × hour: Σ(quality · duration) / Σ duration over focus, recovering, distraction and meeting segments |
| **Golden hours** | start hour `h ∈ [6, 21]` maximising the mean hourly quality of `h…h+2`; shown as a 2.5 h window |
| **Fatigue onset** | first hour ≥ 08:00 where mean fatigue at notification time > 0.5 (default 17:00) |
| **Traits** | Deep focus = min(1, 1.25·mean focus quality); Interruptibility = open rate; Rabbit-hole risk = rabbit rate among opens; Recovery speed = max(0, 1 − mean resume/15); Sustained attention = min(1, median session/45 min); Fatigue resilience = 1 − mean fatigue |
| **App fragmentation** | `(focus breaks per day) × (mean cost per break) / 10`, capped at 10 |
| **Per-category uplift** | `mean cost if allowed − mean cost if held` (randomized holdouts) |
| **Recommendations** | batch a category if `per_day × uplift × open_rate ≥ 3 min/day`; evidence confidence `min(0.95, 0.4 + n_holdouts/50)`; all recommendations ranked by `impact × confidence` |
| **Forecast** | for each of the next 12 hours: risk = `p_open · p_rabbit` for a social like, with fatigue rising 0.035 per hour |
| **Day archetypes** | k-means (k = 3) on standardised daily [focus min, distraction min, quality, switches, fatigue]; named by focus/distraction ratio: Flow day, Patchy day, Doom-scroll day |

---

## 5. Checking itself

| Check | Formula |
|---|---|
| **Backtest** | refit without the last 3 days, predict them |
| **Brier score** | `B = mean((p − y)²)`; improvement over the generic prior = `1 − B_twin / B_generic` |
| **Generic cost baseline** | `p_open_c · (p_rabbit_c · r_c + 4)` |
| **Calibration** | bins of width 0.2: mean predicted vs observed open rate |
| **Interval coverage** | share of real costs inside `[p10, p90]` (target ≈ 80%) |
| **Micro-randomized trial** | per category, ATE = `mean(cost | allowed) − mean(cost | held)`, 95% CI from 400 bootstrap resamples; significant if the lower bound > 0 |
| **Drift (PSI)** | 6 quantile bins of the old window; `PSI = Σ (p_new − p_old) · ln(p_new / p_old)`; < 0.1 stable, < 0.25 watch, otherwise retrain |
| **Data quality** | `1 − (overlaps + duplicates + negative durations) / events` |
| **Reality check** | you report actual minutes `C*`; verdict “Called it.” if `p10 ≤ C* ≤ p90`. Stored as a live training row: opened = `C* > 1`, rabbit hole = `C* > 10`, away = `0.7 · C*`, resume = `C* − away`; the twin refits with it |

---

## 6. The data the twin learns from

### 6.1 The ground-truth generator (`backend/app/synth.py`)
Synthetic but behaviourally grounded; **the twin never sees these equations, it has to learn them.** `s` is the persona's susceptibility (student 0.35, creator 0.30, developer 0.15, professional 0.10), `q_c ~ N(0, 1)` and `q'_c ~ N(0, 0.8)` are personal quirks per category (so two students differ).
```
arrivals: Poisson, rate Σ_c λ_c · (0.7 + 0.6 · (1 − F(h))) per hour      (more pings when focus is low)
fatigue:  +0.0016 per minute, ×2.2 after the persona's fatigue onset; breaks recover it

logit P(open)   = logit(base_open_c) + q_c + 2.4 f − 1.6 d + 1.5 s − 0.3 + 0.5·[m > 50]
logit P(rabbit) = logit(base_rabbit_c) + q'_c + 2.2 f + 0.8 s − 0.9 d − 0.9 + 0.5·[h ≥ 21]
away (rabbit)   ~ LN(median = r_c · (0.8 + 0.6 f + s), σ = 0.45)
away (quick)    ~ LN(median = 1.6, σ = 0.4)
resume          = (1.5 + 0.22 · away) · (0.6 + d) + U(0, 2)
not opened      = glance 0.3 + 0.8 · d · U(0, 1)
held            = U(0.4, 1.0) handling + I_c · {0, 0, 2, 6} if I_c > 0.5
exploration     = 22% of pings with I_c < 0.5 are held at random
```
Fatigue makes you open more and spiral longer; deep work protects you but makes recovery slower; long blocks invite escape; late nights deepen rabbit holes. Those are the effects the models have to recover.

### 6.2 The population models (`backend/ml/train.py`)
Trained on 60 synthetic users × 30 days (81,582 events), evaluated on **users never seen in training** (GroupShuffleSplit by user):
```
p_open, p_rabbit   HistGradientBoosting classifiers + isotonic calibration (3-fold)
cost p10/p50/p90   HistGradientBoosting with pinball (quantile) loss:
                   L_q(y, ŷ) = max(q·(y − ŷ), (q − 1)·(y − ŷ))
counterfactual     T-learner on low-importance pings:
                   τ(x) = μ_allow(x) − μ_hold(x), validated against the randomized difference in means
policy value       hold when τ(x) > 3 min; minutes saved per user-day = Σ τ over held / (users × days)
metrics            AUC, Brier, log-loss vs a per-category prior and a logistic regression;
                   permutation importance for what drives opening
```
Features add weekday, focus capacity, recent switches, pings in the last hour, VIP flag, sender type, environment and device.

---

## 7. Gamification and the extras (`gamify.py`, `routine_api.py`, `platform_api.py`)

| Feature | Formula |
|---|---|
| **XP per decision** | +5 intentional decision; +15 if you report what really happened; +10 for a hold that saves > 2 min while today's hold XP < 60; +0 for holding something with importance ≥ 0.75; ÷3 if the same decision was repeated ≥ 3 times quickly |
| **Streak** | consecutive days with an intentional decision; one missed day per 7 is frozen, not a reset |
| **World** | places unlock at 0, 100, 250, 450, 700, 1000 XP |
| **Universe names** | Door A: E[cost] ≥ 20 The Scrollfather, ≥ 8 Chaos Goblin, ≥ 3 Quick Peeker, else Unbothered. Door B: Focus Legend if E[cost] − hold > 5, else Main Character |
| **Knowledge meter** | routine 15 + schedule 15 + deadlines 5 + app roles 5 + min(15, 5 × check-ins) + min(15, 3 × matter taps) + min(10, 4 × reality checks) + min(20, live segments / 5), capped at 100 |
| **Time machine** | habit adoption `a(t) = min(1, 0.35 + t / (0.8 D))`; daily gain `G = Σ_top3 impact × confidence / 60` h; cumulative focus A_t += base + ε, B_t += base + ε + 0.6 · G · a(t), ε ~ N(0, 0.35) |
| **Doppelgänger** | your vector [open rate, rabbit rate, mean cost/30, mean fatigue, peak hour/24]; nearest dataset user by weighted Euclidean distance, weights (1, 1, 1, 0.7, 0.8); similarity = 100 · e^(−2.2 · distance) |
| **Attention budget** | spent = today's allowed costs; projected end of day = spent / clip((h − 8)/15, 0.05, 1) |
| **Attention debt** | per day, Σ away and Σ recovery minutes of opened pings over the last 7 days (labelled as an estimate, not compounding debt) |

---

## 7b. Shields, aura and fate (`main.py`, `routine.py`, `tactics.py`)

| Feature | Formula / rule |
|---|---|
| **Rule order** | VIP or “always” → allow · “digest” → digest · “never” → hold · re-engagement shield · late-night guard · otherwise the twin's decision |
| **Re-engagement shield** | X-ray finds the re-engagement tactic and importance < 0.75 → digest |
| **Late-night guard** | active when `hour ≥ bed − 0.5` or `hour < wake` (wrapping past midnight) and `night_guard` is on; importance < 0.75 and the twin wasn't already holding → hold |
| **X-ray** | regular-expression patterns per tactic on the wording (in memory only); video suggestions always count as algorithm bait |
| **Aura per decision** | hold/digest: `clip(25 · minutes saved, 50, 500)`; allow with predicted cost < 5: +50; otherwise 0; reality check reported: +100; allowed and actual ≥ 20 min: −1000 |
| **Aura tiers (week)** | < 0 NPC era · 0–999 Side quest · 1000–2999 Main character loading · ≥ 3000 Main character |
| **Fate (today)** | mean over today's decisions of: hold/digest +1; allow cost < 5 +0.5; allow cost ≥ 15 −1; else 0; minus 1 more for a confirmed doomscroll; clipped to [−1, 1]. ≤ −0.33 Scrollfather arc, ≥ 0.33 Main Character arc |

## 8. The phone layer (frontend)

| Feature | Logic |
|---|---|
| **Guess game** (`GuessGame.tsx`) | inside `[p10, p90]` → “Ate.”; below `p10` → “Delulu alert”; above `p90` → “Dramatic much?” |
| **Raining futures** (`FuturesRain.tsx`) | 600 dots, bin `i` gets `round(bins_i / Σbins · 600)`; each dot ≈ 3.3 of the 2,000 futures |
| **Dominoes** (`Dominoes.tsx`) | height of domino `i` ∝ minutes it adds: `t_i − t_{i−1}` |
| **Door to the Future clocks** (`future.ts`) | Door A: arrival, +2 min, + E[cost], + p90 (worst likely case). Door B: arrival, +25, +50, +50 + hold cost |
| **Texts from future you** (`futureTexts.ts`) | delivered at now + E[cost] (opened) or now + max(1, hold cost) (held) |
| **Receipt** (`Receipt.tsx`) | focus protected = Σ saved over pings not opened; XP = Σ XP |
| **Swipe commit** (`SwipeDeck.tsx`) | commits when the projected offset `x + 0.15 · velocity` passes 110 px in a direction |
| **Fork drag** (`ForkDrag.tsx`) | commits at 72% of the half-track; live counters interpolate 0 → cost |
| **Shake** (`feel.ts`) | Σ|Δaccel| > 28 three times within 700 ms, 2 s cooldown |

---

## 9. Why these choices
- **Monte Carlo instead of a single number:** attention outcomes are long-tailed (most checks are short, a few become 40-minute holes). A mean alone hides that; p10–p90 shows it.
- **Randomized holdouts for the counterfactual:** comparing people who held vs allowed by choice is confounded (you hold when you're already focused). Random holds remove that bias; the T-learner is only trusted where it agrees with them.
- **Shrinkage everywhere:** day-one users have no history, so every personal estimate starts at a prior and moves to *you* at a stated rate (`κ = 8`, `6` taps, `n/(n+20)`).
- **Abstention:** a twin that always answers will be confidently wrong on rare moments; below 50% confidence it asks.
- **Rules beat the model:** VIPs, “always”, and anything ≥ 0.75 importance pass, whatever the predicted cost.
