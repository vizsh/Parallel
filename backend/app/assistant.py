"""Twin Coach: a persona-aware, multilingual assistant.

Deliberately grounded: an intent router picks a question type, the numbers come
from the twin's models, and language/persona only change the wording. The
assistant never invents a number the model didn't produce.
"""

from __future__ import annotations

import re
from datetime import date, timedelta

from .twin import Twin, fmt_h

LANGS = ("en", "hi", "mr", "es")

INTENTS = {
    "greet": ["hi", "hello", "hey", "yo", "sup", "good morning", "good evening", "namaste", "नमस्ते", "नमस्कार", "hola"],
    "thanks": ["thanks", "thank you", "thx", "ty", "appreciate", "धन्यवाद", "शुक्रिया", "gracias"],
    "capabilities": ["what can you do", "help me", "help", "what do you do", "who are you", "how to use"],
    "simulate": ["allow", "should i open", "should i check", "should i reply", "open it", "notification", "ping", "अनुमति", "खोलूं", "खोलू",
                 "नोटिफिकेशन", "उघडू", "सूचना", "permitir", "abrir", "notificación", "debería abrir"],
    "compare": [" vs ", "versus", "compare", "worse", "better than", "which is worse"],
    "why": ["why", "how come", "reason", "explain", "क्यों", "por qué"],
    "cant_focus": ["can't focus", "cant focus", "can't study", "cant study", "cannot focus", "can't concentrate", "unproductive",
                   "procrastinat", "not able to study", "distracted today", "wasting my day", "can't get anything done"],
    "now": ["right now", "what should i do", "should i study", "should i work", "start now", "focus now", "can i focus", "now"],
    "plan": ["plan", "schedule", "tonight", "this evening", "tomorrow", "my day", "routine", "timetable"],
    "deadline": ["exam", "deadline", "test", "assignment", "submission", "due", "परीक्षा", "examen"],
    "best_time": ["best time", "focus best", "when do i focus", "golden", "peak", "productive", "कब", "सबसे अच्छा", "केव्हा", "कधी", "cuándo", "mejor hora"],
    "distraction": ["distract", "biggest", "worst app", "which app", "breaks my", "ध्यान भटक", "कौन सा ऐप", "कोणते ॲप", "distrae", "qué app"],
    "doomscroll": ["doomscroll", "scrolling", "addicted", "can't stop", "cant stop", "reels", "shorts", "stop using", "quit", "rabbit hole",
                   "picking up my phone", "pick up my phone", "keep checking", "keep opening", "checking my phone", "check my phone",
                   "put my phone down", "put the phone down", "glued to my phone", "on my phone all"],
    "noisy": ["won't stop", "wont stop", "keeps buzzing", "keep buzzing", "buzzing", "blowing up", "too many notifications",
              "so many notifications", "too many pings", "so many pings", "spamming", "nonstop", "non-stop", "flooding", "flooded"],
    "time_lost": ["how much time", "time lost", "wasted", "lose", "lost", "saved", "how many minutes", "this week", "debt"],
    "fatigue": ["so tired", "always tired", "tired", "fatigue", "break", "exhausted", "sleepy", "drained", "थक", "आराम", "ब्रेक", "थकलो", "cansad", "descanso"],
    "sleep": ["sleep", "late night", "bed", "insomnia", "night guard", "midnight", "नींद", "झोप", "dormir"],
    "stress": ["stressed", "stress", "anxious", "anxiety", "overwhelmed", "burnout", "burnt out", "sad", "panic"],
    "aura": ["aura", "xp", "level", "streak", "points", "score", "fate", "main character", "npc"],
    "held": ["held", "waiting", "jar", "queue", "digest", "what did i miss", "missed", "pending"],
    "privacy": ["privacy", "private", "my data", "read my messages", "store", "delete my", "safe", "track me", "spy"],
    "method": ["how do you", "how does", "how does this work", "predict", "accurate", "accuracy", "trust", "model", "algorithm", "monte carlo"],
    "rules": ["vip", "always let", "never let", "mute", "block", "whitelist", "rule"],
    "today": ["today", "how am i", "doing", "status", "progress", "आज", "कैसा", "कसा", "hoy", "cómo voy"],
    "recommend": ["recommend", "suggest", "improve", "tips", "advice", "सुझाव", "सल्ला", "सुधार", "recomienda", "consejo"],
    "learned": ["learn", "know about me", "what do you know", "सीखा", "शिकलास", "aprendiste", "sabes de mí"],
}

