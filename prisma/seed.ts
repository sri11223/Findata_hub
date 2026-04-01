/**
 * Prisma Seed Script
 * Creates initial system data: roles, categories, and demo users.
 *
 * Run with: npm run db:seed
 *
 * Demo Credentials:
 *   superadmin@findata.com  / SuperAdmin@123
 *   admin@findata.com       / Admin@123456
 *   analyst@findata.com     / Analyst@123
 *   viewer@findata.com      / Viewer@1234
 */

import { PrismaClient, Role, TransactionType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const SALT_ROUNDS = 12;

async function main() {
  console.log('🌱 Starting database seed...');

  // ── Categories ──────────────────────────────────────────────────────────────
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { name: 'Salary' },
      update: {},
      create: { name: 'Salary', type: 'INCOME', color: '#22c55e', description: 'Employment income' },
    }),
    prisma.category.upsert({
      where: { name: 'Investment Returns' },
      update: {},
      create: { name: 'Investment Returns', type: 'INCOME', color: '#3b82f6', description: 'Dividends, capital gains' },
    }),
    prisma.category.upsert({
      where: { name: 'Freelance' },
      update: {},
      create: { name: 'Freelance', type: 'INCOME', color: '#8b5cf6', description: 'Contract and freelance work' },
    }),
    prisma.category.upsert({
      where: { name: 'Business Revenue' },
      update: {},
      create: { name: 'Business Revenue', type: 'INCOME', color: '#f59e0b', description: 'Business income' },
    }),
    prisma.category.upsert({
      where: { name: 'Food & Dining' },
      update: {},
      create: { name: 'Food & Dining', type: 'EXPENSE', color: '#ef4444', description: 'Groceries and restaurants' },
    }),
    prisma.category.upsert({
      where: { name: 'Transport' },
      update: {},
      create: { name: 'Transport', type: 'EXPENSE', color: '#f97316', description: 'Fuel, transit, rideshare' },
    }),
    prisma.category.upsert({
      where: { name: 'Housing' },
      update: {},
      create: { name: 'Housing', type: 'EXPENSE', color: '#06b6d4', description: 'Rent, mortgage, utilities' },
    }),
    prisma.category.upsert({
      where: { name: 'Healthcare' },
      update: {},
      create: { name: 'Healthcare', type: 'EXPENSE', color: '#ec4899', description: 'Medical and wellness' },
    }),
    prisma.category.upsert({
      where: { name: 'Entertainment' },
      update: {},
      create: { name: 'Entertainment', type: 'EXPENSE', color: '#a855f7', description: 'Streaming, events, hobbies' },
    }),
    prisma.category.upsert({
      where: { name: 'Education' },
      update: {},
      create: { name: 'Education', type: 'BOTH', color: '#14b8a6', description: 'Courses, books, training' },
    }),
  ]);

  console.log(`✅ Seeded ${categories.length} categories`);

  // ── Users ───────────────────────────────────────────────────────────────────
  const users = [
    {
      email: 'superadmin@findata.com',
      password: await bcrypt.hash('SuperAdmin@123', SALT_ROUNDS),
      firstName: 'System',
      lastName: 'Administrator',
      role: Role.SUPER_ADMIN,
    },
    {
      email: 'admin@findata.com',
      password: await bcrypt.hash('Admin@123456', SALT_ROUNDS),
      firstName: 'Finance',
      lastName: 'Admin',
      role: Role.ADMIN,
    },
    {
      email: 'analyst@findata.com',
      password: await bcrypt.hash('Analyst@123', SALT_ROUNDS),
      firstName: 'Data',
      lastName: 'Analyst',
      role: Role.ANALYST,
    },
    {
      email: 'viewer@findata.com',
      password: await bcrypt.hash('Viewer@1234', SALT_ROUNDS),
      firstName: 'Dashboard',
      lastName: 'Viewer',
      role: Role.VIEWER,
    },
  ];

  const createdUsers: { id: string; email: string; role: string }[] = [];

  for (const userData of users) {
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: userData,
    });
    createdUsers.push({ id: user.id, email: user.email, role: user.role });
  }

  console.log(`✅ Seeded ${createdUsers.length} users`);

  // ── Sample Financial Records (for analyst user) ──────────────────────────
  const analystUser = createdUsers.find((u) => u.email === 'analyst@findata.com')!;
  const adminUser = createdUsers.find((u) => u.email === 'admin@findata.com')!;

  const salaryCategory = categories.find((c) => c.name === 'Salary')!;
  const foodCategory = categories.find((c) => c.name === 'Food & Dining')!;
  const transportCategory = categories.find((c) => c.name === 'Transport')!;
  const housingCategory = categories.find((c) => c.name === 'Housing')!;
  const investmentCategory = categories.find((c) => c.name === 'Investment Returns')!;

  const now = new Date();
  const sampleRecords = [
    // Last 3 months of data
    {
      userId: analystUser.id,
      amount: 8500,
      type: TransactionType.INCOME,
      categoryId: salaryCategory.id,
      date: new Date(now.getFullYear(), now.getMonth() - 2, 1),
      description: 'Monthly salary - February',
      tags: JSON.stringify(['salary', 'recurring']),
    },
    {
      userId: analystUser.id,
      amount: 1200,
      type: TransactionType.EXPENSE,
      categoryId: housingCategory.id,
      date: new Date(now.getFullYear(), now.getMonth() - 2, 3),
      description: 'Rent payment - February',
      tags: JSON.stringify(['rent', 'recurring']),
    },
    {
      userId: analystUser.id,
      amount: 340,
      type: TransactionType.EXPENSE,
      categoryId: foodCategory.id,
      date: new Date(now.getFullYear(), now.getMonth() - 2, 10),
      description: 'Groceries and dining',
      tags: JSON.stringify(['food']),
    },
    {
      userId: analystUser.id,
      amount: 8500,
      type: TransactionType.INCOME,
      categoryId: salaryCategory.id,
      date: new Date(now.getFullYear(), now.getMonth() - 1, 1),
      description: 'Monthly salary - March',
      tags: JSON.stringify(['salary', 'recurring']),
    },
    {
      userId: analystUser.id,
      amount: 1200,
      type: TransactionType.EXPENSE,
      categoryId: housingCategory.id,
      date: new Date(now.getFullYear(), now.getMonth() - 1, 3),
      description: 'Rent payment - March',
      tags: JSON.stringify(['rent', 'recurring']),
    },
    {
      userId: analystUser.id,
      amount: 450,
      type: TransactionType.INCOME,
      categoryId: investmentCategory.id,
      date: new Date(now.getFullYear(), now.getMonth() - 1, 15),
      description: 'Quarterly dividend',
      tags: JSON.stringify(['investment', 'passive']),
    },
    {
      userId: analystUser.id,
      amount: 85,
      type: TransactionType.EXPENSE,
      categoryId: transportCategory.id,
      date: new Date(now.getFullYear(), now.getMonth() - 1, 20),
      description: 'Monthly transit pass',
      tags: JSON.stringify(['transport', 'recurring']),
    },
    {
      userId: adminUser.id,
      amount: 12000,
      type: TransactionType.INCOME,
      categoryId: salaryCategory.id,
      date: new Date(now.getFullYear(), now.getMonth(), 1),
      description: 'Monthly salary - current month',
      tags: JSON.stringify(['salary', 'recurring']),
    },
  ];

  let recordsCreated = 0;
  for (const record of sampleRecords) {
    await prisma.financialRecord.create({ data: record as any });
    recordsCreated++;
  }

  console.log(`✅ Seeded ${recordsCreated} financial records`);
  console.log('\n📋 Demo user credentials:');
  console.log('  superadmin@findata.com  →  SuperAdmin@123  (SUPER_ADMIN)');
  console.log('  admin@findata.com       →  Admin@123456    (ADMIN)');
  console.log('  analyst@findata.com     →  Analyst@123     (ANALYST)');
  console.log('  viewer@findata.com      →  Viewer@1234     (VIEWER)');
  console.log('\n🎉 Seed complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
