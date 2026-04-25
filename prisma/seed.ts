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

  // ── 3) Demo owner + cafe ────────────────────────────────────────────────
  const ownerEmail = 'owner@mocha.cafe';
  const ownerPass = 'Owner@123';
  const owner = await prisma.user.upsert({
    where: { email: ownerEmail },
    update: {},
    create: {
      email: ownerEmail,
      password: await bcrypt.hash(ownerPass, 12),
      name: 'Riya Mehta',
      phone: '9876543210',
      role: 'CAFE_OWNER',
    },
  });

  const proPlan = await prisma.plan.findUnique({ where: { slug: 'pro' } });

  const cafe = await prisma.cafe.upsert({
    where: { slug: 'cafe-mocha' },
    update: {},
    create: {
      slug: 'cafe-mocha',
      name: 'Cafe Mocha',
      description: 'Cosy neighbourhood cafe — speciality coffees, fresh pastries and all-day breakfast.',
      address: '12, Brigade Road',
      city: 'Bengaluru',
      phone: '9876543210',
      whatsappNo: '9876543210',
      email: 'hello@mocha.cafe',
      gstNumber: '29ABCDE1234F1Z5',
      ownerId: owner.id,
      planId: proPlan?.id,
      status: 'TRIAL',
      trialEndsAt: new Date(Date.now() + 14 * 86400000),
      settings: {
        create: {
          taxPercent: 5,
          serviceCharge: 5,
          packingCharge: 10,
          paymentEnabled: true,
          reviewEnabled: true,
          whatsappProvider: 'manual',
          notifyOwnerWA: true,
          notifyCustomerWA: true,
          upiId: 'mocha@hdfcbank',
          paymentNote: 'Pay using any UPI app and submit txn ID',
          enableSound: true,
          primaryColor: '#6B4E3D',
          accentColor: '#D4A574',
        },
      },
    },
  });

  await prisma.staff.upsert({
    where: { cafeId_userId: { cafeId: cafe.id, userId: owner.id } },
    update: {},
    create: { cafeId: cafe.id, userId: owner.id, role: 'OWNER', joinedAt: new Date() },
  });

  console.log(`   ✓ Demo cafe: ${cafe.name} (login: ${ownerEmail} / ${ownerPass})`);

  // ── 4) Tables ───────────────────────────────────────────────────────────
  const existingTables = await prisma.table.count({ where: { cafeId: cafe.id } });
  if (existingTables === 0) {
    for (let i = 1; i <= 5; i++) {
      const code = `TMOC-${i.toString().padStart(2, '0')}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
      await prisma.table.create({
        data: { cafeId: cafe.id, number: String(i), capacity: i % 3 === 0 ? 2 : 4, code, area: i > 3 ? 'Outdoor' : 'Indoor' },
      });
    }
    console.log('   ✓ 5 tables');
  }

  // ── 5) Categories + items ───────────────────────────────────────────────
  const cats = [
    { name: 'Coffee', slug: 'coffee' },
    { name: 'Tea', slug: 'tea' },
    { name: 'Pastry', slug: 'pastry' },
    { name: 'Breakfast', slug: 'breakfast' },
    { name: 'Mains', slug: 'mains' },
  ];
  const catMap: Record<string, string> = {};
  for (let i = 0; i < cats.length; i++) {
    const c = await prisma.category.upsert({
      where: { cafeId_slug: { cafeId: cafe.id, slug: cats[i].slug } },
      update: {},
      create: { cafeId: cafe.id, name: cats[i].name, slug: cats[i].slug, sortOrder: i },
    });
    catMap[cats[i].slug] = c.id;
  }

  const seedItems = [
    { cat: 'coffee', name: 'Cappuccino', desc: 'Rich espresso, foamed milk, dusted with cocoa', price: 180, popular: true },
    { cat: 'coffee', name: 'Cold Brew', desc: '12-hour slow-brewed, served chilled', price: 220 },
    { cat: 'coffee', name: 'Espresso', desc: 'Single shot, intense and bold', price: 120 },
    { cat: 'coffee', name: 'Latte', desc: 'Smooth espresso with steamed milk', price: 200 },
    { cat: 'tea', name: 'Masala Chai', desc: 'House blend, slow-simmered', price: 80, popular: true },
    { cat: 'tea', name: 'Green Tea', desc: 'Earthy, refreshing', price: 90 },
    { cat: 'pastry', name: 'Almond Croissant', desc: 'Flaky pastry, almond cream filling', price: 180 },
    { cat: 'pastry', name: 'Chocolate Muffin', desc: 'Triple-chocolate, baked fresh', price: 140 },
    { cat: 'breakfast', name: 'Avocado Toast', desc: 'Sourdough, smashed avo, chilli flakes', price: 280, popular: true },
    { cat: 'breakfast', name: 'Eggs Benedict', desc: 'Poached eggs, hollandaise, English muffin', price: 320, diet: 'EGG' },
    { cat: 'mains', name: 'Truffle Pasta', desc: 'Hand-rolled tagliatelle, truffle, parmesan', price: 460 },
    { cat: 'mains', name: 'Margherita Pizza', desc: 'San Marzano, fresh basil, mozzarella', price: 380 },
  ];

  for (let i = 0; i < seedItems.length; i++) {
    const it = seedItems[i];
    const exists = await prisma.menuItem.findFirst({ where: { cafeId: cafe.id, name: it.name } });
    if (exists) continue;
    await prisma.menuItem.create({
      data: {
        cafeId: cafe.id,
        categoryId: catMap[it.cat],
        name: it.name,
        description: it.desc,
        price: it.price,
        diet: (it.diet as any) ?? 'VEG',
        prepMinutes: 10,
        sortOrder: i,
        isPopular: !!it.popular,
      },
    });
  }
  console.log(`   ✓ ${seedItems.length} menu items`);

  console.log('\n🎉  Done!\n');
  console.log(`   Super admin → ${adminEmail} / ${adminPassword}`);
  console.log(`   Demo owner  → ${ownerEmail} / ${ownerPass}`);
  console.log(`   Public menu → /cafe/${cafe.slug}\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