CATEGORY_WORDS = {
    "social_like": ["instagram", "insta", "like", "linkedin", "post", "इंस्टा", "लाइक", "me gusta"],
    "social_dm": ["dm", "discord", "message from", "friend", "group chat", "groupchat", "group", "दोस्त", "मित्र", "amigo"],
    "video_reco": ["youtube", "video", "reel", "यूट्यूब", "वीडियो", "व्हिडिओ"],
    "work_chat": ["slack", "teams", "teammate", "pr", "review", "colleague", "टीम", "compañero"],
    "email": ["email", "mail", "gmail", "newsletter", "ईमेल", "correo"],
    "calendar": ["meeting", "calendar", "standup", "मीटिंग", "reunión"],
    "family": ["mom", "mother", "dad", "family", "whatsapp", "माँ", "मम्मी", "आई", "पापा", "mamá", "familia"],
    "promo": ["sale", "offer", "amazon", "discount", "सेल", "ऑफर", "oferta"],
    "news": ["news", "twitter", "x.com", "breaking", "खबर", "बातमी", "noticias"],
    "security": ["bank", "otp", "sign-in", "security", "बैंक", "banco"],
}

T = {
    "en": {
        "sim": "If you open this {label} now, I expect a {p}% chance you check it, typically costing {cost} min (range {lo}-{hi}). Held back, it costs ~{d} min. My call: {rec}. {why}",
        "best": "Your golden hours are {s}-{e}. Focus quality there is {q}% of your best. {persona}",
        "distract": "{app} breaks your focus about {n}x a day, and each break costs ~{c} min. {pct}% of quick checks turn into rabbit holes.",
        "fatigue": "Right now your estimated fatigue is {f}%. Fatigue usually kicks in around {onset}. {advice}",
        "today": "You've made {d} intentional decisions and protected ~{m} minutes so far. Level {lvl}, {xp} XP. {persona}",
        "rec": "Top move: {t}. It could win back up to about {i} min a day ({ev}).",
        "learned": "In {days} days I've learned from {n} events. I'm {imp}% better than a generic notification rule at predicting what you'll open.",
        "help": "Ask me things like: 'Should I open this Instagram like?', 'When do I focus best?', 'Which app distracts me most?', or 'Am I tired?'",
        "rec_words": {"allow": "let it through", "delay": "hold it until your next checkpoint", "summarize": "add it to your digest", "ask": "decide yourself: there isn't enough evidence for this moment yet"},
        "fatigue_hi": "Take a 10-minute walk before your next block.", "fatigue_lo": "You're good to keep going.",
        "learned_early": "In {days} days I've learned from {n} events. So far I'm about level with a generic notification rule: most of your history is still the warm-up I generated from your routine. Every reality check you give me pulls me ahead.",
        "fatigue_pattern": "It's a pattern, not you: on your history fatigue climbs from about {onset} and peaks around {peak} at ~{peak_f}%. {late}Do hard work in {s}-{e} and keep evenings for lighter tasks.",
        "late_line": "{late} of your last 5 nights also ran past your {bed} bedtime, and short nights show up the next evening. ",
    },
    "hi": {
        "sim": "अगर आप यह {label} अभी खोलते हैं, तो {p}% संभावना है कि आप इसे देखेंगे, जिसकी कीमत आमतौर पर {cost} मिनट होती है (रेंज {lo}-{hi})। रोकने पर ~{d} मिनट। मेरी सलाह: {rec}।",
        "best": "आपके गोल्डन घंटे {s}-{e} हैं। वहाँ फोकस गुणवत्ता आपके सर्वश्रेष्ठ का {q}% है। {persona}",
        "distract": "{app} दिन में लगभग {n} बार आपका फोकस तोड़ता है, और हर बार ~{c} मिनट लगते हैं। {pct}% छोटी जाँचें लंबे स्क्रॉल में बदल जाती हैं।",
        "fatigue": "अभी आपकी अनुमानित थकान {f}% है। थकान आमतौर पर {onset} के आसपास शुरू होती है। {advice}",
        "today": "आपने {d} सोच-समझकर फैसले लिए और ~{m} मिनट बचाए। लेवल {lvl}, {xp} XP। {persona}",
        "rec": "सबसे अच्छा कदम: {t}। इससे रोज़ लगभग {i} मिनट तक बच सकते हैं ({ev})।",
        "learned": "{days} दिनों में मैंने {n} घटनाओं से सीखा है। मैं सामान्य नियम से {imp}% बेहतर अनुमान लगाता हूँ।",
        "help": "मुझसे पूछें: 'क्या मैं यह इंस्टा लाइक खोलूं?', 'मैं कब सबसे अच्छा फोकस करता हूँ?', 'कौन सा ऐप ध्यान भटकाता है?'",
        "rec_words": {"allow": "आने दें", "delay": "अगले चेकपॉइंट तक रोकें", "summarize": "डाइजेस्ट में डालें", "ask": "खुद तय करें: इस पल के लिए अभी पर्याप्त डेटा नहीं है"},
        "fatigue_hi": "अगले ब्लॉक से पहले 10 मिनट टहल लें।", "fatigue_lo": "आप ठीक हैं, जारी रखें।",
        "learned_early": "{days} दिनों में मैंने {n} घटनाओं से सीखा है। अभी मैं सामान्य नियम के लगभग बराबर हूँ: आपका ज़्यादातर इतिहास अभी आपकी दिनचर्या से बनाया गया शुरुआती डेटा है। हर रियलिटी चेक से मैं बेहतर होता हूँ।",
        "fatigue_pattern": "यह एक पैटर्न है, आपकी गलती नहीं: थकान लगभग {onset} से बढ़ती है और {peak} के आसपास ~{peak_f}% पर होती है। {late}कठिन काम {s}-{e} में करें, शाम को हल्के काम रखें।",
        "late_line": "पिछली 5 में से {late} रातें {bed} के सोने के समय के बाद तक चलीं। ",
    },
    "mr": {
        "sim": "तुम्ही ही {label} आत्ता उघडली तर {p}% शक्यता आहे की तुम्ही ती पाहाल, साधारण {cost} मिनिटे जातील ({lo}-{hi})। थांबवल्यास ~{d} मिनिटे. माझा सल्ला: {rec}.",
        "best": "तुमचे सर्वोत्तम तास {s}-{e} आहेत. तिथे फोकस {q}% असतो. {persona}",
        "distract": "{app} दिवसातून सुमारे {n} वेळा तुमचा फोकस तोडते, प्रत्येक वेळी ~{c} मिनिटे. {pct}% छोट्या तपासण्या लांब स्क्रोलमध्ये बदलतात.",
        "fatigue": "सध्या तुमचा अंदाजे थकवा {f}% आहे. थकवा साधारण {onset} च्या आसपास सुरू होतो. {advice}",
        "today": "तुम्ही {d} विचारपूर्वक निर्णय घेतले आणि ~{m} मिनिटे वाचवली. लेव्हल {lvl}, {xp} XP. {persona}",
        "rec": "सर्वोत्तम पाऊल: {t}. यामुळे रोज सुमारे {i} मिनिटांपर्यंत वाचू शकतात ({ev}).",
        "learned": "{days} दिवसांत मी {n} घटनांमधून शिकलो. सामान्य नियमापेक्षा मी {imp}% अचूक आहे.",
        "help": "मला विचारा: 'ही इन्स्टा सूचना उघडू का?', 'माझा फोकस केव्हा सर्वोत्तम असतो?', 'कोणते ॲप लक्ष विचलित करते?'",
        "rec_words": {"allow": "येऊ द्या", "delay": "पुढच्या चेकपॉइंटपर्यंत थांबवा", "summarize": "डायजेस्टमध्ये टाका", "ask": "तुम्हीच ठरवा: या क्षणासाठी अजून पुरेसा डेटा नाही"},
        "fatigue_hi": "पुढच्या ब्लॉकआधी 10 मिनिटे चाला.", "fatigue_lo": "तुम्ही ठीक आहात, चालू ठेवा.",
        "learned_early": "{days} दिवसांत मी {n} घटनांमधून शिकलो. सध्या मी सामान्य नियमाइतकाच अचूक आहे: तुमचा बहुतेक इतिहास अजून तुमच्या दिनक्रमावरून तयार केलेला सुरुवातीचा डेटा आहे. प्रत्येक रिअॅलिटी चेकने मी सुधारतो.",
        "fatigue_pattern": "हा एक पॅटर्न आहे, तुमचा दोष नाही: थकवा साधारण {onset} पासून वाढतो आणि {peak} च्या आसपास ~{peak_f}% असतो. {late}अवघड काम {s}-{e} मध्ये करा, संध्याकाळी हलकी कामे ठेवा.",
        "late_line": "गेल्या 5 पैकी {late} रात्री {bed} च्या झोपेच्या वेळेनंतर गेल्या. ",
    },
    "es": {
        "sim": "Si abres este {label} ahora, hay un {p}% de probabilidad de que lo mires, con un coste típico de {cost} min (rango {lo}-{hi}). Retenido, ~{d} min. Mi consejo: {rec}.",
        "best": "Tus horas doradas son {s}-{e}. Ahí tu foco está al {q}% de tu mejor nivel. {persona}",
        "distract": "{app} rompe tu foco unas {n} veces al día y cada vez cuesta ~{c} min. El {pct}% de los vistazos se vuelven madrigueras.",
        "fatigue": "Tu fatiga estimada ahora es {f}%. Suele empezar alrededor de las {onset}. {advice}",
        "today": "Has tomado {d} decisiones intencionales y protegido ~{m} minutos. Nivel {lvl}, {xp} XP. {persona}",
        "rec": "Mejor movimiento: {t}. Podría devolverte hasta unos {i} min al día ({ev}).",
        "learned": "En {days} días aprendí de {n} eventos. Predigo un {imp}% mejor que una regla genérica.",
        "help": "Pregúntame: '¿Debería abrir este me gusta de Instagram?', '¿Cuándo me concentro mejor?', '¿Qué app me distrae más?'",
        "rec_words": {"allow": "déjalo pasar", "delay": "retenlo hasta tu próximo punto de control", "summarize": "añádelo al resumen", "ask": "decide tú: aún no hay suficientes datos para este momento"},
        "fatigue_hi": "Camina 10 minutos antes del siguiente bloque.", "fatigue_lo": "Vas bien, sigue.",
        "learned_early": "En {days} días aprendí de {n} eventos. Por ahora estoy al nivel de una regla genérica: casi todo tu historial es aún el calentamiento que generé a partir de tu rutina. Cada comprobación real que me das me hace mejorar.",
        "fatigue_pattern": "Es un patrón, no eres tú: tu fatiga sube desde las {onset} y llega a ~{peak_f}% hacia las {peak}. {late}Haz lo difícil entre {s} y {e} y deja las tardes para tareas ligeras.",
        "late_line": "{late} de tus últimas 5 noches pasaron de tu hora de dormir ({bed}). ",
    },
}

