/**
 * In-process Baileys session manager.
 *
 * Keeps WhatsApp-Web sockets alive across HTTP requests by living on
 * `globalThis`. Works under `next start` (long-running Node) — does NOT work
 * on serverless platforms.
 *
 * Auth state is persisted to /tmp/cafeqr-baileys/<sessionId>/. Container
 * restarts wipe this dir and require re-pairing. To survive restarts on
 * Railway, mount a persistent volume at that path.
 *
 * The dashboard exposes pair/logout/status routes under
 * /api/dashboard/wa/baileys/*. The send path is wired into lib/whatsapp.ts
 * via `sendBaileysInProcess()`.
 */
import 'server-only';
import path from 'path';
import fs from 'fs';
import os from 'os';
import qrcode from 'qrcode';

type ConnState = 'idle' | 'connecting' | 'qr' | 'open' | 'close';

interface SessionState {
  id: string;
  socket: any | null;
  state: ConnState;
  qrText: string | null;
  qrDataUrl: string | null;
  phone: string | null;
  lastError: string | null;
  reconnectTimer: NodeJS.Timeout | null;
  startedAt: number;
}

const ROOT = path.join(os.tmpdir(), 'cafeqr-baileys');
try { fs.mkdirSync(ROOT, { recursive: true }); } catch {}

const G = globalThis as any;
const sessions: Map<string, SessionState> = G.__cafeqr_baileys_sessions ??= new Map();

function dirFor(id: string) {
  return path.join(ROOT, id.replace(/[^A-Za-z0-9_-]/g, '_'));
}

function emptySession(id: string): SessionState {
  return {
    id, socket: null, state: 'idle', qrText: null, qrDataUrl: null,
    phone: null, lastError: null, reconnectTimer: null, startedAt: Date.now(),
  };
}

async function setQr(sess: SessionState, qr: string | null) {
  sess.qrText = qr;
  sess.qrDataUrl = qr ? await qrcode.toDataURL(qr, { width: 300, margin: 1 }) : null;
}

async function ensureBaileys(): Promise<any> {
  // Lazy import — Baileys is heavy and we don't want it loaded for unrelated routes.
  const mod = await import('@whiskeysockets/baileys');
  return (mod as any).default ? (mod as any) : mod;
}

export async function startSession(id: string): Promise<SessionState> {
  let sess = sessions.get(id);
  if (sess && (sess.state === 'open' || sess.state === 'connecting' || sess.state === 'qr')) {
    return sess;
  }
  if (!sess) {
    sess = emptySession(id);
    sessions.set(id, sess);
  }
  sess.state = 'connecting';
  sess.lastError = null;

  let baileys: any;
  try {
    baileys = await ensureBaileys();
  } catch (e: any) {
    sess.state = 'close';
    sess.lastError = `Baileys not installed: ${e?.message ?? e}`;
    return sess;
  }

  const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers, fetchLatestBaileysVersion } =
    baileys.default ? baileys.default : baileys;

  const dir = dirFor(id);
  fs.mkdirSync(dir, { recursive: true });
  const { state, saveCreds } = await useMultiFileAuthState(dir);

  let version: any;
  try { ({ version } = await fetchLatestBaileysVersion()); } catch { /* fallback to bundled */ }

  const pino = (await import('pino')).default;
  const logger = pino({ level: 'silent' });

  const sock = makeWASocket({
    auth: state,
    version,
    printQRInTerminal: false,
    browser: Browsers.appropriate('CafeQR Pro'),
    syncFullHistory: false,
    markOnlineOnConnect: false,
    logger,
  });

  sess.socket = sock;

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (u: any) => {
    if (u.qr) {
      sess.state = 'qr';
      await setQr(sess, u.qr);
    }
    if (u.connection === 'open') {
      sess.state = 'open';
      await setQr(sess, null);
      sess.phone = sock.user?.id?.split(':')[0] ?? null;
      sess.lastError = null;
    }
    if (u.connection === 'close') {
      sess.state = 'close';
      const code = (u.lastDisconnect?.error as any)?.output?.statusCode;
      sess.lastError = u.lastDisconnect?.error?.message ?? null;
      const loggedOut = code === DisconnectReason.loggedOut;
      if (loggedOut) {
        try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
        sess.phone = null;
        await setQr(sess, null);
        sessions.delete(id);
        return;
      }
      // Auto-reconnect with a small backoff, but only if the session wasn't
      // explicitly logged out.
      if (sess.reconnectTimer) clearTimeout(sess.reconnectTimer);
      sess.reconnectTimer = setTimeout(() => {
        startSession(id).catch(() => {});
      }, 2500);
    }
  });

  return sess;
}

export function getSession(id: string): SessionState | null {
  return sessions.get(id) ?? null;
}

export async function logoutSession(id: string): Promise<boolean> {
  const sess = sessions.get(id);
  if (!sess) return false;
  try { await sess.socket?.logout(); } catch {}
  try { fs.rmSync(dirFor(id), { recursive: true, force: true }); } catch {}
  if (sess.reconnectTimer) clearTimeout(sess.reconnectTimer);
  sessions.delete(id);
  return true;
}

export async function sendBaileysInProcess(opts: { sessionId?: string; to: string; message: string }): Promise<{ ok: boolean; error?: string }> {
  const id = opts.sessionId || 'default';
  let sess = sessions.get(id);
  // Auto-resume if a saved auth state exists on disk and we haven't started.
  if (!sess && fs.existsSync(dirFor(id))) {
    sess = await startSession(id);
    // Wait briefly for the socket to come up.
    const t0 = Date.now();
    while (sess.state !== 'open' && Date.now() - t0 < 6000) {
      await new Promise((r) => setTimeout(r, 200));
      sess = sessions.get(id) ?? sess;
    }
  }
  if (!sess || sess.state !== 'open' || !sess.socket) {
    return { ok: false, error: sess?.lastError ?? 'Baileys session not connected' };
  }
  const jid = `${opts.to.replace(/\D/g, '')}@s.whatsapp.net`;
  try {
    await sess.socket.sendMessage(jid, { text: opts.message });
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'baileys send failed' };
  }
}

export function publicSession(sess: SessionState | null) {
  if (!sess) return { state: 'idle' as const, qrDataUrl: null, phone: null, error: null };
  return {
    state: sess.state,
    qrDataUrl: sess.qrDataUrl,
    phone: sess.phone,
    error: sess.lastError,
  };
}
