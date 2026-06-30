import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const PLANS = [
  {
    name: 'Starter',
    slug: 'starter',
    description: 'Free for 14 days. Then ₹0/forever for tiny cafes.',
    priceMonthly: 0,
    priceYearly: 0,
    maxTables: 5,
    maxMenuItems: 30,
    maxStaff: 2,
    whatsappEnabled: true,
    customBranding: false,
    customSubdomain: false,
    prioritySupport: false,
    analytics: false,
    multiLanguage: false,
    isActive: true,
    isPopular: false,
    sortOrder: 0,
    features: ['5 QR tables', '30 menu items', 'Live order board', 'WhatsApp wa.me notifications'],
  },
  {
    name: 'Pro',
    slug: 'pro',
    description: 'For growing cafes. Most popular choice.',
    priceMonthly: 499,
    priceYearly: 4990,
    maxTables: 30,
    maxMenuItems: 200,
    maxStaff: 10,
    whatsappEnabled: true,
    customBranding: true,
    customSubdomain: false,
    prioritySupport: false,
    analytics: true,
    multiLanguage: true,
    isActive: true,
    isPopular: true,
    sortOrder: 1,
    features: [
      '30 tables · 200 items',
      'Multi-staff with roles',
      'Custom branding (logo, colours)',
      'Analytics & reports',
      'Coupons & happy-hour pricing',
      'WhatsApp Cloud API ready',
    ],
  },
  {
    name: 'Business',
    slug: 'business',
    description: 'For chains and high-volume operations.',
    priceMonthly: 1499,
    priceYearly: 14990,
    maxTables: 200,
    maxMenuItems: 2000,
    maxStaff: 50,
    whatsappEnabled: true,
    customBranding: true,
    customSubdomain: true,
    prioritySupport: true,
    analytics: true,
    multiLanguage: true,
    isActive: true,
    isPopular: false,
    sortOrder: 2,
    features: [
      'Unlimited tables · 2000 items',
      'Custom subdomain',
      'Priority support 24×7',
      'CSV / API exports',
      'Dedicated account manager',
    ],
  },
];

async function main() {
  console.log('🌱  Seeding CafeQR Pro…');

  // ── 1) Plans ────────────────────────────────────────────────────────────
  for (const p of PLANS) {
    await prisma.plan.upsert({ where: { slug: p.slug }, update: p, create: p });
  }
  console.log(`   ✓ ${PLANS.length} plans`);

  // ── 2) Super admin ──────────────────────────────────────────────────────
  const adminEmail = (process.env.SUPER_ADMIN_EMAIL ?? 'admin@cafeqr.pro').toLowerCase();
  const adminPassword = process.env.SUPER_ADMIN_PASSWORD ?? 'ChangeMe@123';
  const adminName = process.env.SUPER_ADMIN_NAME ?? 'Super Admin';

  const hashedAdmin = await bcrypt.hash(adminPassword, 12);
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: 'SUPER_ADMIN', isActive: true, name: adminName, password: hashedAdmin },
    create: { email: adminEmail, password: hashedAdmin, role: 'SUPER_ADMIN', isActive: true, name: adminName },
  });
  console.log(`   ✓ Super admin: ${admin.email}`);

  // ── 3) Demo owners + cafes ──────────────────────────────────────────────
  const demos = [
    {
      email: 'owner@mocha.cafe',
      name: 'Riya Mehta',
      slug: 'cafe-mocha',
      cafeName: 'Cafe Mocha',
      color: '#6B4E3D',
    },
    {
      email: 'demo@cafeqr.pro',
      name: 'Demo Owner',
      slug: 'cafe-dk',
      cafeName: 'Cafe DK',
      color: '#1e293b',
    },
  ];

  const proPlan = await prisma.plan.findUnique({ where: { slug: 'pro' } });

  for (const d of demos) {
    const owner = await prisma.user.upsert({
      where: { email: d.email },
      update: {},
      create: {
        email: d.email,
        password: await bcrypt.hash('Owner@123', 12),
        name: d.name,
        phone: '9876543210',
        role: 'CAFE_OWNER',
      },
    });

    const cafe = await prisma.cafe.upsert({
      where: { slug: d.slug },
      update: {},
      create: {
        slug: d.slug,
        name: d.cafeName,
        description: 'Demo cafe showing off QR ordering features.',
        address: '123 Demo Street',
        city: 'Bengaluru',
        phone: '9876543210',
        ownerId: owner.id,
        planId: proPlan?.id,
        status: 'TRIAL',
        trialEndsAt: new Date(Date.now() + 14 * 86400000),
        settings: {
          create: {
            primaryColor: d.color,
            accentColor: '#D4A574',
            paymentEnabled: true,
            upiId: 'demo@upi',
          },
        },
      },
    });

    await prisma.staff.upsert({
      where: { cafeId_userId: { cafeId: cafe.id, userId: owner.id } },
      update: {},
      create: { cafeId: cafe.id, userId: owner.id, role: 'OWNER', joinedAt: new Date() },
    });

    // Tables
    const existingTables = await prisma.table.count({ where: { cafeId: cafe.id } });
    if (existingTables === 0) {
      for (let i = 1; i <= 5; i++) {
        const code = `${d.slug.slice(0, 3).toUpperCase()}-${i.toString().padStart(2, '0')}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
        await prisma.table.create({
          data: { cafeId: cafe.id, number: String(i), capacity: i % 3 === 0 ? 2 : 4, code, area: i > 3 ? 'Outdoor' : 'Indoor' },
        });
      }
    }

    // Categories + items
    const catCount = await prisma.category.count({ where: { cafeId: cafe.id } });
    if (catCount === 0) {
      const cats = [
        { name: 'Coffee', slug: 'coffee' },
        { name: 'Tea', slug: 'tea' },
        { name: 'Pastry', slug: 'pastry' },
      ];
      for (let i = 0; i < cats.length; i++) {
        const c = await prisma.category.create({
          data: { cafeId: cafe.id, name: cats[i].name, slug: cats[i].slug, sortOrder: i },
        });

        // Add one item per category
        await prisma.menuItem.create({
          data: {
            cafeId: cafe.id,
            categoryId: c.id,
            name: `${cats[i].name} Special`,
            price: 100 + i * 50,
            isPopular: i === 0,
            inStock: true,
          },
        });
      }
    }

    // Demo promo posters for the customer-app home carousel.
    const posterCount = await prisma.poster.count({ where: { cafeId: cafe.id } });
    if (posterCount === 0) {
      const demoPosters = [
        { badge: 'Limited Time Offer', title: '20% off', subtitle: 'on combo', caption: 'Great taste. Better together.', ctaLabel: 'Order Now', bgColor: 'linear-gradient(135deg,#2c3a2c,#16210f)', sortOrder: 0 },
        { badge: 'Fresh Brew', title: 'Buy 1 Get 1', subtitle: 'on coffee', caption: 'Every weekday, 4–6 PM.', ctaLabel: 'Grab Deal', bgColor: 'linear-gradient(135deg,#7a4a2b,#3a2417)', sortOrder: 1 },
      ];
      for (const p of demoPosters) {
        await prisma.poster.create({ data: { cafeId: cafe.id, isActive: true, linkType: 'none', ...p } });
      }
    }

    console.log(`   ✓ Demo cafe: ${cafe.name} (login: ${d.email} / Owner@123)`);
  }

  console.log('\n🎉  Done!\n');
  console.log(`   Super admin → ${adminEmail} / ${adminPassword}`);
  console.log(`   Demo logins → owner@mocha.cafe / Owner@123, demo@cafeqr.pro / Owner@123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