PERSONA_LINE = {
    "student": {"en": "Put your toughest chapter there, not your notes cleanup.", "hi": "सबसे कठिन अध्याय वहीं पढ़ें।",
                "mr": "सर्वात कठीण धडा तेव्हाच अभ्यासा.", "es": "Pon ahí tu tema más difícil."},
    "developer": {"en": "Save that window for the gnarliest bug, not code review.", "hi": "उस समय सबसे कठिन बग ठीक करें।",
                  "mr": "त्या वेळेत सर्वात कठीण बग सोडवा.", "es": "Guarda esa ventana para el bug más difícil."},
    "creator": {"en": "Create first, post later. Your feed can wait for your edit.", "hi": "पहले बनाइए, बाद में पोस्ट कीजिए।",
                "mr": "आधी तयार करा, नंतर पोस्ट करा.", "es": "Primero crea, luego publica."},
    "professional": {"en": "Guard it from meetings. Deep analysis lives there.", "hi": "इसे मीटिंग्स से बचाइए।",
                     "mr": "ही वेळ मीटिंगपासून वाचवा.", "es": "Protégela de las reuniones."},
}




# "every evening", "always tired": a question about the pattern rather than about right now
PATTERN = re.compile(r"\b(every|always|usually|each|evenings?|nights?|afternoons?|after (lunch|dinner|class|work)|daily|so often)\b", re.I)
EARLY_EDGE = 3  # points of Brier improvement below which "level with a generic rule" is the honest reading


