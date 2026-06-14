import dotenv from 'dotenv';
import http from 'http';
import { fetchAll, buildReport, hasSignificantChange } from './lib/electionData.js';

dotenv.config();

// --- Configuración ---
const PHONE_1 = process.env.PHONE_1 || '+51946769880';
const PHONE_2 = process.env.PHONE_2 || '+51900094969';
const PHONE_3 = process.env.PHONE_3 || '+51991010001';
const PHONE_4 = process.env.PHONE_4 || '+51915392941';
const PHONE_5 = process.env.PHONE_5 || '+51957901605';
const API_KEY_1 = process.env.CALLMEBOT_API_KEY_1 || 'YOUR_API_KEY_1';
const API_KEY_2 = process.env.CALLMEBOT_API_KEY_2 || 'YOUR_API_KEY_2';
const API_KEY_3 = process.env.CALLMEBOT_API_KEY_3 || 'YOUR_API_KEY_3';
const API_KEY_4 = process.env.CALLMEBOT_API_KEY_4 || 'YOUR_API_KEY_4';
const API_KEY_5 = process.env.CALLMEBOT_API_KEY_5 || '3746315';

// Heartbeat de WhatsApp (cada 5 min por defecto). La web se actualiza aparte vía /api/data.
const WHATSAPP_INTERVAL_MIN = parseInt(process.env.INTERVAL_MINUTES || '5', 10);
// Cada cuánto se refresca la data interna (alimenta la web + detección de cambios).
const POLL_SECONDS = parseInt(process.env.POLL_SECONDS || '60', 10);
// Gap mínimo entre envíos por "cambio importante" para no gatillar el límite de CallMeBot.
const MIN_GAP_SECONDS = parseInt(process.env.MIN_GAP_SECONDS || '90', 10);
const PORT = process.env.PORT || 3001;

const recipients = [
  { phone: PHONE_1, key: API_KEY_1 },
  { phone: PHONE_2, key: API_KEY_2 },
  { phone: PHONE_3, key: API_KEY_3 },
  { phone: PHONE_4, key: API_KEY_4 },
  { phone: PHONE_5, key: API_KEY_5 }
].filter(r => r.key && !/^YOUR_API_KEY/.test(r.key));

console.log('=== BOT ELECTORAL PERÚ 2026 (data real, sin simulación) ===');
console.log(`WhatsApp cada ${WHATSAPP_INTERVAL_MIN} min + en cambios importantes | poll de data cada ${POLL_SECONDS}s`);
console.log(`Destinatarios configurados: ${recipients.length}/5`);

// Estado en memoria
let latest = null;       // último snapshot consultado (lo sirve /api/data)
let lastSentSnap = null; // snapshot del último reporte ENVIADO por WhatsApp
let lastSentAt = 0;      // epoch ms del último envío

async function sendWhatsApp(phone, apiKey, text) {
  const cleanPhone = phone.replace('+', '');
  const url = `https://api.callmebot.com/whatsapp.php?phone=${cleanPhone}&text=${encodeURIComponent(text)}&apikey=${apiKey}`;
  try {
    const res = await fetch(url);
    if (res.ok) {
      console.log(`[WhatsApp] Enviado a ${phone}`);
      return true;
    }
    console.error(`[WhatsApp] Error a ${phone}. Status: ${res.status}`);
    return false;
  } catch (err) {
    console.error(`[WhatsApp] Error de red a ${phone}:`, err.message);
    return false;
  }
}

async function broadcast(snapshot) {
  if (recipients.length === 0) {
    console.log('[WhatsApp] Sin API keys configuradas en .env — no se envía.');
    return false;
  }
  const message = buildReport(snapshot);
  console.log('\n[Reporte]:\n' + message + '\n');
  // En serie para no exceder el límite de CallMeBot.
  for (const r of recipients) {
    await sendWhatsApp(r.phone, r.key, message);
  }
  lastSentSnap = snapshot;
  lastSentAt = Date.now();
  return true;
}

// Refresca la data y decide si toca enviar WhatsApp.
async function poll({ forceSend = false } = {}) {
  const snap = await fetchAll();
  latest = snap;

  const now = Date.now();
  const sinceSent = (now - lastSentAt) / 1000;
  const heartbeatDue = sinceSent >= WHATSAPP_INTERVAL_MIN * 60;
  const changed = hasSignificantChange(lastSentSnap, snap) && sinceSent >= MIN_GAP_SECONDS;

  if (forceSend || heartbeatDue || changed) {
    const reason = forceSend ? 'manual' : heartbeatDue ? 'heartbeat 5min' : 'cambio importante';
    console.log(`[${new Date().toLocaleTimeString('es-PE')}] Enviando WhatsApp (${reason})`);
    await broadcast(snap);
  } else {
    const o = snap.onpe;
    console.log(`[${new Date().toLocaleTimeString('es-PE')}] Data actualizada${o ? ` — ONPE ${o.actasContabilizadas}% actas, líder ${o.lider?.candidato}` : ' — ONPE no disponible'} (sin envío)`);
  }
  return snap;
}

// --- Servidor HTTP: /api/data (para la web) y /api/trigger (botón manual) ---
const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

  const url = (req.url || '').split('?')[0];

  if (url === '/api/data') {
    // Sirve el último snapshot; si está viejo (> POLL_SECONDS), refresca al vuelo.
    try {
      if (!latest || (Date.now() - latest.timestamp) / 1000 > POLL_SECONDS) {
        latest = await fetchAll();
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(latest));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  if (url === '/api/trigger' && (req.method === 'GET' || req.method === 'POST')) {
    console.log('[API] Envío manual solicitado desde la web.');
    try {
      const snap = await poll({ forceSend: true });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: 'Reporte enviado.', data: snap }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ success: false, message: 'Endpoint no encontrado' }));
});

// El servidor HTTP es opcional (solo alimenta la web). Si el puerto está ocupado,
// avisamos pero NO tumbamos el bot: el envío de WhatsApp debe seguir funcionando.
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.warn(`[Servidor] Puerto ${PORT} ocupado — la web no tendrá /api/data, pero WhatsApp seguirá enviando.`);
  } else {
    console.error('[Servidor] Error:', err.message);
  }
});
server.listen(PORT, () => console.log(`[Servidor] http://localhost:${PORT}  (GET /api/data, POST /api/trigger)`));

// Arranque: primer reporte inmediato + loop de polling.
poll({ forceSend: true }).catch(e => console.error('[poll inicial]', e.message));
setInterval(() => poll().catch(e => console.error('[poll]', e.message)), POLL_SECONDS * 1000);
