import { PrismaClient, SystemRole, OrgRole, SubscriptionStatus } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Phase 2 Core Database...');

  // 1. Clean existing records safely
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.session.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.apiKey.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.subscriptionPlan.deleteMany();
  await prisma.organizationMember.deleteMany();
  await prisma.organization.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.userSetting.deleteMany();
  await prisma.user.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.role.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.featureFlag.deleteMany();
  await prisma.systemSetting.deleteMany();

  // 2. Seed System Settings
  await prisma.systemSetting.createMany({
    data: [
      { key: 'site-name', value: 'GeoCap-X Analytics Platform', description: 'Public facing title' },
      { key: 'maintenance-mode', value: 'false', description: 'Enable global site maintenance block' },
    ],
  });

  // 3. Seed Feature Flags
  await prisma.featureFlag.createMany({
    data: [
      { key: 'new-prediction-dashboard', isEnabled: true, description: 'Activates high-performance prediction visuals' },
      { key: 'multi-device-login-warnings', isEnabled: false, description: 'Warn users when login matches new browser' },
    ],
  });

  // 4. Seed Permissions
  const permissionsList = [
    { action: 'users:read', description: 'View user registries' },
    { action: 'users:write', description: 'Edit user accounts' },
    { action: 'users:delete', description: 'Soft-delete user accounts' },
    { action: 'roles:manage', description: 'Assign roles and permissions' },
    { action: 'audit_logs:read', description: 'Access audit trail' },
    { action: 'analytics:read', description: 'View capital flow forecasts' },
    { action: 'analytics:write', description: 'Re-trigger forecasting pipelines' },
    { action: 'settings:write', description: 'Update system settings' },
    { action: 'feature_flags:write', description: 'Toggle feature flags' },
  ];

  const dbPermissions = [];
  for (const perm of permissionsList) {
    const p = await prisma.permission.create({ data: perm });
    dbPermissions.push(p);
  }

  // 5. Seed Roles and Link Permissions
  const roles = [
    { name: SystemRole.SUPER_ADMIN, desc: 'Master Administrator' },
    { name: SystemRole.ADMIN, desc: 'Organization Administrator' },
    { name: SystemRole.ANALYST, desc: 'Macro Research Analyst' },
    { name: SystemRole.ENTERPRISE, desc: 'Corporate Access Client' },
    { name: SystemRole.USER, desc: 'Standard Access Client' },
  ];

  const roleMap: Record<string, string> = {};
  for (const r of roles) {
    const dbRole = await prisma.role.create({
      data: { name: r.name, description: r.desc },
    });
    roleMap[r.name] = dbRole.id;
  }

  // Link Permissions to Roles
  // SUPER_ADMIN has all permissions
  for (const perm of dbPermissions) {
    await prisma.rolePermission.create({
      data: { roleId: roleMap[SystemRole.SUPER_ADMIN], permissionId: perm.id },
    });
  }

  // ADMIN has users:read, users:write, audit_logs:read, analytics:read, analytics:write
  const adminPermActions = ['users:read', 'users:write', 'audit_logs:read', 'analytics:read', 'analytics:write'];
  for (const perm of dbPermissions.filter(p => adminPermActions.includes(p.action))) {
    await prisma.rolePermission.create({
      data: { roleId: roleMap[SystemRole.ADMIN], permissionId: perm.id },
    });
  }

  // ANALYST has analytics:read, analytics:write
  for (const perm of dbPermissions.filter(p => ['analytics:read', 'analytics:write'].includes(p.action))) {
    await prisma.rolePermission.create({
      data: { roleId: roleMap[SystemRole.ANALYST], permissionId: perm.id },
    });
  }

  // USER & ENTERPRISE has analytics:read
  for (const perm of dbPermissions.filter(p => p.action === 'analytics:read')) {
    await prisma.rolePermission.create({
      data: { roleId: roleMap[SystemRole.USER], permissionId: perm.id },
    });
    await prisma.rolePermission.create({
      data: { roleId: roleMap[SystemRole.ENTERPRISE], permissionId: perm.id },
    });
  }

  // 6. Seed Subscription Plans
  const plans = [
    {
      name: 'Free',
      description: 'Foundational query limits for hobbyists.',
      price: 0.00,
      interval: 'month',
      features: { maxQueries: 100, allowApiKeys: false, maxOrganizations: 1 },
    },
    {
      name: 'Pro',
      description: 'Advanced analytics features and API access for professional analysts.',
      price: 49.00,
      interval: 'month',
      features: { maxQueries: 1000, allowApiKeys: true, maxOrganizations: 3 },
    },
    {
      name: 'Enterprise',
      description: 'Unlimited queries, custom models support, and multi-tenant controls.',
      price: 499.00,
      interval: 'month',
      features: { maxQueries: 999999, allowApiKeys: true, maxOrganizations: 99 },
    },
  ];

  const dbPlans: Record<string, string> = {};
  for (const plan of plans) {
    const p = await prisma.subscriptionPlan.create({ data: plan });
    dbPlans[plan.name] = p.id;
  }

  // 7. Seed Base System Users with Argon2
  const passwordHash = await argon2.hash('Password123!');

  const userSeedData = [
    { email: 'superadmin@geocapx.com', role: SystemRole.SUPER_ADMIN, first: 'Super', last: 'Admin' },
    { email: 'admin@geocapx.com', role: SystemRole.ADMIN, first: 'Organization', last: 'Admin' },
    { email: 'analyst@geocapx.com', role: SystemRole.ANALYST, first: 'Macro', last: 'Analyst' },
    { email: 'enterprise@geocapx.com', role: SystemRole.ENTERPRISE, first: 'Corporate', last: 'Client' },
    { email: 'user@geocapx.com', role: SystemRole.USER, first: 'Standard', last: 'User' },
  ];

  for (const usd of userSeedData) {
    const user = await prisma.user.create({
      data: {
        email: usd.email,
        passwordHash,
        role: usd.role,
        isEmailVerified: true,
        emailVerifiedAt: new Date(),
        profile: {
          create: {
            firstName: usd.first,
            lastName: usd.last,
            avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${usd.first}`,
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

    // 8. Create Default Organizations and subscriptions
    const org = await prisma.organization.create({
      data: {
        name: `${usd.first}'s Workgroup`,
        slug: `${usd.first.toLowerCase()}-workgroup-${Math.floor(Math.random() * 1000)}`,
      },
    });

    await prisma.organizationMember.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        role: OrgRole.OWNER,
      },
    });

    // Attach active subscription mapping based on role
    let planId = dbPlans['Free'];
    if (usd.role === SystemRole.ENTERPRISE) planId = dbPlans['Enterprise'];
    else if (usd.role === SystemRole.ANALYST || usd.role === SystemRole.ADMIN) planId = dbPlans['Pro'];

    await prisma.subscription.create({
      data: {
        organizationId: org.id,
        planId,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 days
      },
    });

    console.log(`Seeded user: ${usd.email} with Role: ${usd.role}`);
  }

  console.log('Database Seeding finished successfully.');
}

main()
  .catch((e) => {
    console.error('Error seeding data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
