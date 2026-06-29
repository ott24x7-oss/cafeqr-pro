'use client';

import { useEffect, useRef, useState } from 'react';
import { Tag, ArrowRight } from 'lucide-react';

export interface Poster {
  id: string;
  title: string | null;
  subtitle: string | null;
  caption: string | null;
  badge: string | null;
  imageUrl: string | null;
  ctaLabel: string | null;
  linkType: string;
  linkValue: string | null;
  bgColor: string | null;
}

/**
 * Swipeable, auto-advancing promo carousel shown at the top of the customer
 * app home. Mirrors the "20% off on combo" banner from the design. Owners
 * manage these from the dashboard → Posters & Slides.
 */
export function PosterCarousel({
  posters,
  onAction,
}: {
  posters: Poster[];
  onAction: (p: Poster) => void;
}) {
  const [idx, setIdx] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const count = posters.length;

  // Auto-advance every 4.5s unless the user is mid-swipe. Pauses on hidden tab.
  useEffect(() => {
    if (count <= 1) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % count), 4500);
    return () => clearInterval(id);
  }, [count]);

  // Drive the scroll position from `idx` so dots + autoplay stay in sync.
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const child = el.children[idx] as HTMLElement | undefined;
    if (child) el.scrollTo({ left: child.offsetLeft - el.offsetLeft, behavior: 'smooth' });
  }, [idx]);

  // Keep `idx` honest when the user swipes manually.
  function onScroll() {
    const el = trackRef.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== idx) setIdx(Math.max(0, Math.min(count - 1, i)));
  }

  if (count === 0) return null;

  return (
    <div className="space-y-2">
      <div
        ref={trackRef}
        onScroll={onScroll}
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-none -mx-4 px-4"
        style={{ scrollbarWidth: 'none' }}
      >
        {posters.map((p) => (
          <button
            key={p.id}
            onClick={() => onAction(p)}
            className="relative shrink-0 w-[88%] sm:w-[460px] snap-center rounded-2xl overflow-hidden aspect-[16/8] text-left"
            style={{ background: p.bgColor || 'linear-gradient(135deg,#2c3a2c,#16210f)' }}
          >
            {p.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/35 to-transparent" />
            <div className="relative h-full p-4 flex flex-col justify-center">
              {p.badge && (
                <span className="self-start inline-flex items-center gap-1 rounded-full bg-amber-400/95 text-[#2a1c0e] text-[10px] font-bold px-2 py-0.5">
                  <Tag className="h-2.5 w-2.5" /> {p.badge}
                </span>
              )}
              {p.title && (
                <div className="text-cream-50 font-display font-bold text-2xl leading-none mt-1.5">{p.title}</div>
              )}
              {p.subtitle && (
                <div className="text-amber-200 font-display italic text-xl leading-tight">{p.subtitle}</div>
              )}
              {p.caption && <div className="text-cream-100/85 text-xs mt-1">{p.caption}</div>}
              {p.ctaLabel && (
                <span className="self-start mt-2.5 inline-flex items-center gap-1 rounded-full bg-cream-50 text-coffee-900 text-xs font-bold px-3 py-1.5">
                  {p.ctaLabel} <ArrowRight className="h-3 w-3" />
                </span>
              )}
            </div>
          </button>
        ))}
      </div>

      {count > 1 && (
        <div className="flex items-center justify-center gap-1.5">
          {posters.map((p, i) => (
            <button
              key={p.id}
              onClick={() => setIdx(i)}
              aria-label={`Slide ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${i === idx ? 'w-5 bg-amber-400' : 'w-1.5 bg-white/25'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
