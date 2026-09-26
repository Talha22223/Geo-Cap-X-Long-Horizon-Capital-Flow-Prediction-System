const { PrismaClient, SystemRole, OrgRole, SubscriptionStatus } = require('@prisma/client');
const argon2 = require('argon2');

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_SEED_EMAIL || 'admin@geocapx.com';
  const plainPassword = process.env.ADMIN_SEED_PASSWORD || 'Password123!';
  
  console.log(`Hashing password for ${email}...`);
  const passwordHash = await argon2.hash(plainPassword, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  console.log('Checking existing user...');
  const existing = await prisma.user.findUnique({
    where: { email },
    include: { profile: true },
  });

  if (existing) {
    console.log(`User ${email} already exists. Updating password and role to SUPER_ADMIN...`);
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        passwordHash,
        role: SystemRole.SUPER_ADMIN,
        isActive: true,
        isEmailVerified: true,
      },
    });
    console.log('Admin user updated successfully!');
  } else {
    console.log(`Creating admin user ${email}...`);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: SystemRole.SUPER_ADMIN,
        isActive: true,
        isEmailVerified: true,
        emailVerifiedAt: new Date(),
        profile: {
          create: {
            firstName: 'System',
            lastName: 'Admin',
            avatarUrl: 'https://api.dicebear.com/7.x/bottts/svg?seed=Admin',
          },
        },
        settings: {
          create: {
            timezone: 'UTC',
            language: 'en',
            theme: 'dark',
          },
        },
      },
    });

    // Create Admin Organization
    const org = await prisma.organization.create({
      data: {
        name: 'GeoCap-X Global Administration',
        slug: 'admin-global-corp',
      },
    });

    await prisma.organizationMember.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        role: OrgRole.OWNER,
      },
    });

    // Link Enterprise plan
    let enterprisePlan = await prisma.subscriptionPlan.findUnique({ where: { name: 'Enterprise' } });
    if (!enterprisePlan) {
      enterprisePlan = await prisma.subscriptionPlan.create({
        data: {
          name: 'Enterprise',
          description: 'Unlimited queries, custom models support, and multi-tenant controls.',
          price: 499.00,
          interval: 'month',
          features: { maxQueries: 999999, allowApiKeys: true, maxOrganizations: 99 },
        },
      });
    }

    await prisma.subscription.create({
      data: {
        organizationId: org.id,
        planId: enterprisePlan.id,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
    });

    console.log(`Admin user ${email} created successfully with SUPER_ADMIN role!`);
  }
}

main()
  .catch((err) => {
    console.error('Error seeding admin user:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
