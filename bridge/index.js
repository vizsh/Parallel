const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers } = require('@whiskeysockets/baileys');
const pino = require('pino');
const express = require('express');
const path = require('path');
const fs = require('fs');

const PORT = 5195;
const BACKEND_URL = 'http://127.0.0.1:8787/api/whatsapp/incoming';
const SESSION_DIR = path.join(__dirname, 'session');

if (!fs.existsSync(SESSION_DIR)) {
  fs.mkdirSync(SESSION_DIR, { recursive: true });
}

const app = express();
app.use(express.json());

let sock = null;
let isConnected = false;
let currentPairingCode = null;
let lastPhoneRequested = null;
let isStarting = false;

async function startWASocket() {
  if (isStarting) return;
  isStarting = true;

  try {
    const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);

    sock = makeWASocket({
      auth: state,
      logger: pino({ level: 'silent' }),
      printQRInTerminal: false,
      browser: Browsers.ubuntu('Chrome'),
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000,
      keepAliveIntervalMs: 25000,
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect } = update;
      if (connection === 'close') {
        isConnected = false;
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        console.log(`[Bridge] Connection closed (code: ${statusCode}). Reconnecting: ${shouldReconnect}`);
        isStarting = false;
        if (shouldReconnect) {
          setTimeout(startWASocket, 4000);
        }
      } else if (connection === 'open') {
        isConnected = true;
        isStarting = false;
        currentPairingCode = null;
        console.log(`[Bridge] ✅ WhatsApp Bridge connected! User: ${sock.user?.id || 'Unknown'}`);
      }
    });

    // Inbound messages listener
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;
      for (const msg of messages) {
        if (!msg.message || msg.key.fromMe) continue;

        const remoteJid = msg.key.remoteJid;
        if (!remoteJid || remoteJid.includes('@g.us')) continue; // skip groups

        const text =
          msg.message.conversation ||
          msg.message.extendedTextMessage?.text ||
          msg.message.imageMessage?.caption ||
          '';

        if (!text.trim()) continue;

        const senderPhone = '+' + remoteJid.split('@')[0];
        console.log(`[Bridge] 📩 Inbound from ${senderPhone}: "${text}"`);

        try {
          const response = await fetch(BACKEND_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sender: senderPhone, message: text }),
          });

          const data = await response.json();
          if (data.ok && data.reply) {
            console.log(`[Bridge] 📤 Replying to ${senderPhone}: "${data.reply.slice(0, 40)}..."`);
            await sock.sendMessage(remoteJid, { text: data.reply });
          }
        } catch (err) {
          console.error('[Bridge] Error forwarding to FastAPI backend:', err.message);
        }
      }
    });
  } catch (err) {
    console.error('[Bridge] Failed to initialize socket:', err);
    isStarting = false;
    setTimeout(startWASocket, 5000);
  }
}

// Request pairing code endpoint
app.post('/pair-code', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ ok: false, error: 'Phone number is required' });
    }

    const cleanPhone = phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 10) {
      return res.status(400).json({ ok: false, error: 'Invalid phone number format (need country code + number)' });
    }

    if (!sock) {
      return res.status(503).json({ ok: false, error: 'WhatsApp client is still initializing. Please retry in 3 seconds.' });
    }

    if (isConnected) {
      return res.json({ ok: true, connected: true, message: 'Already connected to WhatsApp!' });
    }

    console.log(`[Bridge] Requesting pairing code for: ${cleanPhone}`);
    const code = await sock.requestPairingCode(cleanPhone);
    currentPairingCode = code;
    lastPhoneRequested = cleanPhone;

    console.log(`[Bridge] 🔑 Pairing code generated: ${code}`);
    res.json({ ok: true, code, phone: cleanPhone, connected: false });
  } catch (err) {
    console.error('[Bridge] Error requesting pairing code:', err);
    res.status(500).json({ ok: false, error: err.message || 'Failed to generate pairing code' });
  }
});

// Status check
app.get('/status', (req, res) => {
  res.json({
    ok: true,
    connected: isConnected,
    registered: Boolean(sock?.authState?.creds?.registered),
    user: sock?.user || null,
    lastCode: currentPairingCode,
    lastPhone: lastPhoneRequested,
  });
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`[Bridge] HTTP server listening on http://127.0.0.1:${PORT}`);
  startWASocket();
});
