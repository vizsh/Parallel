"""Optional Claude-powered coach.

Off unless credentials are configured (ANTHROPIC_API_KEY / ANTHROPIC_AUTH_TOKEN) and PARALLEL_COACH isn't "rules".
Claude only rephrases and reasons over the facts our own models computed; it is told never to
invent numbers. Any failure falls back to the rule engine in assistant.py.
"""

from __future__ import annotations

import json
import os

MODEL = os.getenv("PARALLEL_COACH_MODEL", "claude-opus-5-5")

SYSTEM = """You are the Twin Coach inside Parallel, an app that predicts what each phone notification will cost a person in focus minutes and helps them hold, digest or allow it.

How to answer:
- Use only the numbers in the FACTS block. Never invent a statistic, time, percentage or app name. If the facts don't cover the question, say what you can't see and suggest where in the app to look.
- Reply in the language code given in "lang" (en English, hi Hindi, mr Marathi, es Spanish).
- Be brief: 1 to 4 sentences, plain text, no markdown, no lists. Sound like a smart, warm friend: casual, a little playful (light Gen Z tone is fine), never preachy or shaming.
- Give one concrete next step when it helps.
- Opening a ping on purpose is a valid choice. Respect the user's rules (VIPs always pass).
- Fatigue and stress are behavioural estimates, not medical facts. If someone sounds distressed, be kind and suggest a break or talking to someone they trust; don't diagnose.
- Questions unrelated to attention, focus, notifications, study or work habits: answer in one friendly line and steer back.
- The app already shows the numbers as cards (listed under CARDS) and offers the buttons listed under ACTIONS. Don't repeat every number; interpret them and point to the most useful button.
- Tone "genz": casual, lowercase is fine, light slang, at most one emoji. Tone "plain": friendly and clear, no slang."""


def enabled() -> bool:
    if os.getenv("PARALLEL_COACH", "").lower() == "rules":
        return False
    if not (os.getenv("ANTHROPIC_API_KEY") or os.getenv("ANTHROPIC_AUTH_TOKEN")):
        return False
    try:
        import anthropic  # noqa: F401
    except ImportError:
        return False
    return True


_client = None


def _get_client():
    global _client
    if _client is None:
        import anthropic
        _client = anthropic.Anthropic(timeout=20.0, max_retries=1)
    return _client


def reply(facts: dict, history: list[dict], text: str, lang: str, tone: str = "plain", shown: dict | None = None) -> str | None:
    """Return Claude's reply, or None so the caller falls back to the rule engine."""
    import anthropic
    messages = []
    for m in history[-6:]:
        role = "user" if m["role"] == "user" else "assistant"
        if messages and messages[-1]["role"] == role:
            continue  # keep strict alternation
        messages.append({"role": role, "content": m["text"]})
    if messages and messages[-1]["role"] == "user":
        messages.pop()
    while messages and messages[0]["role"] != "user":
        messages.pop(0)
    cards = [c.get("type") for c in (shown or {}).get("cards", [])]
    acts = [a.get("label") for a in (shown or {}).get("actions", [])]
    messages.append({"role": "user", "content": f"FACTS (from the user's own models, {lang=}, {tone=}):\n{json.dumps(facts, default=str)}\n"
                                                f"CARDS: {cards}\nACTIONS: {acts}\n\nQUESTION: {text}"})
    try:
        resp = _get_client().beta.messages.create(
            model=MODEL,
            max_tokens=16000,
            system=SYSTEM,
            output_config={"effort": "low"},  # short grounded chat: low effort keeps it fast
            betas=["server-side-fallback-2026-07-01"],
            fallbacks="default",
            messages=messages,
        )
    except anthropic.APIConnectionError:
        return None
    except anthropic.APIStatusError:
        return None
    if resp.stop_reason == "refusal":
        return None
    out = "".join(b.text for b in resp.content if b.type == "text").strip()
    return out or None
