/**
 * Integration tests — Authentication endpoints
 *
 * Requires a running PostgreSQL instance pointed to by DATABASE_URL in .env.test
 * Run: npm run test:integration
 */
import '../../helpers/test-setup';
import request from 'supertest';
import { createApp } from '../../../src/app';
import { prisma } from '../../../src/config/database';

const app = createApp();

// ── Helper ────────────────────────────────────────────────────────────────────

async function cleanupUser(email: string) {
  await prisma.user.deleteMany({ where: { email } });
}

const testEmail    = `int-test-${Date.now()}@example.com`;
const testPassword = 'Integration@123';

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /api/v1/auth/register', () => {
  afterAll(async () => {
    await cleanupUser(testEmail);
    await prisma.$disconnect();
  });

  it('201 — registers a new user', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email:     testEmail,
        password:  testPassword,
        firstName: 'Integration',
        lastName:  'Test',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.tokens.accessToken).toBeDefined();
    expect(res.body.data.tokens.refreshToken).toBeDefined();
    expect(res.body.data.user.password).toBeUndefined();
  });

  it('409 — duplicate email', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email:     testEmail,
        password:  testPassword,
        firstName: 'Integration',
        lastName:  'Test',
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('422 — missing required fields', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'nope@test.com' });

    expect(res.status).toBe(422);
    expect(res.body.errors).toBeDefined();
  });

  it('422 — weak password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email:     'weak@test.com',
        password:  '1234',
        firstName: 'A',
        lastName:  'B',
      });

    expect(res.status).toBe(422);
  });
});

describe('POST /api/v1/auth/login', () => {
  let createdEmail: string;

  beforeAll(async () => {
    createdEmail = `login-test-${Date.now()}@example.com`;
    await request(app).post('/api/v1/auth/register').send({
      email:     createdEmail,
      password:  testPassword,
      firstName: 'Login',
      lastName:  'Test',
    });
  });

  afterAll(async () => {
    await cleanupUser(createdEmail);
  });

  it('200 — returns tokens on valid credentials', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: createdEmail, password: testPassword });

    expect(res.status).toBe(200);
    expect(res.body.data.tokens.accessToken).toBeDefined();
  });

  it('401 — wrong password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: createdEmail, password: 'Wrong@1234' });

    expect(res.status).toBe(401);
  });

  it('401 — non-existent email', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'ghost@example.com', password: testPassword });

    expect(res.status).toBe(401);
  });
});

describe('GET /api/v1/auth/me', () => {
  let accessToken: string;
  let userEmail: string;

  beforeAll(async () => {
    userEmail = `me-test-${Date.now()}@example.com`;
    const res = await request(app).post('/api/v1/auth/register').send({
      email:     userEmail,
      password:  testPassword,
      firstName: 'Me',
      lastName:  'Test',
    });
    accessToken = res.body.data.tokens.accessToken;
  });

  afterAll(async () => {
    await cleanupUser(userEmail);
  });

  it('200 — returns current user profile', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(userEmail);
    expect(res.body.data.user.password).toBeUndefined();
  });

  it('401 — no token provided', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('401 — invalid token', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer this.is.invalid');

    expect(res.status).toBe(401);
  });
});
