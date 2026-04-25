'use client';

import { create } from 'zustand';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

type ToastKind = 'success' | 'error' | 'info';
interface Toast {
  id: string;
  kind: ToastKind;
  title: string;
  body?: string;
}
interface ToastStore {
  items: Toast[];
  push: (t: Omit<Toast, 'id'>) => void;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  items: [],
  push: (t) => {
    const id = Math.random().toString(36).slice(2);
    set((s) => ({ items: [...s.items, { ...t, id }] }));
    setTimeout(() => set((s) => ({ items: s.items.filter((x) => x.id !== id) })), 4000);
  },
  dismiss: (id) => set((s) => ({ items: s.items.filter((x) => x.id !== id) })),
}));

export const toast = {
  success: (title: string, body?: string) => useToastStore.getState().push({ kind: 'success', title, body }),
  error: (title: string, body?: string) => useToastStore.getState().push({ kind: 'error', title, body }),
  info: (title: string, body?: string) => useToastStore.getState().push({ kind: 'info', title, body }),
};

export function Toaster() {
  const { items, dismiss } = useToastStore();
  const Icon = (k: ToastKind) => (k === 'success' ? CheckCircle2 : k === 'error' ? AlertCircle : Info);
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[200] flex w-[min(360px,calc(100vw-32px))] flex-col gap-2">
      {items.map((t) => {
        const I = Icon(t.kind);
        const tone =
          t.kind === 'success'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
            : t.kind === 'error'
            ? 'border-rose-200 bg-rose-50 text-rose-900'
            : 'border-coffee-200 bg-white text-coffee-900';
        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 rounded-xl border p-3.5 shadow-coffee animate-fade-up ${tone}`}
          >
            <I className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="flex-1">
              <div className="text-sm font-semibold">{t.title}</div>
              {t.body && <div className="text-xs opacity-80">{t.body}</div>}
            </div>
            <button onClick={() => dismiss(t.id)} className="opacity-60 hover:opacity-100">
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
