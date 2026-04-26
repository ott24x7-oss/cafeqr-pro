'use client';

import { useState } from 'react';
import { Megaphone, Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { toast } from '@/components/ui/toaster';

export function BroadcastCard() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [link, setLink] = useState('');
  const [scope, setScope] = useState<'active' | 'all'>('active');
  const [sending, setSending] = useState(false);

  async function send() {
    if (!title.trim() || title.trim().length < 2) {
      toast.error('Title is required');
      return;
    }
    if (!confirm(`Broadcast to ${scope === 'active' ? 'active + trial' : 'all'} cafes?`)) return;
    setSending(true);
    const r = await fetch('/api/admin/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title.trim(), body: body.trim() || undefined, link: link.trim() || undefined, scope }),
    });
    const data = await r.json().catch(() => ({} as any));
    setSending(false);
    if (r.ok && data.ok) {
      toast.success(`Broadcast sent to ${data.count} cafes`);
      setTitle('');
      setBody('');
      setLink('');
    } else {
      toast.error('Broadcast failed', data.error ?? '');
    }
  }

  return (
    <div className="card-warm">
      <div className="flex items-center gap-2 font-bold text-coffee-900 mb-2">
        <Megaphone className="h-4 w-4" /> Broadcast
      </div>
      <p className="text-xs text-coffee-600 mb-3">
        Drop a notification on every cafe owner's dashboard bell. Useful for downtime
        notices, new feature announcements, or pricing changes.
      </p>
      <div className="space-y-2">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title (e.g. New: WhatsApp auto-invoice live)"
          maxLength={140}
        />
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Optional message body…"
          maxLength={2000}
          className="min-h-[80px]"
        />
        <Input
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="Optional link (e.g. /dashboard/settings)"
          maxLength={500}
        />
        <select
          className="input"
          value={scope}
          onChange={(e) => setScope(e.target.value as 'active' | 'all')}
        >
          <option value="active">Active + trial cafes</option>
          <option value="all">Everyone (incl. suspended)</option>
        </select>
        <Button onClick={send} disabled={sending} className="w-full">
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Send broadcast
        </Button>
      </div>
    </div>
  );
}
