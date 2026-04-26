/**
 * In-process Baileys session manager.
 *
 * Auth state is persisted to PostgreSQL via `useDbAuthState` so paired
 * WhatsApp sessions survive container restarts and Railway redeploys.
 * Hydration on Node boot is wired up in `instrumentation.ts` — we call
 * `hydrateAllSessions()` there so the moment a deploy lands, every
 * previously-paired cafe reconnects without anyone clicking anything.
 */
import 'server-only';
import {
  default as makeWASocket,
  DisconnectReason,
  fetchLatestBaileysVersion,
  type WASocket,
} from '@whiskeysockets/baileys';
import qrcode from 'qrcode';
import pino from 'pino';
import {
  useDbAuthState,
  hasStoredCreds,
  deleteAllAuthFiles,
  listSessionsWithCreds,
} from './baileys-auth-state';

type ConnState = 'idle' | 'connecting' | 'qr' | 'open' | 'close';

interface SessionState {
  id: string;
  sock: WASocket | null;
  state: ConnState;
  qrDataUrl: string | null;
  phone: string | null;
  lastError: string | null;
  startedAt: number;
  reconnectTimer: NodeJS.Timeout | null;
}

const G = globalThis as any;
const sessions: Map<string, SessionState> = G.__cafeqr_baileys_sessions ??= new Map();
const log: pino.Logger = G.__cafeqr_baileys_log ??= pino({ level: process.env.BAILEYS_LOG_LEVEL || 'info' });

function emptySession(id: string): SessionState {
  return {
    id, sock: null, state: 'idle', qrDataUrl: null, phone: null,
    lastError: null, startedAt: Date.now(), reconnectTimer: null,
  };
}

async function setQr(sess: SessionState, qr: string | null) {
  sess.qrDataUrl = qr ? await qrcode.toDataURL(qr, { width: 300, margin: 1 }) : null;
}

export async function startSession(id: string, opts?: { force?: boolean }): Promise<SessionState> {
  if (opts?.force) {
    await logoutSession(id);
  }

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
  sess.startedAt = Date.now();

  try {
    const { state, saveCreds } = await useDbAuthState(id);

    let version: any = undefined;
    try { ({ version } = await fetchLatestBaileysVersion()); } catch (e: any) {
      log.warn({ err: e?.message }, 'fetchLatestBaileysVersion failed — using bundled version');
    }

    const sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      browser: ['CafeQR Pro', 'Chrome', '1.0'],
      syncFullHistory: false,
      markOnlineOnConnect: false,
      logger: log.child({ scope: 'baileys', id }) as any,
    });

    sess.sock = sock;

    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', async (u: any) => {
      const { connection, lastDisconnect, qr } = u;
      if (qr) {
        sess!.state = 'qr';
        await setQr(sess!, qr);
        log.info({ id, len: qr.length }, 'baileys: qr received');
      }
      if (connection === 'open') {
        sess!.state = 'open';
        await setQr(sess!, null);
        sess!.phone = sock.user?.id?.split(':')[0]?.split('@')[0] ?? null;
        sess!.lastError = null;
        log.info({ id, phone: sess!.phone }, 'baileys: connected');
      }
      if (connection === 'close') {
        const code = (lastDisconnect?.error as any)?.output?.statusCode;
        sess!.state = 'close';
        sess!.lastError = lastDisconnect?.error?.message ?? null;
        log.warn({ id, code, err: sess!.lastError }, 'baileys: connection closed');

        const loggedOut = code === DisconnectReason.loggedOut;
        if (loggedOut) {
          await deleteAllAuthFiles(id).catch(() => {});
          sess!.phone = null;
          await setQr(sess!, null);
          sessions.delete(id);
          return;
        }
        // Auto-reconnect with small jitter for any other close.
        if (sess!.reconnectTimer) clearTimeout(sess!.reconnectTimer);
        const delay = 3000 + Math.random() * 4000;
        sess!.reconnectTimer = setTimeout(() => {
          startSession(id).catch((e) => log.error({ id, err: e?.message }, 'reconnect failed'));
        }, delay);
      }
    });

    // Allow first QR / immediate-open event to fire before returning.
    await new Promise((r) => setTimeout(r, 1200));
  } catch (e: any) {
    sess.state = 'close';
    sess.lastError = e?.message ?? String(e);
    log.error({ id, err: sess.lastError }, 'startSession failed');
  }

  return sess;
}

export function getSession(id: string): SessionState | null {
  return sessions.get(id) ?? null;
}

export async function logoutSession(id: string): Promise<boolean> {
  const sess = sessions.get(id);
  if (sess?.sock) {
    try { await sess.sock.logout(); } catch {}
    try { sess.sock.end(undefined); } catch {}
  }
  if (sess?.reconnectTimer) clearTimeout(sess.reconnectTimer);
  await deleteAllAuthFiles(id).catch(() => {});
  sessions.delete(id);
  return true;
}

export async function sendBaileysInProcess(opts: {
  sessionId?: string;
  to: string;
  message: string;
  imageUrl?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const id = opts.sessionId || 'default';
  let sess = sessions.get(id);
  // Auto-resume if creds exist in the DB but we haven't booted this session
  // yet (e.g. immediately after a deploy, before instrumentation finished).
  if (!sess && (await hasStoredCreds(id))) {
    sess = await startSession(id);
    const t0 = Date.now();
    while (sess.state !== 'open' && Date.now() - t0 < 8000) {
      await new Promise((r) => setTimeout(r, 250));
      sess = sessions.get(id) ?? sess;
    }
  }
  if (!sess || sess.state !== 'open' || !sess.sock) {
    return { ok: false, error: sess?.lastError ?? 'Baileys session not connected' };
  }
  const jid = `${opts.to.replace(/\D/g, '')}@s.whatsapp.net`;
  try {
    if (opts.imageUrl) {
      await sess.sock.sendMessage(jid, {
        image: { url: opts.imageUrl },
        caption: opts.message,
      });
    } else {
      await sess.sock.sendMessage(jid, { text: opts.message });
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'baileys send failed' };
  }
}

export function publicSession(sess: SessionState | null) {
  if (!sess) return { state: 'idle' as const, qrDataUrl: null, phone: null, error: null, ageMs: 0 };
  return {
    state: sess.state,
    qrDataUrl: sess.qrDataUrl,
    phone: sess.phone,
    error: sess.lastError,
    ageMs: Date.now() - sess.startedAt,
  };
}

/** Boot-time: re-open every previously paired session. Idempotent. */
export async function hydrateAllSessions(): Promise<{ count: number }> {
  if (G.__cafeqr_baileys_hydrated) return { count: 0 };
  G.__cafeqr_baileys_hydrated = true;
  try {
    const ids = await listSessionsWithCreds();
    if (ids.length === 0) {
      log.info('baileys: nothing to hydrate (no stored sessions)');
      return { count: 0 };
    }
    log.info({ count: ids.length }, 'baileys: hydrating saved sessions');
    // Kick them off in parallel — Baileys only needs a brief moment to settle.
    await Promise.all(
      ids.map((id) => startSession(id).catch((e) => log.error({ id, err: e?.message }, 'hydrate failed')))
    );
    return { count: ids.length };
  } catch (e: any) {
    log.error({ err: e?.message }, 'hydrateAllSessions failed');
    return { count: 0 };
  }
}
