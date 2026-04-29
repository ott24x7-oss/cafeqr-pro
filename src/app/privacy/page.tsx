import { PublicNavbar } from '@/components/public/navbar';
import { PublicFooter } from '@/components/public/footer';
import { prisma } from '@/lib/prisma';

export const metadata = { title: 'Privacy Policy' };
export const revalidate = 3600;

async function getBrandName() {
  try {
    const row = await prisma.platformBranding.findUnique({ where: { id: 'singleton' } });
    return row?.brandName?.trim() || 'WatShop Cafe';
  } catch {
    return 'WatShop Cafe';
  }
}

export default async function PrivacyPage() {
  const brand = await getBrandName();
  const updated = '29 April 2026';

  return (
    <div className="min-h-screen bg-cream-50">
      <PublicNavbar />
      <main className="container max-w-3xl py-12 md:py-16">
        <div className="mb-8">
          <h1 className="font-display text-3xl md:text-5xl font-bold text-coffee-900">Privacy Policy</h1>
          <p className="text-sm text-coffee-500 mt-2">Last updated: {updated}</p>
        </div>

        <article className="space-y-6 text-coffee-800 text-[15px] leading-relaxed">
          <p>
            <b>{brand}</b> respects your privacy. This policy describes what information we
            collect, how we use it and the rights you have over your data when you use the
            Service.
          </p>

          <Section title="1. Information we collect">
            <ul className="list-disc pl-5 space-y-1.5">
              <li><b>Cafe owner accounts:</b> name, email, phone number, password hash, cafe details (name, address, GST/FSSAI numbers, logo), payment configuration (UPI ID, bank credentials encrypted at rest).</li>
              <li><b>Customer orders:</b> name, WhatsApp/phone number, delivery address (only for delivery orders), order items, payment status. Customers do not need to create an account to place an order.</li>
              <li><b>Customer logins:</b> when a customer chooses to log in via WhatsApp OTP, we set a signed cookie keyed to their phone number. We do not store passwords for customer accounts.</li>
              <li><b>Loyalty programme:</b> for cafes that have loyalty enabled, we store points balance and earn/redeem ledger keyed to (cafe, customer phone).</li>
              <li><b>Usage logs:</b> standard server access logs (IP address, user agent, timestamp) used for security and abuse prevention. Retained for up to 30 days.</li>
              <li><b>Cookies:</b> session cookies for authentication, a customer-login cookie when logged in, and the cqr_brand cache header for branding. We do not use third-party advertising cookies.</li>
            </ul>
          </Section>

          <Section title="2. How we use your information">
            <ul className="list-disc pl-5 space-y-1.5">
              <li>To deliver the Service — show the menu, place &amp; track orders, send WhatsApp notifications, process payments, award loyalty points.</li>
              <li>To send transactional emails (password resets, billing notices) and WhatsApp messages (order confirmations, payment receipts) — the cafe is the sender; {brand} provides the relay.</li>
              <li>To improve and secure the Service — debugging, abuse monitoring, fraud prevention.</li>
              <li>To comply with legal obligations (tax invoices, government data requests).</li>
            </ul>
          </Section>

          <Section title="3. Sharing">
            <p>
              We do <b>not</b> sell your personal information. We share data with:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>The <b>cafe</b> you ordered from — they need your name, phone and items to fulfil the order.</li>
              <li><b>Payment / messaging providers</b> we use under contract — UPI gateways, WhatsApp Cloud API, transactional-email providers — for the limited purpose of completing the requested action.</li>
              <li><b>Cloud infrastructure</b> (Railway, the database host) where the Service is deployed.</li>
              <li><b>Authorities</b> if required by valid legal process.</li>
            </ul>
          </Section>

          <Section title="4. Data retention">
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Order history is retained for the lifetime of the cafe account so customers can look up past orders.</li>
              <li>Customer login cookies expire after 30 days.</li>
              <li>OTP codes are stored in memory for 10 minutes then deleted.</li>
              <li>Server access logs are retained for up to 30 days.</li>
            </ul>
          </Section>

          <Section title="5. Security">
            <p>
              We use HTTPS in transit, hash passwords with bcrypt, encrypt payment-provider
              secrets at rest, and store session cookies as <code>httpOnly</code> with
              SameSite=Lax. No system is perfectly secure — please use a strong, unique
              password for your account.
            </p>
          </Section>

          <Section title="6. Your rights">
            <p>
              You can access, correct or delete your account data at any time:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><b>Cafe owners:</b> via Settings in the dashboard, or by emailing us.</li>
              <li><b>Customers:</b> log in on your cafe page, view your order history and loyalty balance under My Account, or sign out to clear the session cookie. Email us to request deletion of your phone-number-keyed records.</li>
            </ul>
          </Section>

          <Section title="7. Children">
            <p>
              The Service is not directed to children under 13 and we do not knowingly collect
              personal information from them.
            </p>
          </Section>

          <Section title="8. Changes">
            <p>
              We may update this policy from time to time. Material changes will be announced
              on the dashboard or via email.
            </p>
          </Section>

          <Section title="9. Contact">
            <p>
              Questions about your privacy? Email <a className="text-coffee-700 underline" href="mailto:hello@cafeqr.pro">hello@cafeqr.pro</a>.
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
