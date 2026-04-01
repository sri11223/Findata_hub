/**
 * Integration tests — Financial Records endpoints
 *
 * Requires a running PostgreSQL instance (see .env.test).
 */
import '../../helpers/test-setup';
import request from 'supertest';
import { createApp } from '../../../src/app';
import { prisma } from '../../../src/config/database';
import { Role } from '@prisma/client';

const app = createApp();

// ── Helpers ───────────────────────────────────────────────────────────────────

async function registerAndLogin(email: string, role?: Role) {
  const password = 'TestPass@123';

  const regRes = await request(app).post('/api/v1/auth/register').send({
    email,
    password,
    firstName: 'FTest',
    lastName:  'User',
  });

  // Promote role in DB if needed
  if (role && role !== Role.VIEWER) {
    await prisma.user.update({
      where: { email },
      data:  { role },
    });
    // Re-login to get token with the correct role in JWT
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password });
    return { token: loginRes.body.data.tokens.accessToken, userId: regRes.body.data.user.id };
  }

  return {
    token:  regRes.body.data.tokens.accessToken,
    userId: regRes.body.data.user.id,
  };
}

async function cleanup(emails: string[]) {
  for (const email of emails) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      await prisma.financialRecord.deleteMany({ where: { userId: user.id } });
      await prisma.user.delete({ where: { id: user.id } });
    }
  }
}

const ts = Date.now();
const analystEmail = `analyst-${ts}@example.com`;
const viewerEmail  = `viewer-${ts}@example.com`;

let analystToken: string;
let viewerToken: string;
let createdRecordId: string;

// ── Suite ─────────────────────────────────────────────────────────────────────

beforeAll(async () => {
  const analyst = await registerAndLogin(analystEmail, Role.ANALYST);
  analystToken = analyst.token;

  const viewer = await registerAndLogin(viewerEmail, Role.VIEWER);
  viewerToken = viewer.token;
});

afterAll(async () => {
  await cleanup([analystEmail, viewerEmail]);
  await prisma.$disconnect();
});

// ── POST /financial/records ───────────────────────────────────────────────────

describe('POST /api/v1/financial/records', () => {
  it('201 — analyst can create a record', async () => {
    const res = await request(app)
      .post('/api/v1/financial/records')
      .set('Authorization', `Bearer ${analystToken}`)
      .send({
        amount:      1500,
        type:        'INCOME',
        date:        new Date().toISOString(),
        description: 'Test income record',
        tags:        ['test'],
      });

    expect(res.status).toBe(201);
    expect(Number(res.body.data.record.amount)).toBe(1500);
    createdRecordId = res.body.data.record.id;
  });

  it('403 — viewer cannot create a record', async () => {
    const res = await request(app)
      .post('/api/v1/financial/records')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        amount: 100,
        type:   'INCOME',
        date:   new Date().toISOString(),
      });

    expect(res.status).toBe(403);
  });

  it('422 — invalid amount (negative)', async () => {
    const res = await request(app)
      .post('/api/v1/financial/records')
      .set('Authorization', `Bearer ${analystToken}`)
      .send({
        amount: -50,
        type:   'INCOME',
        date:   new Date().toISOString(),
      });

    expect(res.status).toBe(422);
  });

  it('401 — unauthenticated request rejected', async () => {
    const res = await request(app)
      .post('/api/v1/financial/records')
      .send({ amount: 100, type: 'INCOME', date: new Date().toISOString() });

    expect(res.status).toBe(401);
  });
});

// ── GET /financial/records ────────────────────────────────────────────────────

describe('GET /api/v1/financial/records', () => {
  it('200 — analyst can list records', async () => {
    const res = await request(app)
      .get('/api/v1/financial/records')
      .set('Authorization', `Bearer ${analystToken}`);

    expect(res.status).toBe(200);
    expect(res.body.meta.pagination).toBeDefined();
    expect(Array.isArray(res.body.data.records)).toBe(true);
  });

  it('200 — viewer can list own records', async () => {
    const res = await request(app)
      .get('/api/v1/financial/records')
      .set('Authorization', `Bearer ${viewerToken}`);

    expect(res.status).toBe(200);
  });

  it('200 — supports type filter', async () => {
    const res = await request(app)
      .get('/api/v1/financial/records?type=INCOME')
      .set('Authorization', `Bearer ${analystToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.records.every((r: { type: string }) => r.type === 'INCOME')).toBe(true);
  });
});

// ── GET /financial/records/:id ────────────────────────────────────────────────

describe('GET /api/v1/financial/records/:id', () => {
  it('200 — returns the record', async () => {
    if (!createdRecordId) return; // guard

    const res = await request(app)
      .get(`/api/v1/financial/records/${createdRecordId}`)
      .set('Authorization', `Bearer ${analystToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.record.id).toBe(createdRecordId);
  });

  it('404 — non-existent record', async () => {
    const res = await request(app)
      .get('/api/v1/financial/records/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${analystToken}`);

    expect(res.status).toBe(404);
  });
});

// ── PATCH /financial/records/:id ──────────────────────────────────────────────

describe('PATCH /api/v1/financial/records/:id', () => {
  it('200 — analyst can update own record', async () => {
    if (!createdRecordId) return;

    const res = await request(app)
      .patch(`/api/v1/financial/records/${createdRecordId}`)
      .set('Authorization', `Bearer ${analystToken}`)
      .send({ description: 'Updated description' });

    expect(res.status).toBe(200);
    expect(res.body.data.record.description).toBe('Updated description');
  });
});
