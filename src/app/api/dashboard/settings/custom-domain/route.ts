/**
 * Cafe owner submits / clears a custom-domain request.
 *
 *   POST { domain: 'menu.cafe-dk.com' }   → saves with status='pending'
 *   POST { domain: '' } or DELETE         → clears the request
 *
 * Validation:
 *   - hostname only (no scheme, no path, lowercase, ≤253 chars)
 *   - basic label regex per RFC 1035 — anything weird is rejected so we
 *     don't end up with quoted spaces or junk in the unique index
 *   - reserved hostnames (our own primary domain, localhost, IPs) blocked
 *   - uniqueness enforced by the DB; we map the Prisma error to a 409
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOwnerCafe } from '@/lib/guards';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const HOST_RE = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;
const RESERVED = new Set([
  'cafe.watshop.in',
  'watshop.in',
  'www.watshop.in',
  'localhost',
]);

function normalize(input: string): string {
  let h = input.trim().toLowerCase();
  // strip scheme + trailing slash if the user pasted a URL
  h = h.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  // drop port if any
  h = h.split(':')[0];
  return h;
}

export async function POST(req: Request) {
  const { cafe } = await getOwnerCafe();
  if (!cafe) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: { domain?: string } = {};
  try { body = await req.json(); } catch {}

  const raw = (body.domain ?? '').toString();
  // Empty value clears the request — same as DELETE.
  if (!raw.trim()) {
    await prisma.cafe.update({
      where: { id: cafe.id },
      data: {
        customDomain: null,
        customDomainStatus: null,
        customDomainNote: null,
        customDomainRequestedAt: null,
        customDomainVerifiedAt: null,
      },
    });
    return NextResponse.json({ ok: true, cleared: true });
  }

  const host = normalize(raw);
  if (!HOST_RE.test(host)) {
    return NextResponse.json({ error: 'Enter a valid hostname like menu.your-cafe.com' }, { status: 400 });
  }
  if (RESERVED.has(host)) {
    return NextResponse.json({ error: 'That hostname is reserved' }, { status: 400 });
  }
  // Block /\d+\./ apex-IP-style entries.
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    return NextResponse.json({ error: 'Use a hostname, not an IP address' }, { status: 400 });
  }

  try {
    await prisma.cafe.update({
      where: { id: cafe.id },
      data: {
        customDomain: host,
        customDomainStatus: 'pending',
        customDomainNote: null,
        customDomainRequestedAt: new Date(),
        customDomainVerifiedAt: null,
      },
    });
  } catch (e: any) {
    if (e?.code === 'P2002') {
      return NextResponse.json({ error: 'Another cafe has already claimed that domain' }, { status: 409 });
    }
    return NextResponse.json({ error: e?.message ?? 'Failed to save' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, host, status: 'pending' });
}

export async function DELETE() {
  const { cafe } = await getOwnerCafe();
  if (!cafe) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  await prisma.cafe.update({
    where: { id: cafe.id },
    data: {
      customDomain: null,
      customDomainStatus: null,
      customDomainNote: null,
      customDomainRequestedAt: null,
      customDomainVerifiedAt: null,
    },
  });
  return NextResponse.json({ ok: true });
}
