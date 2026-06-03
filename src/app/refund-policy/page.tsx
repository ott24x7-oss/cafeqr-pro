import { PublicNavbar } from '@/components/public/navbar';
import { PublicFooter } from '@/components/public/footer';
import { prisma } from '@/lib/prisma';

export const metadata = {
  title: 'Refund Policy',
  description: 'WatShop Cafe cancellation and refund policy for subscriptions and orders.',
  alternates: { canonical: '/refund-policy' },
};
export const revalidate = 3600;

async function getBrandName() {
  try {
    const row = await prisma.platformBranding.findUnique({ where: { id: 'singleton' } });
    return row?.brandName?.trim() || 'WatShop Cafe';
  } catch {
    return 'WatShop Cafe';
  }
}

export default async function RefundPolicyPage() {
  const brand = await getBrandName();
  const updated = '29 April 2026';

  return (
    <div className="min-h-screen bg-cream-50">
      <PublicNavbar />
      <main className="container max-w-3xl py-12 md:py-16">
        <div className="mb-8">
          <h1 className="font-display text-3xl md:text-5xl font-bold text-coffee-900">Refund Policy</h1>
          <p className="text-sm text-coffee-500 mt-2">Last updated: {updated}</p>
        </div>

        <article className="space-y-6 text-coffee-800 text-[15px] leading-relaxed">
          <p>
            This policy covers refunds for two distinct payment flows: <b>customer food
            orders</b> placed at a cafe through the platform, and <b>cafe subscription
            fees</b> paid to <b>{brand}</b>.
          </p>

          <Section title="1. Customer food orders">
            <p>
              When you order food through a cafe's QR menu, you pay the cafe directly
              (typically via UPI). {brand} does not hold these funds in escrow — we only relay
              the order and the payment confirmation. Refunds for food orders are therefore
              handled by the cafe, not by {brand}.
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><b>Order not yet started:</b> tap "Cancel" from your account page (or ask a staff member) while the order is still in NEW or ACCEPTED status. The cafe will issue a refund through the same UPI flow.</li>
              <li><b>Order being prepared / served:</b> contact the cafe directly. Once the kitchen has started cooking, refunds are at the cafe's discretion.</li>
              <li><b>Quality, hygiene or fulfilment dispute:</b> raise it with the cafe. If it can't be resolved, you can email {brand} and we'll attempt to mediate, but the final decision rests with the cafe.</li>
              <li><b>Loyalty points</b> credited from a refunded order will be reversed automatically.</li>
            </ul>
          </Section>

          <Section title="2. Cafe subscription fees">
            <p>
              Cafes pay {brand} a recurring subscription fee. Our policy:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><b>Free trial:</b> the first 14 days are free for every new cafe — you only pay if you choose to continue.</li>
              <li><b>Pro-rated refunds:</b> if you cancel mid-cycle and have used the Service for less than 7 days of the current paid period, email us and we will refund the unused portion.</li>
              <li><b>Annual plans:</b> refundable on a pro-rata basis within the first 30 days. After 30 days, the remaining commitment is non-refundable.</li>
              <li><b>Service downtime:</b> if {brand} suffers a continuous outage of more than 12 hours in a billing period, you may request a credit for the affected days. Credits apply to the next bill.</li>
              <li><b>Account termination by us</b> for breach of the Terms of Service is non-refundable.</li>
            </ul>
          </Section>

          <Section title="3. How to request a refund">
            <p>
              Email <a className="text-coffee-700 underline" href="mailto:hello@cafeqr.pro">hello@cafeqr.pro</a> from the email
              address registered with your account. Include:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Order number (for food orders) or cafe name (for subscriptions)</li>
              <li>Reason for the refund</li>
              <li>Approximate date of the payment</li>
            </ul>
            <p>
              We respond within 2 business days. Approved refunds are processed back to the
              original payment method within 5–7 business days.
            </p>
          </Section>

          <Section title="4. Chargebacks">
            <p>
              Initiating a chargeback through your bank or UPI provider without first
              contacting us may result in your account being suspended pending investigation.
              We almost always prefer to resolve issues directly.
            </p>
          </Section>

          <Section title="5. Contact">
            <p>
              Questions about this policy? Email <a className="text-coffee-700 underline" href="mailto:hello@cafeqr.pro">hello@cafeqr.pro</a>.
            </p>
          </Section>
        </article>
      </main>
      <PublicFooter />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-xl font-bold text-coffee-900 mt-6 mb-2">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