def detect(text: str, table: dict) -> str | None:
    """Keyword scoring. Multi-word phrases count double so 'breaks my focus' beats 'break'."""
    t = " " + text.lower() + " "
    best, score = None, 0.0
    for key, words in table.items():
        s = sum((2.0 if " " in w.strip() else 1.0) for w in words
                if re.search(r"(?<!\w)" + re.escape(w.lower().strip()) + (r"(?!\w)" if len(w.strip()) <= 3 else ""), t))
        if s > score:
            best, score = key, s
    return best


def detect_all(text: str, table: dict) -> list[str]:
    """Every category mentioned, in the order it appears ('instagram vs youtube')."""
    t = text.lower()
    hits = []
    for key, words in table.items():
        pos = [m.start() for w in words for m in re.finditer(r"(?<!\w)" + re.escape(w.lower()), t)]
        if pos:
            hits.append((min(pos), key))
    return [k for _, k in sorted(hits)]


# ---------------------------------------------------------------- facts (shared with the Claude coach)
def facts(twin: Twin, stats: dict, ctx: dict) -> dict:
    """Everything the coach may say, computed by our own models. Nothing else gets quoted."""
    from . import routine
    now = twin.context_now()
    fp = twin.fingerprint()
    b = fp["best_window"]
    apps = [a for a in twin.apps() if a["focus_breaks_per_day"] > 0][:3]
    profile = twin.profile
    dl = routine.deadline_pressure(profile) if profile else None
    moments = routine.check_moments(profile, golden=(b["start"], b["end"]))
    today = date.today()
    week = {(today - timedelta(days=i)).isoformat() for i in range(1, 8)}
    opened_week = [n for n in twin.notifs if n["day"] in week and n["opened"]]
    lost = sum(n["cost_min"] for n in opened_week)
    recs = twin.recommendations(ctx.get("vip") or set())[:3]
    p = routine.merge(profile)
    return dict(
        persona=ctx.get("persona"),
        now=dict(time=fmt_h(now["hour"]), focus_capacity_pct=round(now["focus_capacity"] * 100), fatigue_pct=round(now["fatigue"] * 100),
                 task=now["task"], block=now["block"], night_guard_on=routine.night_guard_active(profile, now["hour"])),
        golden_hours=dict(start=fmt_h(b["start"]), end=fmt_h(b["end"])), fatigue_onset=fmt_h(fp["fatigue_onset"]),
        bed=fmt_h(float(p["bed"])), wake=fmt_h(float(p["wake"])),
        deadline=dl, check_moments=[dict(at=m["at"], reason=m["reason"]) for m in moments],
        top_distractions=[dict(app=a["app"], breaks_per_day=a["focus_breaks_per_day"], cost_per_break_min=a["avg_cost_min"],
                               rabbit_hole_pct=round(a["rabbit_rate"] * 100)) for a in apps],
        last_7_days=dict(pings_opened=len(opened_week), minutes_lost=round(lost), per_day=round(lost / 7)),
        with_parallel=dict(decisions=stats["decisions"], held=stats["held_back"], minutes_protected=stats["minutes_saved"],
                           xp=stats["xp"], level=stats["level"], aura_week=stats.get("aura", {}).get("week"),
                           aura_tier=stats.get("aura", {}).get("tier"), fate_today=stats.get("fate", {}).get("label")),
        held_now=ctx.get("held", 0),
        recommendations=[dict(title=r["title"], minutes_per_day=r["impact_min"], evidence=r["evidence"]) for r in recs],
        learned=dict(days=fp["days_learned"], events=fp["events_learned"]),
        vip_categories=sorted(ctx.get("vip") or []),
    )


