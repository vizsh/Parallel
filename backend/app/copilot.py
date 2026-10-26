"""Coach copilot: turns coach answers into cards and actions, and lets the coach act for you.

- cards:    ping price, receipts (day / week / app), compare, plan, jar, fingerprint, aura, evidence, X-ray, memory, draft
- actions:  hold everything for a while, start a focus block, mute an app until tonight or the exam, a night off from the
            guard, pour the jar, draft a reply, remember a fact, keep a commitment, start or keep an experiment, undo
- commands: slash commands and plain-language requests ("hold everything except Mom for 2 hours") run immediately and
            return an Undo
- nudges:   at most three useful proactive messages a day, never the same kind twice in two hours, mutable per kind
- memory:   facts and commitments you tell the coach, shown back as an editable list

Every number comes from the twin or the database; nothing here invents a statistic.
"""

from __future__ import annotations

import json
import re
import time
from collections import defaultdict
from contextlib import closing
from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from . import overrides, routine
from .assistant import CATEGORY_WORDS, PATTERN, detect_all
from .main import (CATEGORIES, SAMPLE_TEXT, apply_rules, aura_points, current_user, db, load_profile, stats_for, twin_of,
                   vip_of)
from .personas import app_for
from .tactics import unmask, xray
from .twin import fmt_h

router = APIRouter(prefix="/api")

SLASH = {
    "/receipt": "Today's attention receipt (add an app: /receipt instagram)",
    "/week": "Your week, Wrapped-style",
    "/plan": "Plan the rest of your day",
    "/hold": "Hold everything except VIPs (/hold 2h, /hold 45m)",
    "/focus": "Start a focus block (/focus 50)",
    "/jar": "What's waiting in your jar",
    "/why": "Why the twin decided what it did",
    "/xray": "Paste a notification to see its tricks (/xray You have 9 new…)",
    "/aura": "Aura and today's fate meter",
    "/me": "What the coach knows about you",
    "/help": "Everything the coach can do",
}


def _now_h() -> float:
    n = datetime.now()
    return n.hour + n.minute / 60


def _clock(ts: float) -> str:
    d = datetime.fromtimestamp(ts)
    return fmt_h(d.hour + d.minute / 60)


def _at_hour(h: float, base: date | None = None) -> float:
    """Timestamp for hour-of-day `h` today (h ≥ 24 rolls into tomorrow)."""
    base = base or date.today()
    day = datetime.combine(base, datetime.min.time())
    return (day + timedelta(hours=h)).timestamp()


# ================================================================ cards
def card_ping(u, t, cat: str, text: str | None = None) -> dict:
    ctx = t.context_now()
    r = t.simulate(cat, ctx["hour"], ctx["depth"], 35, ctx["fatigue"], ctx["task"], 600)
    text = text or SAMPLE_TEXT[cat]
    rec, why, guard = apply_rules(u, t, cat, ctx["hour"], text, r["recommendation"], r["why"])
    a = r["allow"]
    return dict(type="ping", category=cat, app=r["app"], label=r["label"], text=text, cost=a["cost_expected"], p10=a["cost_p10"],
                p50=a["cost_p50"], p90=a["cost_p90"], p_rabbit=a["p_rabbit_hole"], hold_cost=r["delay"]["cost_expected"],
                saved=r["saved_minutes"], rec=rec, why=why, guard=guard, confidence=r["confidence"], xray=xray(text, cat),
                usually=unmask(cat), hour=ctx["hour"], task=ctx["task"])


def ping_actions(card: dict) -> list[dict]:
    pay = dict(category=card["category"], cost=card["cost"], saved=card["saved"], text=card["text"])
    return [dict(label="Peek", kind="peek", payload=card),
            dict(label="Hold it", kind="decide", payload={**pay, "choice": "delay"}),
            dict(label="Open on purpose", kind="decide", payload={**pay, "choice": "allow"})]


def _decisions(uid: int, since: float) -> list[dict]:
    with closing(db()) as c:
        return [dict(r) for r in c.execute("SELECT * FROM decisions WHERE user_id=? AND ts>=? ORDER BY ts DESC", (uid, since))]


