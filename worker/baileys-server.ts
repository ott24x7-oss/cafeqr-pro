/**
 * CafeQR Pro — Baileys WhatsApp worker (scaffold).
 *
 * Standalone HTTP service that hosts one or many Baileys sockets and exposes:
 *   GET  /qr?session=<id>     — returns the pairing QR (PNG/SVG) until paired
 *   GET  /status?session=<id> — { connected, phone, sessionId }
 *   POST /send                — { sessionId, to, message } body
 *
 * Deploy as a separate Railway service:
 *   1. New service → same repo → start command:
 *        npx tsx worker/baileys-server.ts
 *   2. Set BAILEYS_WORKER_TOKEN to a random secret (used as Bearer auth).
 *   3. In the main app's env, set:
 *        BAILEYS_WORKER_URL=https://<this-service>.up.railway.app
 *        BAILEYS_WORKER_TOKEN=<same secret>
 *   4. Add a Railway *volume* mounted at /data so auth state survives restarts.
 *
 * NOTE: This is a scaffold. To finish:
 *   - npm i @whiskeysockets/baileys qrcode
 *   - implement multi-session manager keyed by sessionId
 *   - persist auth state via useMultiFileAuthState('/data/<sessionId>')
 *   - on disconnect with reason !== loggedOut, auto-reconnect
 *
 * The main app already calls this worker via `BAILEYS_WORKER_URL` in
 * src/lib/whatsapp.ts → sendMessage() when provider === 'baileys'.
 */
import http from 'http';
import { URL } from 'url';

const PORT = Number(process.env.PORT ?? 3050);
const TOKEN = process.env.BAILEYS_WORKER_TOKEN;

function checkAuth(req: http.IncomingMessage): boolean {
  if (!TOKEN) return true; // no auth configured
  const h = req.headers.authorization ?? '';
  return h === `Bearer ${TOKEN}`;
}

function readBody(req: http.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); }
      catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);

  if (!checkAuth(req)) {
    res.writeHead(401, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'unauthorized' }));
    return;
  }

  if (url.pathname === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (url.pathname === '/qr' && req.method === 'GET') {
    // TODO: serve current QR for the session as PNG.
    res.writeHead(501, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'not implemented — see worker/baileys-server.ts comments' }));
    return;
  }

  if (url.pathname === '/status' && req.method === 'GET') {
    res.writeHead(501, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'not implemented' }));
    return;
  }

  if (url.pathname === '/send' && req.method === 'POST') {
    try {
      const body = await readBody(req);
      const { sessionId, to, message } = body || {};
      if (!to || !message) {
        res.writeHead(400, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: 'to/message required' }));
        return;
      }
      // TODO: forward to the Baileys socket for `sessionId`.
      console.log('[baileys] would send', { sessionId, to, len: message.length });
      res.writeHead(501, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'baileys send not implemented' }));
    } catch (e: any) {
      res.writeHead(500, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: e?.message ?? 'send failed' }));
    }
    return;
  }

  res.writeHead(404, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ error: 'not found' }));
});

server.listen(PORT, () => {
  console.log(`[baileys] scaffold listening on :${PORT} — implement Baileys integration before use`);
});
