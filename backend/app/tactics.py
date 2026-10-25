"""Manipulation X-ray: name the engagement tactic a notification uses.

Reads the notification's wording only in memory, at decision time, and keeps nothing but the
tactic labels. The patterns come from docs/PSYCHOLOGY.md (social proof, curiosity gaps,
manufactured urgency, re-engagement, streak pressure, algorithmic bait).
"""

from __future__ import annotations

import re

TACTICS = {
    "social_proof": dict(label="Social proof", explain="Counts other people's approval so the tap feels like a reward waiting for you."),
    "curiosity_gap": dict(label="Vague teaser", explain="Says something happened without saying what, so you have to open the app to find out."),
    "urgency": dict(label="Fake urgency", explain="A deadline or countdown pushes you to decide now instead of later."),
    "reengagement": dict(label="Re-engagement bait", explain="Sent because you've been away, not because anything important happened."),
    "streak": dict(label="Streak pressure", explain="Turns a habit into something to lose, so missing a day feels like a cost."),
    "algorithmic": dict(label="Algorithm bait", explain="Picked by a recommender to keep you watching; nobody is waiting for you."),
    "fomo": dict(label="FOMO hook", explain="Frames normal news as something you'll regret missing."),
}

RULES = [
    ("reengagement", r"miss(ed)? you|we miss|come back|see what you missed|haven'?t (seen|been)|it'?s been a while|catch up on"),
    ("curiosity_gap", r"new activity|did you see|you won'?t believe|something (new|happened)|see this|\d+ new notifications|guess what|👀"),
    ("social_proof", r"and \d+ others|\d+ (people|others|friends)|liked your|reacted to|is trending|viewed your profile"),
    ("urgency", r"ends (tonight|today|soon)|last chance|only \d+|hurry|flash sale|\d+% off|limited time|expires"),
    ("streak", r"streak|days? in a row|don'?t lose|keep your"),
    ("algorithmic", r"new video|recommended|for you|you might like|because you watched|suggested"),
    ("fomo", r"breaking|everyone is|don'?t miss|trending now|just in"),
]

# What a category usually turns out to be, for "teaser unmasking" when the text is vague.
USUALLY = {
    "social_like": "usually 1–3 likes, no messages",
    "social_dm": "usually a meme or a link, rarely urgent",
    "video_reco": "an autoplay queue, not a person",
    "news": "a headline that will still be there tonight",
    "promo": "the same sale, back next week",
    "email": "a newsletter, readable in the evening digest",
}


def xray(text: str | None, category: str) -> list[dict]:
    t = (text or "").lower()
    found = []
    for key, pattern in RULES:
        if re.search(pattern, t) and key not in found:
            found.append(key)
    if category == "video_reco" and "algorithmic" not in found:
        found.append("algorithmic")
    return [dict(tactic=k, **TACTICS[k]) for k in found]


def unmask(category: str) -> str | None:
    return USUALLY.get(category)


def is_reengagement(tags: list[dict]) -> bool:
    return any(t["tactic"] == "reengagement" for t in tags)