def _sim(twin: Twin, cat: str) -> dict:
    """The twin's answer for this ping right now, with the late-night guard applied as the inbox applies it."""
    from . import routine
    from .personas import CATEGORIES
    c = twin.context_now()
    r = twin.simulate(cat, c["hour"], c["depth"], 35, c["fatigue"], c["task"], 600)
    importance = twin.learned_importance.get(cat, CATEGORIES[cat]["importance"])
    if importance < 0.75 and r["recommendation"] != "delay" and routine.night_guard_active(twin.profile, c["hour"]):
        r["recommendation"] = "delay"
        r["why"] = "Late-night guard is on: it's past your wind-down, so this waits for your morning digest."
    return r


FOLLOW = {
    "simulate": ["Why?", "What about YouTube?", "What's waiting in my jar?"],
    "compare": ["Why is that one worse?", "When do I focus best?"],
    "why": ["What should I do right now?", "How accurate are you?"],
    "now": ["Plan my evening", "Am I tired?"],
    "plan": ["What should I do right now?", "How much time did I lose this week?"],
    "deadline": ["Plan my evening", "Which app distracts me most?"],
    "best_time": ["Plan my evening", "Which app distracts me most?"],
    "distraction": ["How do I stop doomscrolling?", "How much time did I lose this week?"],
    "doomscroll": ["What's my aura?", "How does late-night guard work?"],
    "time_lost": ["What do you recommend?", "What's my aura?"],
    "fatigue": ["What should I do right now?", "When do I focus best?"],
    "sleep": ["How much time did I lose this week?", "Plan tomorrow"],
    "stress": ["What should I do right now?", "What's waiting in my jar?"],
    "noisy": ["What's waiting in my jar?", "Draft a reply for later", "Plan my evening"],
    "aura": ["How much time did I lose this week?", "What do you recommend?"],
    "held": ["Should I open this Instagram like?", "Plan my evening"],
    "privacy": ["How does this work?", "What do you know about me?"],
    "method": ["What do you know about me?", "Should I open this YouTube video?"],
    "rules": ["What's waiting in my jar?", "Should I open this Instagram like?"],
    "today": ["What's my aura?", "What do you recommend?"],
    "recommend": ["How much time did I lose this week?", "Plan my evening"],
    "learned": ["How accurate are you?", "What do you recommend?"],
    "greet": ["What should I do right now?", "Should I open this Instagram like?"],
    "thanks": ["Plan my evening", "What's my aura?"],
    "capabilities": ["Should I open this Instagram like?", "What should I do right now?", "How much time did I lose this week?"],
    "help": ["Should I open this Instagram like?", "What should I do right now?", "Which app distracts me most?"],
    "cant_focus": ["Why is it so hard today?", "Show today's receipt", "Make this my routine"],
    "receipt": ["Show my week", "Which app costs me most?", "Plan my evening"],
    "receipt_week": ["Which app costs me most?", "What do you recommend?", "Plan tomorrow"],
    "xray": ["Show today's receipt", "What's waiting in my jar?"],
    "memory": ["How accurate are you?", "Plan my evening"],
    "action": ["What's waiting in my jar?", "Show today's receipt", "Plan my evening"],
}


