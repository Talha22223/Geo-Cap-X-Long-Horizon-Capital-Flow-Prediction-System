const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Synchronizing subscription plans...');
  await prisma.subscriptionPlan.upsert({
    where: { name: 'Free' },
    update: {
      price: 0,
      interval: 'month',
      features: { maxQueries: 100, allowApiKeys: false, maxOrganizations: 1 },
      description: 'Foundational query limits for hobbyists and individual exploration.',
    },
    create: {
      name: 'Free',
      price: 0,
      interval: 'month',
      features: { maxQueries: 100, allowApiKeys: false, maxOrganizations: 1 },
      description: 'Foundational query limits for hobbyists and individual exploration.',
    },
  });

  await prisma.subscriptionPlan.upsert({
    where: { name: 'Pro' },
    update: {
      price: 49,
      interval: 'month',
      priceCode: process.env.STRIPE_PRO_PRICE_ID || 'price_pro_monthly',
      features: { maxQueries: 1000, allowApiKeys: true, maxOrganizations: 3 },
      description: 'Advanced analytics features and API access for professional analysts.',
    },
    create: {
      name: 'Pro',
      price: 49,
      interval: 'month',
      priceCode: process.env.STRIPE_PRO_PRICE_ID || 'price_pro_monthly',
      features: { maxQueries: 1000, allowApiKeys: true, maxOrganizations: 3 },
      description: 'Advanced analytics features and API access for professional analysts.',
    },
  });

  await prisma.subscriptionPlan.upsert({
    where: { name: 'Enterprise' },
    update: {
      price: 499,
      interval: 'month',
      priceCode: process.env.STRIPE_ENTERPRISE_PRICE_ID || 'price_enterprise_monthly',
      features: { maxQueries: 999999, allowApiKeys: true, maxOrganizations: 99 },
      description: 'Unlimited queries, custom models support, and multi-tenant controls.',
    },
    create: {
      name: 'Enterprise',
      price: 499,
      interval: 'month',
      priceCode: process.env.STRIPE_ENTERPRISE_PRICE_ID || 'price_enterprise_monthly',
      features: { maxQueries: 999999, allowApiKeys: true, maxOrganizations: 99 },
      description: 'Unlimited queries, custom models support, and multi-tenant controls.',
    },
  });

  const plans = await prisma.subscriptionPlan.findMany();
  console.log('Plans in DB:', plans.map(p => ({ name: p.name, price: Number(p.price), priceCode: p.priceCode })));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