def card_receipt(u, t, period: str = "day", app: str | None = None) -> dict:
    """A till receipt built from your history: what pings cost you, what you protected, and the priciest one."""
    today = date.today()
    if period == "week" or app:
        days = [(today - timedelta(days=i)).isoformat() for i in range(0, 7)]
        title, since = ("This week" if not app else f"{app}, last 7 days"), datetime.combine(today - timedelta(days=6), datetime.min.time()).timestamp()
    else:
        d = today.isoformat()
        if sum(1 for n in t.notifs if n["day"] == d) < 5:  # early morning: yesterday is the useful receipt
            d = (today - timedelta(days=1)).isoformat()
        days, title = [d], "Today" if d == today.isoformat() else "Yesterday"
        since = datetime.combine(date.fromisoformat(d), datetime.min.time()).timestamp()
    ns = [n for n in t.notifs if n["day"] in days]
    if app:
        ns = [n for n in ns if n["app"] == app or n["followed_app"] == app]
    opened = [n for n in ns if n["opened"]]
    by_app = defaultdict(lambda: dict(opens=0, lost=0.0, held=0))
    name = lambda n: n["followed_app"] or n["app"] or CATEGORIES.get(n["category"], {}).get("label", "Other")  # noqa: E731
    for n in opened:
        by_app[name(n)]["opens"] += 1
        by_app[name(n)]["lost"] += n["cost_min"]
    for n in ns:
        if n["action"] == "delay":
            by_app[n["app"] or name(n)]["held"] += 1
    rows = sorted(({"app": k, **v, "lost": round(v["lost"], 1)} for k, v in by_app.items()), key=lambda r: -r["lost"])[:7]
    dec = _decisions(u["id"], since)
    if app:
        dec = [d for d in dec if app_for(d["category"], u["persona"]) == app]
    protected = round(sum(d["saved"] or 0 for d in dec if d["choice"] != "allow"), 1)
    aura = sum(aura_points(d)[0] for d in dec)
    worst = max(opened, key=lambda n: n["cost_min"], default=None)
    out = dict(type="receipt", period="app" if app else period, title=title, app=app, rows=rows,
               pings=len(ns), opened=len(opened), lost=round(sum(n["cost_min"] for n in opened), 1),
               held=sum(1 for n in ns if n["action"] == "delay") + sum(1 for d in dec if d["choice"] != "allow"),
               protected=protected, aura=aura,
               priciest=dict(app=name(worst), at=fmt_h(worst["hour"]), minutes=round(worst["cost_min"], 1),
                             task=worst["task"]) if worst else None)
    if period == "week" and not app:
        prev = {(today - timedelta(days=i)).isoformat() for i in range(7, 14)}
        prev_lost = sum(n["cost_min"] for n in t.notifs if n["day"] in prev and n["opened"])
        focus_by_day = defaultdict(float)
        longest = 0.0
        for s in t.segments:
            if s["day"] in days and s["kind"] == "focus":
                focus_by_day[s["day"]] += (s["end"] - s["start"]) * 60
                longest = max(longest, (s["end"] - s["start"]) * 60)
        best = max(focus_by_day.items(), key=lambda kv: kv[1], default=None)
        arch = t.archetypes()
        counts = sorted(((len([d for d in a["days"] if d in days]), a["name"]) for a in arch), reverse=True)
        out.update(prev_lost=round(prev_lost, 1), change=round(out["lost"] - prev_lost, 1),
                   best_day=dict(day=date.fromisoformat(best[0]).strftime("%A"), minutes=round(best[1])) if best else None,
                   longest_block=round(longest), archetype=counts[0][1] if counts and counts[0][0] else None)
    if app:
        rabbit = [n for n in opened if n["rabbit"]]
        out.update(rabbit_pct=round(100 * len(rabbit) / len(opened)) if opened else 0,
                   longest=round(max((n["away_min"] for n in opened), default=0), 1))
    return out


def card_compare(u, t, cats: list[str]) -> dict:
    items = []
    for k in cats[:2]:
        c = card_ping(u, t, k)
        items.append(dict(category=k, app=c["app"], label=c["label"], cost=c["cost"], p_rabbit=c["p_rabbit"], rec=c["rec"]))
    items.sort(key=lambda x: -x["cost"])
    return dict(type="compare", items=items, verdict=f"If you open one, open {items[-1]['app']}.")


def card_plan(t) -> dict:
    h = _now_h()
    p = routine.merge(t.profile)
    fp = t.fingerprint()
    b = fp["best_window"]
    items = []
    if b["end"] > h:
        items.append(dict(hour=max(b["start"], h), label=f"Golden hours until {fmt_h(b['end'])}: hardest task", kind="focus"))
    for m in routine.check_moments(t.profile, golden=(b["start"], b["end"])):
        items.append(dict(hour=m["hour"], label=f"Check pings · {m['reason']}", kind="check"))
    if fp["fatigue_onset"] > h:
        items.append(dict(hour=fp["fatigue_onset"], label="Energy dips: lighter tasks, short walk", kind="light"))
    wind = float(p["bed"]) - 0.5
    if wind > h:
        items.append(dict(hour=wind, label="Wind down: late-night guard starts", kind="wind"))
    items.sort(key=lambda x: x["hour"])
    for i in items:
        i["at"] = fmt_h(i["hour"])
    dl = routine.deadline_pressure(t.profile)
    return dict(type="plan", items=items[:6], deadline=dl, golden=dict(start=fmt_h(b["start"]), end=fmt_h(b["end"])))


def card_jar(u) -> dict:
    with closing(db()) as c:
        rows = [dict(r) for r in c.execute("SELECT category, app, text, release_at FROM deferred_queue WHERE user_id=? AND released IS NULL ORDER BY release_at", (u["id"],))]
    groups = defaultdict(list)
    for r in rows:
        groups[r["app"] or CATEGORIES[r["category"]]["label"]].append(r["text"])
    nxt = min((r["release_at"] for r in rows), default=None)
    return dict(type="jar", count=len(rows), groups=[dict(app=k, n=len(v), sample=v[0]) for k, v in groups.items()],
                next=_clock(nxt) if nxt else None)


def card_fingerprint(t) -> dict:
    fp = t.fingerprint()
    return dict(type="fingerprint", hourly=fp["hourly"], best=fp["best_window"], now=_now_h(), onset=fmt_h(fp["fatigue_onset"]))


def card_aura(stats: dict) -> dict:
    return dict(type="aura", aura=stats.get("aura"), fate=stats.get("fate"))


def late_nights(t, n_days: int = 5) -> tuple[int, list[str]]:
    """How many of the last n nights ended after bedtime, and when."""
    bed = float(routine.merge(t.profile)["bed"])
    today = date.today()
    late, ends = 0, []
    for i in range(1, n_days + 1):
        d = (today - timedelta(days=i)).isoformat()
        segs = [s for s in t.segments if s["day"] == d]
        if not segs:
            continue
        last = max(s["end"] for s in segs)
        ends.append(fmt_h(last))
        if last > bed + 0.25:
            late += 1
    return late, ends


def card_evidence(t) -> dict:
    """Why today feels hard: switches, fatigue, the app that cost most, late nights."""
    today = date.today().isoformat()
    segs = [s for s in t.segments if s["day"] == today]
    ns = [n for n in t.notifs if n["day"] == today and n["opened"]]
    lost = defaultdict(float)
    for n in ns:
        lost[n["followed_app"] or n["app"] or "other apps"] += n["cost_min"]
    top = max(lost.items(), key=lambda kv: kv[1], default=None)
    ctx = t.context_now()
    ln, _ = late_nights(t)
    facts = [
        dict(label="App switches today", value=sum(1 for s in segs if s["kind"] == "distraction")),
        dict(label="Fatigue now", value=f"{round(ctx['fatigue'] * 100)}%"),
        dict(label="Focus capacity now", value=f"{round(ctx['focus_capacity'] * 100)}%"),
        dict(label="Late nights (last 5)", value=ln),
    ]
    if top:
        facts.insert(1, dict(label=f"Lost to {top[0]} today", value=f"{round(top[1])} min"))
    return dict(type="evidence", facts=facts, top_app=top[0] if top else None)


