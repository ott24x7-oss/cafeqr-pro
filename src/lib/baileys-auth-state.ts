/**
 * Prisma-backed replacement for Baileys' `useMultiFileAuthState`.
 *
 * Baileys persists `creds.json` plus a flat tree of small files keyed by
 * `<type>-<id>.json` (pre-keys, sender-keys, app-state-sync, sessions, …).
 * The default helper writes them to disk; we mirror the exact same shape
 * into the `BaileysAuthFile` table so paired WhatsApp sessions survive
 * container restarts (e.g. Railway redeploys, which wipe /tmp).
 *
 * Behaviour matches `useMultiFileAuthState` so swapping it in is a
 * drop-in change inside `baileys-manager.ts`.
 */
import 'server-only';
import {
  initAuthCreds,
  BufferJSON,
  proto,
  type AuthenticationCreds,
  type AuthenticationState,
  type SignalDataTypeMap,
} from '@whiskeysockets/baileys';
import { prisma } from './prisma';

const FILE_CREDS = 'creds.json';

function fileFor(type: string, id: string): string {
  // Match Baileys' on-disk naming so the data is portable in/out.
  return `${type}-${id.replace(/\//g, '__')}.json`;
}

async function writeFile(sessionId: string, file: string, data: any): Promise<void> {
  const blob = JSON.stringify(data, BufferJSON.replacer);
  await prisma.baileysAuthFile.upsert({
    where: { sessionId_file: { sessionId, file } },
    create: { sessionId, file, data: blob },
    update: { data: blob },
  });
}

async function readFile<T = any>(sessionId: string, file: string): Promise<T | null> {
  const row = await prisma.baileysAuthFile.findUnique({
    where: { sessionId_file: { sessionId, file } },
  });
  if (!row) return null;
  try {
    return JSON.parse(row.data, BufferJSON.reviver) as T;
  } catch {
    return null;
  }
}

async function removeFile(sessionId: string, file: string): Promise<void> {
  await prisma.baileysAuthFile.deleteMany({ where: { sessionId, file } });
}

export async function deleteAllAuthFiles(sessionId: string): Promise<void> {
  await prisma.baileysAuthFile.deleteMany({ where: { sessionId } });
}

export async function hasStoredCreds(sessionId: string): Promise<boolean> {
  const c = await prisma.baileysAuthFile.count({
    where: { sessionId, file: FILE_CREDS },
  });
  return c > 0;
}

export async function listSessionsWithCreds(): Promise<string[]> {
  const rows = await prisma.baileysAuthFile.findMany({
    where: { file: FILE_CREDS },
    select: { sessionId: true },
    orderBy: { updatedAt: 'desc' },
  });
  return rows.map((r) => r.sessionId);
}

export async function useDbAuthState(sessionId: string): Promise<{
  state: AuthenticationState;
  saveCreds: () => Promise<void>;
}> {
  const stored = await readFile<AuthenticationCreds>(sessionId, FILE_CREDS);
  const creds: AuthenticationCreds = stored ?? initAuthCreds();

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const out: { [_: string]: SignalDataTypeMap[typeof type] } = {};
          await Promise.all(
            ids.map(async (id) => {
              const value = await readFile<any>(sessionId, fileFor(type, id));
              if (!value) return;
              if (type === 'app-state-sync-key') {
                out[id] = proto.Message.AppStateSyncKeyData.fromObject(value) as any;
              } else {
                out[id] = value as any;
              }
            })
          );
          return out;
        },
        set: async (data) => {
          const tasks: Promise<any>[] = [];
          for (const category of Object.keys(data) as (keyof SignalDataTypeMap)[]) {
            const items = (data as any)[category] as Record<string, any>;
            for (const id of Object.keys(items)) {
              const value = items[id];
              const file = fileFor(category, id);
              if (value) tasks.push(writeFile(sessionId, file, value));
              else tasks.push(removeFile(sessionId, file));
            }
          }
          await Promise.all(tasks);
        },
      },
    },
    saveCreds: async () => {
      await writeFile(sessionId, FILE_CREDS, creds);
    },
  };
}
