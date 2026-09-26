import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';
import cookieParser from 'cookie-parser';

describe('Authentication System (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const testEmail = `testuser_${Date.now()}@geocapx.com`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    // Register middleware to match main.ts
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI });

    await app.init();
    prisma = moduleFixture.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    // Cleanup the database test entries
    if (prisma) {
      try {
        const testUser = await prisma.user.findUnique({ where: { email: testEmail } });
        if (testUser) {
          await prisma.user.delete({ where: { id: testUser.id } });
        }
      } catch (error) {
        // Ignore DB connection clean failures
      }
      await prisma.$disconnect();
    }
    if (app) {
      await app.close();
    }
  });

  describe('POST /api/v1/auth/register', () => {
    it('should reject registration if passwords do not match (Validation)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: testEmail,
          password: 'Password123!',
          confirmPassword: 'DifferentPassword123!',
          firstName: 'E2E',
          lastName: 'Tester',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject registration if email is invalid (Validation)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: 'not-an-email',
          password: 'Password123!',
          confirmPassword: 'Password123!',
          firstName: 'E2E',
          lastName: 'Tester',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should successfully register a new user and database entity (Auth + DB)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          email: testEmail,
          password: 'Password123!',
          confirmPassword: 'Password123!',
          firstName: 'E2E',
          lastName: 'Tester',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);

      // Verify DB record existence
      const dbUser = await prisma.user.findUnique({ where: { email: testEmail } });
      expect(dbUser).toBeDefined();
      expect(dbUser?.isEmailVerified).toBe(false); // default state
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should reject login with wrong password (Auth)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testEmail,
          password: 'WrongPassword!',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should login successfully, return accessToken, and set HttpOnly cookie (Auth)', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testEmail,
          password: 'Password123!',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.user.email).toBe(testEmail);

      // Verify cookie
      const cookies = response.headers['set-cookie'] || [];
      const hasRefreshCookie = cookies.some((c: string) => c.includes('refreshToken='));
      expect(hasRefreshCookie).toBe(true);
    });
  });

  describe('GET /api/v1/profile (Guards & Authorization)', () => {
    it('should reject profile request without bearer token', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/profile');

      expect(response.status).toBe(401);
    });

    it('should return profile details with correct authorization token', async () => {
      // 1. Get access token
      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testEmail,
          password: 'Password123!',
        });

      const token = loginResponse.body.data.accessToken;

      // 2. Fetch profile
      const response = await request(app.getHttpServer())
        .get('/api/v1/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe(testEmail);
    });
  });
});
