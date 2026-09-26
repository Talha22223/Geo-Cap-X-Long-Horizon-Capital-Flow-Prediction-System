import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

describe('Subscriptions & Billing (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let testUserId: string;
  let testOrgId: string;
  const testEmail = `billing_tester_${Date.now()}@geocapx.com`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI });
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);

    // Register & Login to get token
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: testEmail,
        password: 'Password123!',
        confirmPassword: 'Password123!',
        firstName: 'Billing',
        lastName: 'Tester',
      });

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: testEmail,
        password: 'Password123!',
      });

    authToken = loginRes.body.data.accessToken;
    testUserId = loginRes.body.data.user.id;

    // Resolve resolved organization ID
    const member = await prisma.organizationMember.findFirst({
      where: { userId: testUserId },
    });
    if (member) {
      testOrgId = member.organizationId;
    }
  });

  afterAll(async () => {
    if (prisma) {
      try {
        await prisma.user.delete({ where: { email: testEmail } });
      } catch (err) {}
      await prisma.$disconnect();
    }
    if (app) {
      await app.close();
    }
  });

  describe('GET /api/v1/subscriptions/plans', () => {
    it('should list all active plans', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/subscriptions/plans');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('POST /api/v1/subscriptions/:orgId/stripe-session', () => {
    it('should create a checkout session and return redirect URL', async () => {
      // Find a plan ID
      const plans = await prisma.subscriptionPlan.findMany({ where: { isActive: true } });
      if (plans.length === 0) return;

      const response = await request(app.getHttpServer())
        .post(`/api/v1/subscriptions/${testOrgId}/stripe-session`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          planId: plans[0].id,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.url).toBeDefined();
    });
  });

  describe('POST /api/v1/subscriptions/webhook', () => {
    it('should process customer subscription status changes cleanly', async () => {
      const mockSubId = `sub_${Date.now()}`;
      
      // Create a mock subscription in DB linked to target org
      const plan = await prisma.subscriptionPlan.findFirst();
      if (!plan) return;

      const sub = await prisma.subscription.create({
        data: {
          organizationId: testOrgId,
          planId: plan.id,
          stripeSubscriptionId: mockSubId,
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          status: 'TRIALING',
        },
      });

      const response = await request(app.getHttpServer())
        .post('/api/v1/subscriptions/webhook')
        .send({
          type: 'customer.subscription.updated',
          data: {
            object: {
              id: mockSubId,
              status: 'active',
              current_period_start: Math.floor(Date.now() / 1000),
              current_period_end: Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000),
              cancel_at_period_end: false,
            },
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify status updated in DB
      const updatedSub = await prisma.subscription.findUnique({ where: { id: sub.id } });
      expect(updatedSub?.status).toBe('ACTIVE');

      // Cleanup mock subscription
      await prisma.subscription.delete({ where: { id: sub.id } });
    });
  });
});
