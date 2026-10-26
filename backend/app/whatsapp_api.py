"""Parallel — WhatsApp API Endpoints.

Provides endpoints for:
- Fetching the End-of-Day Attention Mirror debrief (JSON & WhatsApp markdown)
- Inbound WhatsApp webhook (for Baileys bridge, Meta Cloud API, or Twilio)
- Pairing phone numbers with accounts
- Triggering the daily 8 PM debrief broadcast
"""

from __future__ import annotations

from contextlib import closing
from typing import Optional

from fastapi import APIRouter, Depends, Form, HTTPException, Request
from pydantic import BaseModel

from .main import current_user, db
from .whatsapp_debrief import (
    ensure_whatsapp_schema,
    format_whatsapp_mirror,
    generate_attention_mirror,
    process_whatsapp_message,
)

router = APIRouter(prefix="/api/whatsapp", tags=["whatsapp"])


class IncomingPayload(BaseModel):
    sender: Optional[str] = "+919876543210"
    message: Optional[str] = "summary"
    phone: Optional[str] = None
    text: Optional[str] = None


class PairPayload(BaseModel):
    phone: str


@router.get("/debrief")
def get_attention_mirror(u=Depends(current_user)):
    """Fetch the Attention Mirror debrief for the authenticated user."""
    mirror_data = generate_attention_mirror(u)
    whatsapp_text = format_whatsapp_mirror(mirror_data)
    return {
        "ok": True,
        "data": mirror_data,
        "formatted_text": whatsapp_text
    }


@router.post("/incoming")
async def incoming_webhook(request: Request):
    """Universal incoming webhook that handles JSON payloads (Baileys/Meta) and Form data (Twilio)."""
    phone = "+919876543210"
    message_text = "summary"

    content_type = request.headers.get("content-type", "")
    if "application/json" in content_type:
        try:
            body = await request.json()
            phone = body.get("phone") or body.get("sender") or body.get("from") or phone
            message_text = body.get("text") or body.get("message") or body.get("body") or message_text
        except Exception:
            pass
    elif "application/x-www-form-urlencoded" in content_type:
        form = await request.form()
        phone = form.get("From") or form.get("sender") or phone
        message_text = form.get("Body") or form.get("message") or message_text

    phone = str(phone).replace("whatsapp:", "").strip()
    reply = process_whatsapp_message(phone, str(message_text))
    return {
        "ok": True,
        "sender": phone,
        "reply": reply
    }


@router.post("/pair")
def pair_phone(body: PairPayload, u=Depends(current_user)):
    """Pairs the user's account with their WhatsApp phone number."""
    phone = body.phone.strip()
    if not phone:
        raise HTTPException(400, "Phone number is required")
    with closing(db()) as c:
        ensure_whatsapp_schema(c)
        c.execute("INSERT OR REPLACE INTO whatsapp_sessions(phone, user_id, paired_at, last_active) VALUES(?,?,?,?)",
                  (phone, u["id"], 0, 0))
        c.commit()
    return {"ok": True, "phone": phone, "paired_with": u["email"]}


@router.get("/status")
def whatsapp_status(u=Depends(current_user)):
    """Check WhatsApp integration status and linked numbers for the user."""
    with closing(db()) as c:
        ensure_whatsapp_schema(c)
        row = c.execute("SELECT * FROM whatsapp_sessions WHERE user_id=?", (u["id"],)).fetchone()
        recent_logs = [dict(r) for r in c.execute("SELECT * FROM whatsapp_logs ORDER BY ts DESC LIMIT 10").fetchall()]
    return {
        "ok": True,
        "linked": bool(row),
        "phone": row["phone"] if row else None,
        "recent_logs": recent_logs
    }


BRIDGE_URL = "http://127.0.0.1:5195"


@router.post("/bridge/pair-code")
async def get_bridge_pair_code(body: dict, u=Depends(current_user)):
    """Requests an 8-character pairing code from the Baileys WhatsApp client."""
    import httpx
    import time
    phone = body.get("phone", "")
    if not phone:
        raise HTTPException(400, "Phone number is required")

    with closing(db()) as c:
        ensure_whatsapp_schema(c)
        c.execute("INSERT OR REPLACE INTO whatsapp_sessions(phone, user_id, paired_at, last_active) VALUES(?,?,?,?)",
                  (phone, u["id"], time.time(), time.time()))
        c.commit()

    async with httpx.AsyncClient() as client:
        try:
            res = await client.post(f"{BRIDGE_URL}/pair-code", json={"phone": phone}, timeout=25.0)
            return res.json()
        except Exception as e:
            raise HTTPException(502, f"Bridge communication error: {e}")


@router.get("/bridge/status")
async def get_bridge_status():
    """Checks if the Baileys WhatsApp bridge is running and connected."""
    import httpx
    async with httpx.AsyncClient() as client:
        try:
            res = await client.get(f"{BRIDGE_URL}/status", timeout=5.0)
            return res.json()
        except Exception as e:
            return {"ok": False, "connected": False, "error": f"Bridge offline: {e}"}
