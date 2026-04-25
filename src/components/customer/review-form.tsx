'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Star, Heart, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea, Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toaster';

export function ReviewForm({ order }: { order: any }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [name, setName] = useState(order.customerName ?? '');
  const [submitted, setSubmitted] = useState(!!order.review);
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!rating) return toast.error('Please select a star rating');
    setLoading(true);
    try {
      const r = await fetch(`/api/orders/${order.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, comment, customerName: name }),
      });
      if (!r.ok) throw new Error('failed');
      setSubmitted(true);
      toast.success('Thank you for your review!');
    } catch {
      toast.error('Could not submit');
    } finally {
      setLoading(false);
    }
  }

  const cafe = order.cafe;

  if (submitted) {
    return (
      <div className="min-h-screen grid place-items-center bg-cream-50 p-6">
        <div className="card-warm max-w-md w-full text-center">
          <div className="mx-auto h-14 w-14 rounded-full bg-cream-200 grid place-items-center">
            <Heart className="h-7 w-7 text-coffee-700" />
          </div>
          <h1 className="font-display text-2xl font-bold mt-4 text-coffee-900">Thank you!</h1>
          <p className="text-coffee-600 mt-1">Your feedback means a lot to us.</p>
          {cafe.settings?.googleReviewUrl && rating >= 4 && (
            <a href={cafe.settings.googleReviewUrl} target="_blank" rel="noreferrer" className="mt-5 inline-block">
              <Button variant="wa" size="lg">
                Share on Google <ExternalLink className="h-4 w-4" />
              </Button>
            </a>
          )}
          <div className="mt-3">
            <Link href={`/order/${order.id}`} className="text-sm text-coffee-600 hover:underline">Back to order</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-50">
      <div className="bg-coffee-gradient text-cream-50">
        <div className="container py-10 text-center">
          <div className="text-cream-200/80 text-sm">Order #{order.orderNumber}</div>
          <h1 className="font-display text-3xl font-bold mt-1">How was your experience?</h1>
          <p className="text-cream-200/80 mt-1">{cafe.name}</p>
        </div>
      </div>

      <div className="container max-w-md -mt-4 relative">
        <div className="card-warm space-y-4">
          <div className="text-center">
            <div className="flex justify-center gap-1.5 my-3">
              {Array.from({ length: 5 }).map((_, i) => {
                const idx = i + 1;
                const filled = idx <= (hover || rating);
                return (
                  <button key={i} onClick={() => setRating(idx)} onMouseEnter={() => setHover(idx)} onMouseLeave={() => setHover(0)}>
                    <Star className={`h-10 w-10 transition ${filled ? 'fill-caramel text-caramel scale-110' : 'text-coffee-200'}`} />
                  </button>
                );
              })}
            </div>
            <div className="text-sm text-coffee-600 h-5">
              {hover === 5 || rating === 5 ? 'Loved it! 🤩' :
                hover === 4 || rating === 4 ? 'Great experience' :
                hover === 3 || rating === 3 ? 'Good, could be better' :
                hover === 2 || rating === 2 ? 'Below expectations' :
                hover === 1 || rating === 1 ? 'Sorry to hear that' : 'Tap a star'}
            </div>
          </div>

          <div>
            <label className="label">Your name <span className="text-xs text-coffee-500 font-normal">(optional)</span></label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Riya M." />
          </div>
          <div>
            <label className="label">What stood out? <span className="text-xs text-coffee-500 font-normal">(optional)</span></label>
            <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Tell us what you loved or what could improve…" />
          </div>
          <Button className="w-full" size="lg" disabled={!rating || loading} onClick={submit}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Submit review
          </Button>
        </div>
      </div>
    </div>
  );
}
