import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

describe('Organizations Workspaces & Invitations (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let testUserId: string;
  let testOrgId: string;
  const testEmail = `org_tester_${Date.now()}@geocapx.com`;
  const inviteTargetEmail = `invitee_${Date.now()}@geocapx.com`;

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

    // Register & Login primary user
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: testEmail,
        password: 'Password123!',
        confirmPassword: 'Password123!',
        firstName: 'Org',
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
      try {
        await prisma.user.delete({ where: { email: inviteTargetEmail } });
      } catch (err) {}
      await prisma.$disconnect();
    }
    if (app) {
      await app.close();
    }
  });

  describe('POST /api/v1/organizations/:id/invitations', () => {
    it('should create an invite token and store invitation details', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/organizations/${testOrgId}/invitations`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email: inviteTargetEmail,
          role: 'MEMBER',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.email).toBe(inviteTargetEmail);
    });

    it('should list pending invitations for the organization', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/organizations/${testOrgId}/invitations`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].email).toBe(inviteTargetEmail);
    });
  });

  describe('POST /api/v1/organizations/invitations/accept', () => {
    it('should allow invited user to accept invite and join org', async () => {
      // 1. Create invite target user account
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: inviteTargetEmail,
          password: 'Password123!',
          confirmPassword: 'Password123!',
          firstName: 'Invited',
          lastName: 'User',
        });

      const inviteeLogin = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: inviteTargetEmail,
          password: 'Password123!',
        });
      const inviteeToken = inviteeLogin.body.data.accessToken;

      // Get invitation token from DB
      const invitation = await prisma.organizationInvitation.findFirst({
        where: { email: inviteTargetEmail },
      });
      expect(invitation).toBeDefined();
      if (!invitation) return;

      // 2. Accept invite
      const response = await request(app.getHttpServer())
        .post('/api/v1/organizations/invitations/accept')
        .set('Authorization', `Bearer ${inviteeToken}`)
        .send({
          token: invitation.token,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);

      // Verify user is now a member in DB
      const member = await prisma.organizationMember.findUnique({
        where: {
          organizationId_userId: {
            organizationId: testOrgId,
            userId: inviteeLogin.body.data.user.id,
          },
        },
      });
      expect(member).toBeDefined();
      expect(member?.role).toBe('MEMBER');
    });
  });
});
