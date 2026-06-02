import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

// Static marketing + legal pages. Auth (/login, /signup), the dashboard,
// admin and per-cafe storefronts are intentionally excluded — they're
// either gated, low search value, or tenant-specific.
const ROUTES: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] }[] = [
  { path: '/', priority: 1.0, changeFrequency: 'weekly' },
  { path: '/how-it-works', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/pricing', priority: 0.8, changeFrequency: 'monthly' },
  { path: '/for-customers', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/for-owners', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/demo', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/download', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/terms', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/privacy', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/refund-policy', priority: 0.3, changeFrequency: 'yearly' },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return ROUTES.map((r) => ({
    url: `${SITE_URL}${r.path}`,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}
