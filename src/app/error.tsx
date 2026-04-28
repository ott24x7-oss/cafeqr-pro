'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Copy, Check, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Global error boundary. In production Next.js scrubs the message and
 * leaves only `error.digest` — that digest is logged on the server with
 * the matching stack trace, so showing it on the page lets a user paste
 * it back to support and we can grep server logs for the real cause.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [showDetail, setShowDetail] = useState(false);
  const [copied, setCopied] = useState(false);

  // Always log on the client so chrome://inspect / browser DevTools see
  // the underlying object even though the page text is scrubbed.
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('App error boundary:', error);
  }, [error]);

  const detail = [
    error?.name && `name: ${error.name}`,
    error?.digest && `digest: ${error.digest}`,
    error?.message && `message: ${error.message}`,
    typeof window !== 'undefined' && `path: ${window.location.pathname}`,
  ]
    .filter(Boolean)
    .join('\n');

  async function copyDetail() {
    try {
      await navigator.clipboard.writeText(detail);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Fallback for WebViews that don't have clipboard permission.
      const ta = document.createElement('textarea');
      ta.value = detail;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      } finally {
        document.body.removeChild(ta);
      }
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-cream-50 p-6">
      <div className="text-center max-w-md w-full">
        <div className="mx-auto h-16 w-16 rounded-2xl bg-rose-100 grid place-items-center text-rose-600">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <h1 className="font-display text-3xl font-bold text-coffee-900 mt-5">Something brewed wrong</h1>
        <p className="text-coffee-600 mt-2 text-sm">
          {error?.message
            ? error.message
            : 'An error occurred while rendering this page. Pull-to-refresh, or share the diagnostics below with support.'}
        </p>
        <div className="mt-6 flex justify-center gap-3 flex-wrap">
          <Button onClick={reset}>Try again</Button>
          <Link href="/">
            <Button variant="outline">Home</Button>
          </Link>
        </div>

        {/* Diagnostics — surfaced so the user can paste them back. The
            production error.message is intentionally generic, but the
            digest is enough to locate the matching server-side log line. */}
        <div className="mt-8 text-left">
          <button
            type="button"
            onClick={() => setShowDetail((v) => !v)}
            className="text-xs text-coffee-700 hover:text-coffee-900 inline-flex items-center gap-1 font-medium"
          >
            <ChevronDown className={`h-3 w-3 transition ${showDetail ? 'rotate-180' : ''}`} />
            Diagnostics
          </button>
          {showDetail && (
            <div className="mt-2 rounded-xl border border-coffee-100 bg-white p-3">
              <pre className="text-[11px] text-coffee-700 whitespace-pre-wrap break-all font-mono">
                {detail || '(no error details available)'}
              </pre>
              <button
                type="button"
                onClick={copyDetail}
                className="mt-2 inline-flex items-center gap-1 text-xs text-coffee-700 hover:text-coffee-900"
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