def answer(twin: Twin, text: str, lang: str, persona: str, stats: dict, vip: set, ctx: dict | None = None) -> dict:
    """Rule engine. `ctx` carries the conversation (history with intent/category), the held count and VIPs.
    Intents outside the original seven answer in English; the Claude coach covers every language."""
    ctx = ctx or {}
    text = text.replace("’", "'").replace("‘", "'")
    lang = lang if lang in LANGS else "en"
    L, E = T[lang], T["en"]
    pline = PERSONA_LINE.get(persona, PERSONA_LINE["developer"])[lang]
    history = ctx.get("history") or []
    last_cat = next((h.get("category") for h in reversed(history) if h.get("category")), None)
    last_intent = next((h.get("intent") for h in reversed(history) if h.get("role") == "twin" and h.get("intent") not in (None, "help")), None)
    cats = detect_all(text, CATEGORY_WORDS)
    cat = cats[0] if cats else None
    intent = detect(text, INTENTS)
    if intent == "why":  # "why am I so tired" is about fatigue, not about a ping
        intent = detect(text, {k: v for k, v in INTENTS.items() if k != "why"}) or "why"
    words = len(text.split())
    if ctx.get("force_intent"):  # slash commands like /plan pick the intent directly
        intent = ctx["force_intent"]
    # follow-ups: "and youtube?" after a simulation, "why?" after anything about a ping
    if len(cats) >= 2 and intent in (None, "compare", "simulate", "distraction"):
        intent = "compare"
    elif cat and intent in (None, "simulate", "today", "now", "greet"):
        intent = "simulate"
    elif not intent and words <= 4 and last_intent and not ctx.get("force_intent"):
        intent = last_intent
    card, used_cat = None, cat

    if intent == "greet":
        c0 = twin.context_now()
        msg = (f"Hey! It's {fmt_h(c0['hour'])}, your focus capacity is around {round(c0['focus_capacity'] * 100)}% and fatigue "
               f"{round(c0['fatigue'] * 100)}%. Ask me about any ping before you tap it, or what to do right now.")
    elif intent == "thanks":
        msg = "Anytime. Go protect that focus. I'll be here when the next ping shows up."
    elif intent == "capabilities":
        msg = ("I'm your attention twin. I can price any notification in focus minutes before you open it, tell you when you focus best, "
               "which app drains you most, what's waiting in your jar, how much time pings cost you this week, and plan your evening "
               "around your schedule.")
    elif intent == "simulate":
        used_cat = cat or last_cat or "social_like"
        r = _sim(twin, used_cat)
        rec = "allow" if used_cat in vip else r["recommendation"]
        msg = L["sim"].format(label=r["label"].lower(), p=round(r["allow"]["p_open"] * 100), cost=r["allow"]["cost_p50"],
                              lo=r["allow"]["cost_p10"], hi=r["allow"]["cost_p90"], d=r["delay"]["cost_expected"],
                              rec=L["rec_words"][rec], why=r["why"] if lang == "en" else "")
        card = dict(type="simulate", category=used_cat)
    elif intent == "compare":
        pair = (cats + [c for c in [last_cat, "video_reco"] if c and c not in cats])[:2]
        rs = sorted((_sim(twin, k) for k in pair), key=lambda r: -r["allow"]["cost_expected"])
        worse, better = rs[0], rs[-1]
        msg = (f"Right now {worse['app']} ({worse['label'].lower()}) is the bigger trap: ~{worse['allow']['cost_expected']} min expected, "
               f"{round(worse['allow']['p_rabbit_hole'] * 100)}% rabbit-hole odds. {better['app']} costs ~{better['allow']['cost_expected']} min. "
               f"If you only open one, open {better['app']}.")
        used_cat = worse["category"]
        card = dict(type="simulate", category=used_cat)
    elif intent == "why":
        used_cat = cat or last_cat
        if not used_cat:
            msg = "Why what? Ask about a specific ping, like 'why hold Instagram?', and I'll show you what's driving it."
        else:
            r = _sim(twin, used_cat)
            if r["why"].startswith("Late-night guard"):
                return dict(reply=r["why"] + " That's a rule, not a guess: switch it off in Settings if you want late pings.", intent="why", lang=lang,
                            card=None, category=used_cat, suggest=FOLLOW["sleep"], source="rules")
            fx = [f for f in r["factors"] if abs(f["effect"]) >= 0.05][:2]
            push = "; ".join(f"{f['factor']} {'pushes you to open it' if f['effect'] > 0 else 'protects you'}" for f in fx) or "nothing unusual about this moment"
            msg = (f"{r['why']} What's driving it right now: {push}. That's from {r['similar_events']} similar moments "
                   f"in your history, so I'm {round(r['confidence'] * 100)}% sure.")
            card = dict(type="simulate", category=used_cat)
    elif intent == "cant_focus":
        today = date.today().isoformat()
        segs = [s for s in twin.segments if s["day"] == today]
        switches = sum(1 for s in segs if s["kind"] == "distraction")
        lost = {}
        for n in twin.notifs:
            if n["day"] == today and n["opened"]:
                k = n["followed_app"] or n["app"] or "other apps"
                lost[k] = lost.get(k, 0) + n["cost_min"]
        top = max(lost.items(), key=lambda kv: kv[1], default=None)
        c0 = twin.context_now()
        msg = (f"Today: {switches} app switches and fatigue around {round(c0['fatigue'] * 100)}%"
               + (f"; {top[0]} alone cost you ~{round(top[1])} min" if top else "")
               + ". Don't try to fix the whole day: one 25-minute block with pings held, then reassess. Your plan for the rest of today is below.")
    elif intent == "now":
        f = facts(twin, stats, ctx)
        n = f["now"]
        nxt = f["check_moments"][0] if f["check_moments"] else None
        if n["night_guard_on"]:
            msg = (f"It's {n['time']}, past your wind-down. Honestly? Sleep beats anything I could suggest. "
                   "Late-night guard is holding non-urgent pings till morning.")
        elif n["block"]:
            msg = f"You're in {n['block']['label']} until {n['block']['until']}. Stay in it; I'm holding low-value pings until then."
        elif n["fatigue_pct"] > 60:
            msg = (f"Fatigue is ~{n['fatigue_pct']}%. Take a real 10-minute break first, then do something light. "
                   f"Save hard work for {f['golden_hours']['start']}.")
        elif n["focus_capacity_pct"] >= 60:
            msg = f"Good window: focus capacity ~{n['focus_capacity_pct']}%. Start your hardest task now and park your phone face-down."
        else:
            msg = (f"Focus capacity is only ~{n['focus_capacity_pct']}% right now. Do admin, replies or revision; "
                   f"your golden hours start at {f['golden_hours']['start']}.")
        if nxt and not n["night_guard_on"]:
            msg += f" Next check moment: {nxt['at']} ({nxt['reason'].lower()})."
    elif intent == "plan":
        f = facts(twin, stats, ctx)
        parts = [f"Hard work in your golden hours, {f['golden_hours']['start']}–{f['golden_hours']['end']}."]
        if f["check_moments"]:
            parts.append("Check pings at " + ", ".join(m["at"] for m in f["check_moments"][:3]) + ".")
        if f["deadline"]:
            parts.append(f"{f['deadline']['title']} is in {f['deadline']['days_left']} day(s), so I'm holding more than usual.")
        parts.append(f"Lighter tasks after {f['fatigue_onset']}, and wind down by {f['bed']}.")
        msg = " ".join(parts)
        card = dict(type="fingerprint")
    elif intent == "deadline":
        f = facts(twin, stats, ctx)
        if f["deadline"]:
            d = f["deadline"]
            msg = (f"{d['title']} is in {d['days_left']} day(s). I've lowered my hold threshold, so more pings wait until your blocks end. "
                   f"Put revision in {f['golden_hours']['start']}–{f['golden_hours']['end']}.")
        else:
            msg = "You haven't added a deadline. Add your next exam or submission in Settings and I'll get stricter as it gets close."
    elif intent == "best_time":
        fp = twin.fingerprint()
        b = fp["best_window"]
        msg = L["best"].format(s=fmt_h(b["start"]), e=fmt_h(b["end"]), q=round(b["quality"] / max(max(fp["hourly"]), 0.01) * 100), persona=pline)
        card = dict(type="fingerprint")
    elif intent == "distraction":
        a = next((a for a in twin.apps() if a["focus_breaks_per_day"] > 0), None)
        msg = L["distract"].format(app=a["app"], n=a["focus_breaks_per_day"], c=a["avg_cost_min"], pct=round(a["rabbit_rate"] * 100)) if a else E["help"]
        card = dict(type="apps")
    elif intent == "doomscroll":
        from .personas import app_for
        apps = [a for a in twin.apps() if a["focus_breaks_per_day"] > 0 and a["rabbit_rate"] > 0]
        want = app_for(cat, persona) if cat else None
        a = next((a for a in apps if a["app"] == want), apps[0] if apps else None)
        lead = (f"Your data says {a['app']} is the slot machine: {round(a['rabbit_rate'] * 100)}% of quick checks turn into ~{a['avg_cost_min']} min. "
                if a else "")
        msg = (lead + "Don't white-knuckle it. Let me hold its pings until your check moments (they arrive in one batch, so nothing's missed), "
               "keep late-night guard on, and peek through the door before you tap. Batching beats going cold turkey.")
        card = dict(type="apps")
    elif intent == "time_lost":
        f = facts(twin, stats, ctx)
        w = f["last_7_days"]
        msg = (f"Last 7 days: {w['pings_opened']} opened pings cost you about {w['minutes_lost']} focus minutes (~{w['per_day']} a day). "
               f"With me so far you've protected {f['with_parallel']['minutes_protected']} min across {f['with_parallel']['decisions']} decisions.")
        card = dict(type="recommendations")
    elif intent == "fatigue":
        c0 = twin.context_now()
        fp = twin.fingerprint()
        if PATTERN.search(text):  # "why am I so tired every evening" asks about the pattern, not this minute
            from . import routine
            from .copilot import late_nights
            curve = [(h, f) for h, f in enumerate(fp["fatigue_curve"]) if f is not None]
            peak_h, peak_f = max(curve, key=lambda hf: hf[1]) if curve else (fp["fatigue_onset"], 0.5)
            late, _ = late_nights(twin)
            b = fp["best_window"]
            msg = L["fatigue_pattern"].format(
                onset=fmt_h(fp["fatigue_onset"]), peak=fmt_h(peak_h), peak_f=round(peak_f * 100), s=fmt_h(b["start"]), e=fmt_h(b["end"]),
                late=L["late_line"].format(late=late, bed=fmt_h(float(routine.merge(twin.profile)["bed"]))) if late else "")
        else:
            msg = L["fatigue"].format(f=round(c0["fatigue"] * 100), onset=fmt_h(fp["fatigue_onset"]),
                                      advice=L["fatigue_hi"] if c0["fatigue"] > 0.5 else L["fatigue_lo"])
    elif intent == "sleep":
        f = facts(twin, stats, ctx)
        on = f["now"]["night_guard_on"]
        msg = (f"Your bedtime is {f['bed']}. Late-night guard {'is holding pings right now' if on else 'kicks in 30 minutes before that'}: "
               "only VIPs and urgent things get through, the rest wait for your morning digest. Late nights are when your rabbit holes run longest.")
    elif intent == "stress":
        c0 = twin.context_now()
        msg = ("That sounds like a lot. Let's shrink it: hold everything that isn't from your VIPs for the next hour, so it's just you and one task. "
               f"Your fatigue estimate is ~{round(c0['fatigue'] * 100)}%, so a short walk or some water first might help. "
               "And if it's more than a busy day, talk to someone you trust.")
    elif intent == "noisy":
        from .personas import CATEGORIES
        used_cat = cat or "social_dm"
        c = next((c for c in twin.categories() if c["category"] == used_cat), None)
        label = CATEGORIES[used_cat]["label"].lower()
        lead = (f"{label.capitalize()} pings reach you about {c['per_day']} times a day and you open {round(c['open_rate'] * 100)}% of them. "
                if c else "")
        if used_cat in vip:
            msg = lead + f"You marked {label} as a VIP, so I let them through. Want me to hold them for an hour anyway? Just say so."
        else:
            msg = (lead + "You don't have to answer each one. I can hold them until your next check moment and hand you the whole "
                   "thread in one go, or send them to your digest until tonight.")

    elif intent == "aura":
        au, fa = stats.get("aura", {}), stats.get("fate", {})
        msg = (f"Aura this week: {au.get('week', 0)} ({au.get('tier', 'Side quest')}). {au.get('line', '')} "
               f"Today's fate meter: {fa.get('label', 'Plot undecided')}. Holds earn up to +500, cheap on-purpose opens +50, "
               "honest reality checks +100, a confirmed doomscroll −1000.")
    elif intent == "held":
        held = ctx.get("held", 0)
        f = facts(twin, stats, ctx)
        nxt = f["check_moments"][0]["at"] if f["check_moments"] else "your next break"
        msg = (f"{held} ping{'s' if held != 1 else ''} waiting in your jar. They'll come back together at {nxt}, or pour the jar in the inbox any time."
               if held else "Your jar is empty. Nothing is waiting on you.")
    elif intent == "privacy":
        msg = ("I only learn from metadata: which app, what kind of ping, when, and what you decided. I never store message text or window titles. "
               "You can pause learning, export everything or delete it all in Settings.")
    elif intent == "method":
        acc = twin.accuracy()
        imp = round(acc["improvement"] * 100)
        versus = (f"On your history I'm {imp}% better than a generic rule" if imp >= EARLY_EDGE else
                  "On your history so far I'm about level with a generic rule (most of it is still the warm-up I generated from your routine; "
                  "reality checks pull me ahead)")
        msg = ("For each ping I estimate the chance you open it and the chance it turns into a rabbit hole, simulate 2,000 possible futures, "
               f"and compare with what holding costs (from randomized holdouts). {versus}, and {round(acc['interval_coverage'] * 100)}% "
               "of real costs land inside my range.")
        card = dict(type="accuracy")
    elif intent == "rules":
        msg = ("Your rules always win. In Settings or the inbox you can mark people and categories as VIP (always through), "
               "send a category to the digest, or mute it. VIPs I never hold.")
    elif intent == "recommend":
        r = twin.recommendations(vip)[0]
        msg = L["rec"].format(t=r["title"], i=round(r["impact_min"]), ev=r["evidence"])
        card = dict(type="recommendations")
    elif intent == "learned":
        fp = twin.fingerprint()
        acc = twin.accuracy()
        imp = round(acc["improvement"] * 100)
        msg = L["learned" if imp >= EARLY_EDGE else "learned_early"].format(days=fp["days_learned"], n=fp["events_learned"], imp=imp)
        card = dict(type="accuracy")
    elif intent == "today":
        msg = L["today"].format(d=stats["decisions"], m=stats["minutes_saved"], lvl=stats["level"], xp=stats["xp"], persona="")
    else:
        intent = None
        msg = ("I'm best at your attention: try 'should I open this YouTube video?', 'what should I do right now?', "
               "'how much time did I lose this week?' or 'plan my evening'.") if words > 3 else L["help"]
    return dict(reply=msg.strip(), intent=intent or "help", lang=lang, card=card, category=used_cat,
                suggest=FOLLOW.get(intent or "help", FOLLOW["help"]), source="rules")