def guess_category(text: str) -> str:
    cats = detect_all(text, CATEGORY_WORDS)
    return cats[0] if cats else "social_like"


def card_xray(text: str) -> dict:
    cat = guess_category(text)
    tags = xray(text, cat)
    return dict(type="xray", text=text.strip(), category=cat, label=CATEGORIES[cat]["label"], tags=tags, usually=unmask(cat),
                verdict=("Re-engagement bait: digest it." if any(x["tactic"] == "reengagement" for x in tags)
                         else "Built to pull you in. Safe to hold." if tags else "No obvious trick in the wording."))


def memories(uid: int) -> list[dict]:
    with closing(db()) as c:
        return [dict(r) for r in c.execute("SELECT * FROM coach_memory WHERE user_id=? AND done IS NULL ORDER BY ts DESC", (uid,))]


def card_memory(u, t) -> dict:
    p = routine.merge(t.profile)
    fp = t.fingerprint()
    dl = routine.deadline_pressure(t.profile)
    vip = sorted(vip_of(u))
    items = [
        dict(label="Kind of busy", value=(u["persona"] or "").title()),
        dict(label="Golden hours", value=f"{fmt_h(fp['best_window']['start'])}–{fmt_h(fp['best_window']['end'])}"),
        dict(label="Day", value=f"wake {fmt_h(float(p['wake']))} · bed {fmt_h(float(p['bed']))} · {p['chronotype']}"),
        dict(label="Always through", value=", ".join(CATEGORIES[v]["label"] for v in vip if v in CATEGORIES) or "nobody yet"),
        dict(label="Apps that nag you", value=", ".join(p.get("nags") or []) or "none marked"),
    ]
    if dl:
        items.append(dict(label="Next deadline", value=f"{dl['title']} in {dl['days_left']} day(s)"))
    told = [dict(id=m["id"], kind=m["kind"], text=m["text"]) for m in memories(u["id"])]
    return dict(type="memory", items=items, told=told)


# ================================================================ actions
class Act(BaseModel):
    kind: str
    payload: dict = {}


def _profile_update(uid: int, **fields):
    with closing(db()) as c:
        r = c.execute("SELECT data FROM user_profile WHERE user_id=?", (uid,)).fetchone()
        data = json.loads(r[0]) if r else dict(routine.DEFAULT)
        data.update(fields)
        c.execute("INSERT INTO user_profile(user_id,data,updated) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET data=excluded.data, updated=excluded.updated",
                  (uid, json.dumps(data), time.time()))
        c.commit()


