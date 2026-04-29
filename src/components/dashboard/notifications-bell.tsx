'use client';

import { useEffect, useState, useRef } from 'react';
import { Bell, Volume2, VolumeX } from 'lucide-react';
import Link from 'next/link';
import { timeAgo } from '@/lib/utils';

export function NotificationsBell({ cafeId }: { cafeId: string }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);
  const [muted, setMuted] = useState(false);
  const lastIdRef = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YT...');
  }, []);

  useEffect(() => {
    let interval: any;
    async function load() {
      try {
        const r = await fetch(`/api/notifications?cafeId=${cafeId}`, { cache: 'no-store' });
        const data = await r.json();
        if (data?.items) {
          if (lastIdRef.current && data.items[0] && data.items[0].id !== lastIdRef.current && !muted) {
            try { audioRef.current?.play().catch(() => {}); } catch {}
            try {
              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(data.items[0].title, { body: data.items[0].body });
              }
            } catch {}
          }
          if (data.items[0]) lastIdRef.current = data.items[0].id;
          setItems(data.items);
          setUnread(data.items.filter((x: any) => !x.isRead).length);
        }
      } catch {}
    }
    load();
    // 12s feels live enough for restaurant ops (orders aren't placed in
    // sub-second bursts) and halves the per-tab DB load — earlier 6s
    // polls were saturating the Prisma pool during page navigations.
    interval = setInterval(load, 12000);
    return () => clearInterval(interval);
  }, [cafeId, muted]);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  async function markAllRead() {
    await fetch('/api/notifications/read-all', { method: 'POST', body: JSON.stringify({ cafeId }) });
    setUnread(0);
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="relative h-9 w-9 grid place-items-center rounded-full hover:bg-cream-100 text-coffee-700">
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-coffee-100 bg-white shadow-coffee z-40 overflow-hidden">
          <div className="px-4 py-3 border-b border-coffee-100 flex items-center justify-between">
            <div className="font-bold text-coffee-900">Notifications</div>
            <div className="flex items-center gap-2">
              <button onClick={() => setMuted((m) => !m)} className="text-coffee-500 hover:text-coffee-900" title={muted ? 'Unmute' : 'Mute'}>
                {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
              <button onClick={markAllRead} className="text-xs text-coffee-600 hover:text-coffee-900">Mark all read</button>
            </div>
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {items.length === 0 && <div className="p-6 text-sm text-coffee-500 text-center">No notifications yet.</div>}
            {items.map((n) => (
              <Link key={n.id} href={n.link ?? '#'} className="block px-4 py-3 hover:bg-cream-50 border-b border-coffee-50 last:border-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold text-coffee-900 text-sm">{n.title}</div>
                  {!n.isRead && <span className="h-2 w-2 rounded-full bg-coffee-700 mt-1.5 shrink-0" />}
                </div>
                {n.body && <div className="text-xs text-coffee-600 mt-0.5">{n.body}</div>}
                <div className="text-[10px] text-coffee-400 mt-1">{timeAgo(n.createdAt)}</div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
