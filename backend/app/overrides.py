"""Temporary rules the coach sets on your behalf: focus blocks, mutes, a night off from the guard.

Every override has an end time and can be undone, so a chat command never changes your
permanent rules by accident. `apply_rules` in main.py reads the active ones on every decision.
"""

from __future__ import annotations

import time

SCHEMA = """
CREATE TABLE IF NOT EXISTS coach_overrides (
    id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    kind TEXT, category TEXT, label TEXT, created REAL, until REAL);
CREATE TABLE IF NOT EXISTS coach_nudges (
    id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    kind TEXT, ts REAL, response TEXT);
CREATE TABLE IF NOT EXISTS coach_memory (
    id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    kind TEXT, text TEXT, data TEXT, ts REAL, done REAL);
"""

KINDS = ("hold_all", "mute", "night_off")


def ensure_schema(c):
    c.executescript(SCHEMA)


def active(c, uid: int, now: float | None = None) -> list[dict]:
    now = now or time.time()
    return [dict(r) for r in c.execute("SELECT * FROM coach_overrides WHERE user_id=? AND until>? ORDER BY until", (uid, now))]


def add(c, uid: int, kind: str, until: float, label: str, category: str | None = None) -> int:
    assert kind in KINDS
    cur = c.execute("INSERT INTO coach_overrides(user_id,kind,category,label,created,until) VALUES(?,?,?,?,?,?)",
                    (uid, kind, category, label, time.time(), until))
    c.commit()
    return cur.lastrowid


def remove(c, uid: int, oid: int) -> bool:
    n = c.execute("UPDATE coach_overrides SET until=? WHERE id=? AND user_id=?", (time.time() - 1, oid, uid)).rowcount
    c.commit()
    return n > 0