def run_action(u, kind: str, payload: dict) -> dict:
    """Execute one coach action. Returns {ok, message, undo?, card?}."""
    uid = u["id"]
    now = time.time()
    if kind in ("hold_all", "start_block"):
        minutes = max(5, min(int(payload.get("minutes") or (50 if kind == "start_block" else 120)), 12 * 60))
        until = now + minutes * 60
        with closing(db()) as c:
            oid = overrides.add(c, uid, "hold_all", until, payload.get("label") or "Focus block")
            sid = None
            if kind == "start_block":
                c.execute("UPDATE focus_sessions SET ended=? WHERE user_id=? AND ended IS NULL", (now, uid))
                sid = c.execute("INSERT INTO focus_sessions(user_id,task,next_step,started) VALUES(?,?,?,?)",
                                (uid, payload.get("task") or "Focus block", payload.get("next_step") or "", now)).lastrowid
                c.commit()
        msg = f"Holding everything except VIPs until {_clock(until)}." + (" Focus block started." if kind == "start_block" else "")
        return dict(ok=True, message=msg, undo=dict(kind="override", id=oid, session=sid), until=_clock(until))
    if kind == "mute":
        cat = payload.get("category")
        if cat not in CATEGORIES:
            raise HTTPException(400, "Unknown category")
        until_kind = payload.get("until", "tonight")
        twin = twin_of(u)
        if until_kind == "exam" and (dl := routine.deadline_pressure(twin.profile)):
            until = _at_hour(24, date.fromisoformat(dl["due"]))
            when = f"after {dl['title']}"
        elif isinstance(until_kind, (int, float)):
            until, when = now + float(until_kind) * 60, f"until {_clock(now + float(until_kind) * 60)}"
        else:
            until, when = _at_hour(float(routine.merge(twin.profile)["bed"])), "until bedtime"
        app = app_for(cat, u["persona"])
        with closing(db()) as c:
            oid = overrides.add(c, uid, "mute", until, f"Mute {app}", cat)
        return dict(ok=True, message=f"{app} is muted {when}. Its pings wait in your jar.", undo=dict(kind="override", id=oid))
    if kind == "night_off":
        p = routine.merge(twin_of(u).profile)
        until = _at_hour(24 + float(p["wake"]))
        with closing(db()) as c:
            oid = overrides.add(c, uid, "night_off", until, "Night guard off tonight")
        return dict(ok=True, message="Late-night guard is off for tonight only. It's back on tomorrow.", undo=dict(kind="override", id=oid))
    if kind == "release_digest":
        with closing(db()) as c, c:
            n = c.execute("UPDATE deferred_queue SET released=? WHERE user_id=? AND released IS NULL", (now, uid)).rowcount
        return dict(ok=True, message=f"Poured the jar: {n} ping{'s' if n != 1 else ''} delivered in one batch." if n else "The jar was already empty.")
    if kind == "draft_reply":
        from .routine_api import autoreply
        r = autoreply(payload.get("category", "social_dm"), payload.get("lang", "en"), u)
        return dict(ok=True, message="Here's a draft. Parallel never sends it for you.", card=dict(type="draft", **r))
    if kind == "remember":
        text = (payload.get("text") or "").strip()[:200]
        if not text:
            raise HTTPException(400, "Nothing to remember")
        with closing(db()) as c, c:
            mid = c.execute("INSERT INTO coach_memory(user_id,kind,text,data,ts) VALUES(?,?,?,?,?)", (uid, "fact", text, "{}", now)).lastrowid
        return dict(ok=True, message="Noted. You can see and delete it under “What I know about you”.", undo=dict(kind="memory", id=mid))
    if kind == "commit_stop":
        hour = float(payload.get("hour", 23))
        with closing(db()) as c, c:
            mid = c.execute("INSERT INTO coach_memory(user_id,kind,text,data,ts) VALUES(?,?,?,?,?)",
                            (uid, "commitment", f"Stop scrolling by {fmt_h(hour)}", json.dumps(dict(hour=hour)), now)).lastrowid
        return dict(ok=True, message=f"Deal: phone down by {fmt_h(hour)}. I'll check in tomorrow.", undo=dict(kind="memory", id=mid))
    if kind == "set_wind_down":
        hour = float(payload.get("hour", 23))
        _profile_update(uid, bed=min(hour + 0.5, 24), night_guard=True)
        return dict(ok=True, message=f"Late-night guard now starts at {fmt_h(hour)} every night.")
    if kind == "start_experiment":
        from .platform_api import HabitReq, start_habit
        cat = payload.get("category") or "social_like"
        start_habit(HabitReq(category=cat, days=int(payload.get("days", 7))), u)
        app = app_for(cat, u["persona"])
        return dict(ok=True, message=f"Experiment started: holding {app} during focus for {int(payload.get('days', 7))} days. I'll report back.")
    if kind == "keep_rule":
        cat = payload.get("category")
        if cat not in CATEGORIES:
            raise HTTPException(400, "Unknown category")
        with closing(db()) as c, c:
            c.execute("INSERT INTO rules(user_id,category,mode) VALUES(?,?,?) ON CONFLICT(user_id,category) DO UPDATE SET mode=excluded.mode",
                      (uid, cat, payload.get("mode", "digest")))
        return dict(ok=True, message=f"Kept: {CATEGORIES[cat]['label']} now goes to your digest. Change it any time in Settings.")
    if kind == "forget":
        with closing(db()) as c, c:
            c.execute("UPDATE coach_memory SET done=? WHERE id=? AND user_id=?", (now, int(payload.get("id", 0)), uid))
        return dict(ok=True, message="Forgotten.")
    if kind == "undo":
        if payload.get("kind") == "override":
            with closing(db()) as c:
                overrides.remove(c, uid, int(payload["id"]))
                if payload.get("session"):
                    c.execute("UPDATE focus_sessions SET ended=? WHERE id=? AND user_id=?", (now, int(payload["session"]), uid))
                    c.commit()
        elif payload.get("kind") == "memory":
            with closing(db()) as c, c:
                c.execute("UPDATE coach_memory SET done=? WHERE id=? AND user_id=?", (now, int(payload["id"]), uid))
        return dict(ok=True, message="Undone.")
    raise HTTPException(400, f"Unknown action {kind}")


@router.post("/coach/action")
def action(body: Act, u=Depends(current_user)):
    return run_action(u, body.kind, body.payload)


@router.get("/coach/overrides")
def list_overrides(u=Depends(current_user)):
    with closing(db()) as c:
        return [dict(o, until_at=_clock(o["until"])) for o in overrides.active(c, u["id"])]


@router.get("/coach/receipt")
def receipt(period: str = "day", app: str | None = None, u=Depends(current_user)):
    return card_receipt(u, twin_of(u), period, app)


# ================================================================ commands (slash + plain language)
DUR = re.compile(r"(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours|m|min|mins|minute|minutes)\b")
AT = re.compile(r"\b(?:at|by|till|until)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?", re.I)


def _minutes(text: str, default: int) -> int:
    m = DUR.search(text.lower())
    if not m:
        return default
    v = float(m.group(1))
    return int(v * 60 if m.group(2).startswith("h") else v)


def _hour(text: str) -> float | None:
    m = AT.search(text)
    if not m:
        return None
    h = int(m.group(1)) % 12 if m.group(3) else int(m.group(1))
    if m.group(3) and m.group(3).lower() == "pm":
        h += 12
    if not m.group(3) and h <= 6:  # "stop at 1" late at night means 1 AM
        h += 24
    elif not m.group(3) and h < 12 and h >= 7 and "night" in text.lower():
        h += 12
    return h + (int(m.group(2)) / 60 if m.group(2) else 0)


