/**
 * Multi-tenant host routing. When a request lands on a verified custom
 * domain (e.g. menu.cafe-dk.com), rewrite it to /cafe/<slug>/<path> so the
 * existing slug-based pages serve the response. Primary host (cafe.watshop.in,
 * Railway preview URLs, localhost) passes through untouched.
 *
 * Runtime: Edge — Prisma can't run here, so we call /api/internal/host-resolve
 * via Next's cached fetch (60s revalidate) for the hostname → slug lookup.
 */
import { NextResponse, type NextRequest } from 'next/server';

// Hosts we own — never rewrite these.
const PRIMARY_HOSTS = new Set([
  'cafe.watshop.in',
  'watshop.in',
  'www.watshop.in',
  'localhost',
]);

// Path prefixes that should ALWAYS pass through unchanged, regardless of
// host. We don't want /api/* or /_next/* to ever get rewritten under /cafe/<slug>.
const PASSTHROUGH_PREFIXES = [
  '/api/',
  '/_next/',
  '/admin',
  '/dashboard',
  '/login',
  '/register',
  '/signup',
  '/super-admin',
];

function isPassthroughPath(pathname: string): boolean {
  if (pathname === '/' || pathname === '/favicon.ico' || pathname === '/robots.txt' || pathname === '/sitemap.xml') {
    // root stays as-is on the primary host; on a custom domain we rewrite below
    return false;
  }
  return PASSTHROUGH_PREFIXES.some((p) => pathname === p || pathname.startsWith(p));
}

function isPrimaryHost(host: string): boolean {
  if (PRIMARY_HOSTS.has(host)) return true;
  // Strip port, check again
  const bare = host.split(':')[0];
  if (PRIMARY_HOSTS.has(bare)) return true;
  // Railway preview / production domains — don't rewrite those.
  if (bare.endsWith('.up.railway.app') || bare.endsWith('.railway.app')) return true;
  return false;
}

export async function middleware(req: NextRequest) {
  const host = (req.headers.get('host') ?? '').toLowerCase();
  if (!host || isPrimaryHost(host)) return NextResponse.next();

  const { pathname, search } = req.nextUrl;
  if (isPassthroughPath(pathname)) return NextResponse.next();

  // Don't double-rewrite — if the URL is already /cafe/<slug>/... let it through.
  if (pathname.startsWith('/cafe/')) return NextResponse.next();

  // Look up host → slug via internal API (Node runtime, has Prisma).
  // Use the canonical app URL so the lookup works even before this host has
  // its own SSL cert wired up. APP_URL is set in the Railway env.
  const apiBase = process.env.APP_URL || 'https://cafe.watshop.in';
  let slug: string | null = null;
  try {
    const res = await fetch(`${apiBase}/api/internal/host-resolve?host=${encodeURIComponent(host)}`, {
      // 60s cache so middleware doesn't fan out to the API on every request.
      next: { revalidate: 60 },
    });
    if (res.ok) {
      const data = (await res.json()) as { slug: string | null };
      slug = data.slug;
    }
  } catch {
    // Lookup failed — fall through to a regular response. Better to 404 than
    // 500 the customer when our own API is briefly unreachable.
  }

  if (!slug) return NextResponse.next();

  // Rewrite '/' → '/cafe/<slug>', '/table/T1' → '/cafe/<slug>/table/T1', etc.
  const url = req.nextUrl.clone();
  url.pathname = `/cafe/${slug}${pathname === '/' ? '' : pathname}`;
  url.search = search;
  return NextResponse.rewrite(url);
}

// Match everything except static assets — broad, since the host check
// short-circuits primary-host traffic at the top of the function.
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js|map)).*)',
  ],
};
