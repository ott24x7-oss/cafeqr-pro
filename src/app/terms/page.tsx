import { PublicNavbar } from '@/components/public/navbar';
import { PublicFooter } from '@/components/public/footer';
import { prisma } from '@/lib/prisma';

export const metadata = { title: 'Terms of Service' };
export const revalidate = 3600; // Re-render hourly so brand-name updates land

async function getBrandName() {
  try {
    const row = await prisma.platformBranding.findUnique({ where: { id: 'singleton' } });
    return row?.brandName?.trim() || 'WatShop Cafe';
  } catch {
    return 'WatShop Cafe';
  }
}

export default async function TermsPage() {
  const brand = await getBrandName();
  const updated = '29 April 2026';

  return (
    <div className="min-h-screen bg-cream-50">
      <PublicNavbar />
      <main className="container max-w-3xl py-12 md:py-16">
        <div className="mb-8">
          <h1 className="font-display text-3xl md:text-5xl font-bold text-coffee-900">Terms of Service</h1>
          <p className="text-sm text-coffee-500 mt-2">Last updated: {updated}</p>
        </div>

        <article className="space-y-6 text-coffee-800 text-[15px] leading-relaxed">
          <p>
            Welcome to <b>{brand}</b>. By creating an account, signing in, placing an order or
            otherwise using our website, mobile app or APIs (together, the &ldquo;Service&rdquo;)
            you agree to these Terms of Service. If you do not agree, please do not use the
            Service.
          </p>

          <Section title="1. Who we are">
            <p>
              {brand} is a software-as-a-service platform that lets cafes and restaurants take
              QR-based menu orders, manage their kitchen, accept UPI payments and run a loyalty
              programme. Cafe owners are independent businesses who use the Service to run
              their own operations; {brand} is not the seller of the food or beverages
              ordered through the platform.
            </p>
          </Section>

          <Section title="2. Accounts">
            <p>
              You must provide accurate information when creating an account, keep your
              credentials secure and notify us if you suspect unauthorised use. We may suspend
              or terminate accounts that violate these terms, attempt to disrupt the Service
              or engage in fraud.
            </p>
          </Section>

          <Section title="3. Cafe owner obligations">
            <ul className="list-disc pl-5 space-y-1.5">
              <li>You are responsible for the accuracy of menu, pricing, tax, FSSAI, GST and other regulatory information you publish on the Service.</li>
              <li>You agree to fulfil orders received through the platform in line with the timings, locations and conditions you advertise.</li>
              <li>You will handle customer complaints, refunds and food-safety incidents directly with the customer; {brand} is not a party to those transactions.</li>
              <li>You authorise us to display your cafe profile, logo, menu and reviews on the platform's customer-facing pages.</li>
            </ul>
          </Section>

          <Section title="4. Customer obligations">
            <p>
              When you place an order, you represent that the contact details you provide are
              accurate and that you intend to pay in full for the items ordered. The cafe is
              the seller; any disputes about quality, allergens, hygiene or fulfilment must be
              raised with the cafe directly. You may use the WhatsApp number associated with
              your order to communicate with the cafe.
            </p>
          </Section>

          <Section title="5. Payments &amp; subscriptions">
            <p>
              Cafes pay subscription fees as listed on the pricing page. Payments collected
              from customers (UPI, cash, card) settle directly to the cafe — {brand} does not
              hold customer funds in escrow. Subscription fees are non-refundable except as
              described in our Refund Policy.
            </p>
          </Section>

          <Section title="6. Loyalty points">
            <p>
              Loyalty points are issued by the cafe, not by {brand}. Each cafe controls its
              own earn rate and redemption rules. Points have no monetary value, are
              non-transferable between cafes, and may be revoked by the cafe in case of fraud
              or refunded orders. {brand} provides the underlying ledger as a service.
            </p>
          </Section>

          <Section title="7. Acceptable use">
            <ul className="list-disc pl-5 space-y-1.5">
              <li>No spamming, scraping, reverse-engineering or attempting to bypass rate limits.</li>
              <li>No uploading content that is illegal, infringing, misleading or obscene.</li>
              <li>No impersonation of another cafe, customer or {brand} staff.</li>
            </ul>
          </Section>

          <Section title="8. Intellectual property">
            <p>
              The Service, including its source code, design, brand assets and documentation,
              is the property of {brand} and its licensors. You may not copy, modify or
              redistribute it except as expressly permitted. Cafe-uploaded content (menu,
              images, branding) remains owned by the cafe; you grant us a worldwide, royalty-
              free licence to display it on the platform for the duration of your account.
            </p>
          </Section>

          <Section title="9. Disclaimers">
            <p>
              The Service is provided &ldquo;as is&rdquo;. To the maximum extent permitted by
              law, {brand} disclaims all warranties of merchantability, fitness for a
              particular purpose and non-infringement. We do not warrant that the Service will
              be uninterrupted, error-free or that messages will always be delivered (e.g. via
              WhatsApp third-party APIs).
            </p>
          </Section>

          <Section title="10. Limitation of liability">
            <p>
              To the maximum extent permitted by law, {brand}'s aggregate liability arising out
              of or relating to the Service is limited to the fees you paid us in the twelve
              months preceding the event giving rise to the claim. We are not liable for any
              indirect, incidental, special or consequential damages, or for lost profits or
              data.
            </p>
          </Section>

          <Section title="11. Governing law">
            <p>
              These terms are governed by the laws of India. Any dispute will be subject to
              the exclusive jurisdiction of the courts at the city listed in our Contact
              section.
            </p>
          </Section>

          <Section title="12. Changes">
            <p>
              We may update these terms from time to time. Material changes will be announced
              on the dashboard or via email. Continued use of the Service after changes
              indicates acceptance.
            </p>
          </Section>

          <Section title="13. Contact">
            <p>
              Questions about these terms? Email <a className="text-coffee-700 underline" href="mailto:hello@cafeqr.pro">hello@cafeqr.pro</a>.
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