def command(u, t, text: str, lang: str) -> dict | None:
    """Slash commands and plain-language requests that do something. Returns a full response, or None."""
    raw = text.strip().replace("’", "'").replace("‘", "'")
    low = raw.lower()

    def resp(intent, reply, cards=None, actions=None, done=None, suggest=None, category=None):
        return dict(reply=reply, intent=intent, lang=lang, card=None, category=category, cards=cards or [], actions=actions or [],
                    done=done, suggest=suggest or [], source="rules")

    if low.startswith("/"):
        cmd, _, arg = raw.partition(" ")
        cmd = cmd.lower()
        if cmd == "/help":
            return resp("help", "Here's everything I can do from the chat.", cards=[dict(type="commands", items=[dict(cmd=k, desc=v) for k, v in SLASH.items()])])
        if cmd == "/receipt":
            app = _app_from(arg, u) if arg else None
            return resp("receipt", "", cards=[card_receipt(u, t, "day", app)])
        if cmd == "/week":
            return resp("receipt_week", "", cards=[card_receipt(u, t, "week")])
        if cmd == "/plan":
            return _with_intent("plan")
        if cmd in ("/hold", "/focus"):
            default = 120 if cmd == "/hold" else 50
            minutes = int(arg) if arg.strip().isdigit() else _minutes(arg, default)
            r = run_action(u, "hold_all" if cmd == "/hold" else "start_block", dict(minutes=minutes, task=t.context_now()["task"]))
            return resp("action", r["message"], done=r)
        if cmd == "/jar":
            return _with_intent("held")
        if cmd == "/why":
            return _with_intent("why")
        if cmd == "/aura":
            return _with_intent("aura")
        if cmd == "/me":
            return resp("memory", "Here's what I know about you. Tap ✕ to make me forget something you told me.", cards=[card_memory(u, t)])
        if cmd == "/xray":
            if not arg.strip():
                return resp("xray", "Paste the notification after /xray and I'll show you its tricks.")
            return resp("xray", "", cards=[card_xray(arg)], category=guess_category(arg))
        return resp("help", f"I don't know {cmd}. Try /help.")

    # plain-language actions
    if UNDO.fullmatch(low.strip(" .!")):
        return _undo_latest(u, resp)
    cats = detect_all(raw, CATEGORY_WORDS)
    if re.search(r"\b(hold|pause|block|silence)\b.*\b(everything|all|notifications|pings)\b", low) or re.search(r"\bdo not disturb\b|\bdnd\b", low):
        r = run_action(u, "hold_all", dict(minutes=_minutes(low, 120)))
        return resp("action", r["message"], done=r)
    if re.search(r"\b(mute|silence|block)\b", low) and cats:
        until = "exam" if re.search(r"exam|test|deadline", low) else (_minutes(low, 0) or "tonight")
        r = run_action(u, "mute", dict(category=cats[0], until=until))
        return resp("action", r["message"], done=r, category=cats[0])
    if re.search(r"(night guard|late.night guard).*(off|disable|pause)|(turn off|disable|pause).*(night guard|late.night guard)", low):
        r = run_action(u, "night_off", {})
        return resp("action", r["message"], done=r)
    if re.search(r"\b(pour|release|empty)\b.*\b(jar|digest|held)\b", low):
        r = run_action(u, "release_digest", {})
        return resp("action", r["message"], done=r)
    if re.search(r"\b(draft|write)\b.*\b(reply|message|text)\b", low):
        cat = next((c for c in cats if c in ("social_dm", "work_chat", "family")), "social_dm")
        r = run_action(u, "draft_reply", dict(category=cat, lang=lang))
        return resp("action", r["message"], cards=[r["card"]], category=cat)
    if m := re.search(r"remind me (?:to )?(.+?)(?: at | in |$)", low):
        when = _hour(raw)
        mins = _minutes(low, 0)
        at = _at_hour(when) if when is not None else (time.time() + mins * 60 if mins else time.time() + 3600)
        if at < time.time():
            at += 86400
        return resp("action", f"I'll remind you at {_clock(at)}: {m.group(1).strip()}.", actions=[
            dict(label="Remind me", kind="remind", auto=True, payload=dict(text=m.group(1).strip(), at=at * 1000))])
    if low.startswith("remember ") or low.startswith("remember that "):
        r = run_action(u, "remember", dict(text=raw.split(" ", 2 if low.startswith("remember that") else 1)[-1]))
        return resp("action", r["message"], done=r)
    if re.search(r"\bi(?:'ll| will| am going to|'m going to)\b.*\b(stop|sleep|put (?:it|the phone) down|log off|be in bed)\b", low) and (h := _hour(raw)) is not None:
        r = run_action(u, "commit_stop", dict(hour=h))
        return resp("action", r["message"], done=r, actions=[dict(label=f"Enforce it from {fmt_h(h)}", kind="set_wind_down", payload=dict(hour=h))])
    if re.search(r"make (this|it) (my|a) routine|try holding|experiment", low):
        cat = cats[0] if cats else "social_like"
        d = re.search(r"(\d+)\s*days?", low)
        r = run_action(u, "start_experiment", dict(category=cat, days=max(3, min(int(d.group(1)), 21)) if d else 7))
        return resp("action", r["message"], done=r, category=cat)
    if re.search(r"\b(screen ?time|receipt|wrapped)\b", low) or (re.search(r"how much time|time (did i )?(lose|lost|waste)", low)):
        if "week" in low or "wrapped" in low:
            return resp("receipt_week", "", cards=[card_receipt(u, t, "week")])
        app = _app_from(raw, u) if cats else None
        return resp("receipt", "", cards=[card_receipt(u, t, "week" if app else "day", app)])
    if re.search(r"what (do )?you know about me|my profile|forget", low):
        return resp("memory", "Here's what I know about you. Tap ✕ to make me forget something you told me.", cards=[card_memory(u, t)])
    if re.search(r"(🔔|·|:).{8,}", raw) and any(x for x in xray(raw, guess_category(raw))) and len(raw) > 25 and "?" not in raw:
        return resp("xray", "", cards=[card_xray(raw)], category=guess_category(raw))
    return None


UNDO = re.compile(r"undo( (that|it|this|the last one))?|cancel (that|it|the hold|the block)|revert( that)?|never ?mind|"
                  r"stop (holding|the hold|the focus block|the block)|end (the )?(focus )?block")


def _undo_latest(u, resp) -> dict:
    """Undo the newest temporary rule the coach set, and the focus session it started with it."""
    with closing(db()) as c:
        live = overrides.active(c, u["id"])
        latest = max(live, key=lambda o: o["created"]) if live else None
        sess = latest and c.execute("SELECT id FROM focus_sessions WHERE user_id=? AND ended IS NULL AND ABS(started-?)<5",
                                    (u["id"], latest["created"])).fetchone()
    if not latest:
        return resp("action", "There's nothing of mine to undo right now: no hold, focus block, mute or night off is running.")
    run_action(u, "undo", dict(kind="override", id=latest["id"], session=sess["id"] if sess else None))
    return resp("action", f"Undone: {latest['label']} ended early. Pings follow your usual rules again.", done=dict(ok=True, message="Undone."))


def _with_intent(intent: str) -> dict:
    """Let the normal engine answer, forcing an intent (used by /plan, /jar, /why, /aura)."""
    return dict(force_intent=intent)


def _app_from(text: str, u) -> str | None:
    cats = detect_all(text, CATEGORY_WORDS)
    return app_for(cats[0], u["persona"]) if cats else None


# ================================================================ enrich: headline + cards + actions for every answer
QUIET = {"simulate", "compare", "held", "aura", "best_time", "plan", "time_lost", "distraction", "learned", "receipt", "receipt_week", "xray"}

HEAD = {
    "simulate": ("{app}: about {cost} min if you tap now.", "{app} rn = ~{cost} min gone. just saying."),
    "compare": ("{worse} is the bigger trap right now.", "{worse} is the bigger trap fr."),
    "plan": ("Here's the rest of your day.", "your day, sorted ✨"),
    "held": ("{n} pings waiting in your jar.", "{n} pings chilling in the jar."),
    "best_time": ("You focus best {start}–{end}.", "your main character hours: {start}–{end}."),
    "aura": ("Aura this week: {aura}.", "aura check: {aura} ✨"),
    "cant_focus": ("Your focus isn't broken; your day is crowded.", "you're not lazy, your day is just loud."),
    "fatigue": ("You're at about {f}% fatigue.", "fatigue at ~{f}%. hydrate."),
    "sleep": ("{late} of your last 5 nights ended after bedtime.", "{late} of 5 nights went past bedtime. we see you 👀"),
    "distraction": ("{app} costs you the most.", "{app} is the slot machine."),
    "doomscroll": ("Batch it, don't white-knuckle it.", "don't fight it, batch it."),
    "time_lost": ("Here's what pings cost you.", "the receipts 🧾"),
    "receipt": ("{title}'s attention receipt.", "{title}'s receipt 🧾"),
    "receipt_week": ("Your week, wrapped.", "your week, wrapped 🎁"),
    "xray": ("{verdict}", "{verdict}"),
    "now": ("Here's what to do right now.", "ok here's the move."),
    "noisy": ("Let it pile up and read it in one go.", "let it cook. read it all later."),
}


def enrich(res: dict, u, t, stats: dict, text: str, tone: str = "plain") -> dict:
    intent = res.get("intent")
    cat = res.get("category")
    cards, actions = list(res.get("cards") or []), list(res.get("actions") or [])
    facts: dict = {}
    if intent == "simulate" and cat:
        c = card_ping(u, t, cat)
        cards.append(c)
        named = c["app"].lower() in text.lower()  # "PR review" is a work-chat ping, not necessarily WhatsApp
        facts = dict(app=c["app"] if named else c["label"], cost=c["cost"])
        if cat in vip_of(u):  # the card already says why; don't price it as a temptation or offer to hold it
            actions += [a for a in ping_actions(c) if a["payload"].get("choice") != "delay"]
            if res.get("lang", "en") == "en":
                res["headline"] = f"{c['label'].split(' /')[0]} is a VIP: it always gets through."
        else:
            actions += ping_actions(c)
    elif intent == "compare":
        cats = detect_all(text, CATEGORY_WORDS) or [cat or "social_like", "video_reco"]
        if len(cats) < 2:
            cats.append("video_reco" if cats[0] != "video_reco" else "social_like")
        c = card_compare(u, t, cats)
        cards.append(c)
        facts = dict(worse=c["items"][0]["app"])
        worse = c["items"][0]["category"]
        if worse not in vip_of(u):
            actions.append(dict(label=f"Mute {c['items'][0]['app']} till bedtime", kind="mute", payload=dict(category=worse, until="tonight")))
    elif intent in ("plan", "now", "deadline"):
        cards.append(card_plan(t))
        b = t.fingerprint()["best_window"]
        mins = max(25, int((b["end"] - _now_h()) * 60)) if b["start"] <= _now_h() < b["end"] else 50
        actions += [dict(label=f"Start a {min(mins, 90)}-min block", kind="start_block", payload=dict(minutes=min(mins, 90), task=t.context_now()["task"])),
                    dict(label="Hold pings till then", kind="hold_all", payload=dict(minutes=min(mins, 90)))]
    elif intent == "cant_focus":
        ev = card_evidence(t)
        cards += [ev, card_plan(t)]
        actions.append(dict(label="Start a 25-min block now", kind="start_block", payload=dict(minutes=25, task=t.context_now()["task"])))
        if ev.get("top_app"):
            cat_top = next((k for k in CATEGORIES if app_for(k, u["persona"]) == ev["top_app"]), None)
            if cat_top and cat_top not in vip_of(u):
                actions.append(dict(label=f"Mute {ev['top_app']} till bedtime", kind="mute", payload=dict(category=cat_top, until="tonight")))
        actions.append(dict(label="Draft “busy till later” reply", kind="draft_reply", payload=dict(category="social_dm")))
    elif intent == "noisy":
        k = cat or "social_dm"
        actions.append(dict(label="Hold everything for an hour", kind="hold_all", payload=dict(minutes=60)))
        if k not in vip_of(u):
            actions.append(dict(label=f"Mute {CATEGORIES[k]['label'].lower()}s till tonight", kind="mute", payload=dict(category=k, until="tonight")))
        actions.append(dict(label="Draft “busy till later” reply", kind="draft_reply", payload=dict(category=k if k in ("social_dm", "work_chat", "family") else "social_dm")))
    elif intent == "held":
        jar = card_jar(u)
        cards.append(jar)
        facts = dict(n=jar["count"])
        if jar["count"]:
            actions.append(dict(label="Pour the jar now", kind="release_digest", payload={}))
    elif intent == "best_time":
        fpc = card_fingerprint(t)
        cards.append(fpc)
        facts = dict(start=fmt_h(fpc["best"]["start"]), end=fmt_h(fpc["best"]["end"]))
    elif intent == "aura":
        cards.append(card_aura(stats))
        facts = dict(aura=(stats.get("aura") or {}).get("week", 0))
    elif intent in ("time_lost",):
        cards.append(card_receipt(u, t, "week" if "week" in text.lower() else "day"))
    elif intent in ("distraction", "doomscroll"):
        app = None
        if cat:
            app = app_for(cat, u["persona"])
        rec = card_receipt(u, t, "week", app or next((a["app"] for a in t.apps() if a["focus_breaks_per_day"] > 0), None))
        cards.append(rec)
        facts = dict(app=rec.get("app") or "That app")
        k = cat or next((x for x in CATEGORIES if app_for(x, u["persona"]) == rec.get("app")), None)
        if k and k not in vip_of(u):
            actions += [dict(label=f"Mute {rec.get('app')} till bedtime", kind="mute", payload=dict(category=k, until="tonight")),
                        dict(label="Try holding it for 7 days", kind="start_experiment", payload=dict(category=k, days=7))]
    elif intent in ("sleep", "fatigue"):
        late, ends = late_nights(t)
        facts = dict(late=late, f=round(t.context_now()["fatigue"] * 100))
        if intent == "fatigue" and PATTERN.search(text) and res.get("lang", "en") == "en":  # the pattern, not this minute
            onset = fmt_h(t.fingerprint()["fatigue_onset"])
            res["headline"] = f"Your fatigue builds from {onset} most days." if tone != "genz" else f"the {onset.lower()} slump is real."
        if late:
            cards.append(dict(type="evidence", facts=[dict(label=f"Night {i + 1} ended", value=e) for i, e in enumerate(ends[:5])]))
            p = routine.merge(t.profile)
            actions.append(dict(label=f"Wind down at {fmt_h(float(p['bed']) - 0.5)} nightly", kind="set_wind_down", payload=dict(hour=float(p["bed"]) - 0.5)))
    elif intent in ("receipt", "receipt_week") and cards:
        facts = dict(title=cards[0].get("title", "Today"))
        if cards[0].get("period") == "app":
            res["headline"] = f"{cards[0]['app']}: your last 7 days."
        top = next((r for r in cards[0].get("rows", []) if r["lost"] > 0), None)
        k = top and next((x for x in CATEGORIES if app_for(x, u["persona"]) == top["app"]), None)
        if k and k not in vip_of(u):
            actions.append(dict(label=f"Fix this: mute {top['app']} till bedtime", kind="mute", payload=dict(category=k, until="tonight")))
    elif intent == "xray" and cards:
        facts = dict(verdict=cards[0].get("verdict", ""))
        if cards[0].get("category") and cards[0]["category"] not in vip_of(u):
            actions.append(dict(label=f"Shield {CATEGORIES[cards[0]['category']]['label'].lower()}s till bedtime", kind="mute",
                                payload=dict(category=cards[0]["category"], until="tonight")))
    elif intent == "learned":
        cards.append(card_memory(u, t))
    english = res.get("lang", "en") == "en"  # headlines are English; other languages keep the translated sentence
    if cards and english and res.get("source") == "rules" and intent in QUIET:  # the card already says it; keep the bubble short
        res["reply"] = ""
    if not res.get("suggest"):
        from .assistant import FOLLOW
        res["suggest"] = FOLLOW.get(intent, FOLLOW["help"])
    if english and intent in HEAD and not res.get("headline"):
        try:
            res["headline"] = HEAD[intent][1 if tone == "genz" else 0].format(**facts)
        except (KeyError, IndexError):
            pass
    res["cards"], res["actions"] = cards, actions[:3]
    return res


# ================================================================ proactive nudges
DAILY_BUDGET = 3



def _nudge(kind, title, text, actions):
    return dict(kind=kind, title=title, text=text, actions=actions)


def candidates(u, t, stats) -> list[dict]:
    h = _now_h()
    p = routine.merge(t.profile)
    fp = t.fingerprint()
    b = fp["best_window"]
    out = []
    # a commitment from yesterday that slipped
    for m in memories(u["id"]):
        if m["kind"] == "commitment":
            hour = json.loads(m["data"] or "{}").get("hour")
            y = (date.today() - timedelta(days=1)).isoformat()
            segs = [s for s in t.segments if s["day"] == y]
            if hour and segs and max(s["end"] for s in segs) > hour + 0.25 and h < 20:
                out.append(_nudge("commitment", f"You said you'd stop by {fmt_h(hour)}",
                                  f"Last night ended at {fmt_h(max(s['end'] for s in segs))}. Want me to enforce it tonight?",
                                  [dict(label=f"Enforce from {fmt_h(hour)}", kind="set_wind_down", payload=dict(hour=hour))]))
    # experiments that finished
    from .platform_api import habits
    for hab in habits(u):
        if hab["status"] == "done":
            per_day = round(hab["minutes_saved"] / max(hab["days"], 1), 1)
            out.append(_nudge(f"experiment:{hab['id']}", "Your experiment is done",
                              f"{hab['title']}: {hab['minutes_saved']} min protected (~{per_day}/day). Keep it as a rule?",
                              [dict(label="Keep it", kind="keep_rule", payload=dict(category=hab["category"], mode="digest"))]))
    with closing(db()) as c:
        pending = c.execute("SELECT COUNT(*) FROM deferred_queue WHERE user_id=? AND released IS NULL", (u["id"],)).fetchone()[0]
    if pending and any(0 <= h - m["hour"] <= 0.75 for m in routine.check_moments(t.profile, now=datetime.now() - timedelta(minutes=45))):
        out.append(_nudge("checkpoint", f"{pending} pings waiting", "Your block just ended. None of them were urgent.",
                          [dict(label="Pour the jar", kind="release_digest", payload={})]))
    if -0.1 <= b["start"] - h <= 0.25:
        mins = int((b["end"] - max(h, b["start"])) * 60)
        out.append(_nudge("golden_soon", f"Golden hours at {fmt_h(b['start'])}", "Your best focus window of the day. Hold pings and start your hardest task?",
                          [dict(label=f"Hold pings for {mins} min", kind="start_block", payload=dict(minutes=mins, task=t.context_now()["task"]))]))
    if routine.night_guard_active(t.profile, h) and (h - (float(p["bed"]) - 0.5)) % 24 <= 1:
        out.append(_nudge("late_night", "bro. it's " + fmt_h(h).lower(), "Future you has a morning. The late-night guard is holding pings; want to wind down?",
                          [dict(label="Wind down till morning", kind="hold_all", payload=dict(minutes=int(((float(p["wake"]) - h) % 24) * 60), label="Wind down"))]))
    dl = routine.deadline_pressure(t.profile)
    if dl and dl["days_left"] <= 3 and float(p["wake"]) <= h < float(p["wake"]) + 3:
        out.append(_nudge("exam_morning", f"{dl['title']} in {dl['days_left']} day(s)", "Want today planned around your golden hours?",
                          [dict(label="Plan my day", kind="ask", payload=dict(text="/plan"))]))
    today = date.today().isoformat()
    dist = [s for s in t.segments if s["day"] == today and s["kind"] == "distraction" and (s["end"] - s["start"]) * 60 >= 15 and 0 <= h - s["end"] <= 0.35]
    if dist:
        s = dist[-1]
        out.append(_nudge("rabbit", f"{round((s['end'] - s['start']) * 60)} min on {s['app']}", "That's usually where 40 minutes starts. Want back in?",
                          [dict(label="Hold pings for an hour", kind="hold_all", payload=dict(minutes=60))]))
    if date.today().weekday() == 6 and h >= 18:
        out.append(_nudge("weekly", "Your week is ready", "Your attention, Wrapped-style: best day, longest block, top trap.",
                          [dict(label="Show my week", kind="ask", payload=dict(text="/week"))]))
    return out


@router.get("/coach/nudge")
def nudge(force: str | None = None, u=Depends(current_user)):
    t, stats = twin_of(u), stats_for(u)
    day0 = datetime.combine(date.today(), datetime.min.time()).timestamp()
    with closing(db()) as c:
        shown = [dict(r) for r in c.execute("SELECT * FROM coach_nudges WHERE user_id=? AND ts>?", (u["id"], time.time() - 7 * 86400))]
    today_n = sum(1 for s in shown if s["ts"] >= day0)
    muted = {s["kind"] for s in shown if s["response"] == "fewer"}
    recent = {s["kind"] for s in shown if s["ts"] >= time.time() - 2 * 3600}
    done_kinds = {s["kind"] for s in shown if s["kind"].startswith(("experiment:", "commitment")) and s["ts"] >= day0 - 86400 * 7}
    if today_n >= DAILY_BUDGET and not force:
        return None
    for n in candidates(u, t, stats):
        if force and n["kind"].split(":")[0] != force:
            continue
        if not force and (n["kind"].split(":")[0] in muted or n["kind"] in recent or n["kind"] in done_kinds):
            continue
        with closing(db()) as c, c:
            n["id"] = c.execute("INSERT INTO coach_nudges(user_id,kind,ts) VALUES(?,?,?)", (u["id"], n["kind"], time.time())).lastrowid
        n["left_today"] = DAILY_BUDGET - today_n - 1
        return n
    if force in DEMO_NUDGES:  # presentations: show any nudge on demand, flagged as a demo
        n = dict(DEMO_NUDGES[force], kind=force, demo=True, id=0, left_today=DAILY_BUDGET - today_n)
        return n
    return None


DEMO_NUDGES = {
    "golden_soon": _nudge("golden_soon", "Golden hours in 10 min", "Your best focus window of the day. Hold pings and start your hardest task?",
                          [dict(label="Hold pings for 90 min", kind="start_block", payload=dict(minutes=90))]),
    "late_night": _nudge("late_night", "bro. it's 11:42 pm", "Future you has an 8 AM class. The late-night guard is holding pings; want to wind down?",
                         [dict(label="Wind down till morning", kind="hold_all", payload=dict(minutes=480, label="Wind down"))]),
    "checkpoint": _nudge("checkpoint", "4 pings waiting", "Your block just ended. None of them were urgent.",
                         [dict(label="Pour the jar", kind="release_digest", payload={})]),
    "rabbit": _nudge("rabbit", "18 min on Instagram", "That's usually where 40 minutes starts. Want back in?",
                     [dict(label="Hold pings for an hour", kind="hold_all", payload=dict(minutes=60))]),
    "exam_morning": _nudge("exam_morning", "DBMS exam in 2 days", "Want today planned around your golden hours?",
                           [dict(label="Plan my day", kind="ask", payload=dict(text="/plan"))]),
    "weekly": _nudge("weekly", "Your week is ready", "Your attention, Wrapped-style: best day, longest block, top trap.",
                     [dict(label="Show my week", kind="ask", payload=dict(text="/week"))]),
    "commitment": _nudge("commitment", "You said you'd stop by 11:00 PM", "Last night ended at 12:40 AM. Want me to enforce it tonight?",
                         [dict(label="Enforce from 11:00 PM", kind="set_wind_down", payload=dict(hour=23))]),
}


class NudgeReply(BaseModel):
    response: str


@router.post("/coach/nudge/{nid}")
def nudge_reply(nid: int, body: NudgeReply, u=Depends(current_user)):
    if body.response not in ("accept", "dismiss", "fewer"):
        raise HTTPException(400, "Bad response")
    with closing(db()) as c, c:
        c.execute("UPDATE coach_nudges SET response=? WHERE id=? AND user_id=?", (body.response, nid, u["id"]))
    return dict(ok=True)


@router.get("/coach/commands")
def commands():
    return [dict(cmd=k, desc=v) for k, v in SLASH.items()]
