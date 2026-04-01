# FinData Hub — Finance Data Processing & Access Control Backend

A production-grade REST API backend for a finance dashboard system, built with **Node.js + TypeScript + Express + PostgreSQL (Prisma ORM)**.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Access Control Model](#access-control-model)
5. [API Endpoints](#api-endpoints)
6. [Setup & Running](#setup--running)
7. [Testing](#testing)
8. [API Documentation (Swagger)](#api-documentation-swagger)
9. [Design Decisions & Assumptions](#design-decisions--assumptions)
10. [Security Considerations](#security-considerations)

---

## Architecture Overview

```
HTTP Request
    │
    ▼
Rate Limiter ──► Security Headers (Helmet) ──► CORS
    │
    ▼
Route (express Router)
    │
    ├── validate()       — Zod schema validation
    ├── authenticate()   — JWT Bearer token verification + DB user load
    ├── authorize()      — RBAC permission check
    │
    ▼
Controller           — HTTP layer: parse request → call service → send response
    │
    ▼
Service              — Business logic, ownership checks, cross-cutting rules
    │
    ▼
Repository           — Database queries (Prisma) — single responsibility per resource
    │
    ▼
PostgreSQL (Prisma ORM)
```

**Clean separation of concerns across every layer:**
- `controllers/` — HTTP only; never contain business logic
- `services/` — Business rules, access enforcement, orchestration
- `repositories/` — Pure database access; no business logic
- `middleware/` — Cross-cutting concerns (auth, RBAC, validation, error handling, logging)
- `validators/` — Zod schemas; single source of truth for input shapes
- `utils/` — Stateless pure helpers (JWT, pagination, date math, response formatting)
- `constants/` — Immutable configuration; permission → role mappings
- `types/` — TypeScript interfaces; not duplicated from Prisma

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 18+ |
| Language | TypeScript (strict mode) |
| Web Framework | Express 4 |
| Database | PostgreSQL 14+ |
| ORM | Prisma 5 |
| Authentication | JWT (access + refresh token rotation) |
| Password Hashing | bcrypt (12 rounds) |
| Validation | Zod |
| Rate Limiting | express-rate-limit |
| Security Headers | Helmet |
| Logging | Winston (structured JSON in prod, colourised in dev) |
| API Docs | Swagger UI (swagger-jsdoc + swagger-ui-express) |
| Testing | Jest + Supertest + ts-jest |

---

## Project Structure

```
findata-hub/
├── prisma/
│   ├── schema.prisma        ← Database schema (users, financial_records, categories, audit_logs)
│   └── seed.ts              ← Seeds demo users and categories
├── src/
│   ├── config/
│   │   ├── env.ts           ← Zod-validated environment variables
│   │   ├── database.ts      ← Prisma client singleton
│   │   └── swagger.ts       ← OpenAPI spec configuration
│   ├── constants/
│   │   ├── permissions.ts   ← Permission enum + ROLE_PERMISSIONS mapping
│   │   └── http-status.ts   ← HTTP status code constants
│   ├── types/
│   │   ├── auth.types.ts    ← JWT payload and AuthUser types
│   │   ├── user.types.ts    ← User DTO types
│   │   ├── financial.types.ts ← Record/dashboard DTO types
│   │   ├── common.types.ts  ← Pagination, ApiResponse shapes
│   │   └── express.d.ts     ← Express Request augmentation (req.user)
│   ├── utils/
│   │   ├── logger.ts        ← Winston logger
│   │   ├── errors.ts        ← Custom AppError hierarchy
│   │   ├── api-response.ts  ← Standardised response helpers
│   │   ├── pagination.ts    ← Pagination parsing and meta builders
│   │   ├── jwt.helpers.ts   ← sign / verify / extract token
│   │   └── date-helpers.ts  ← Date math (month ranges, week numbers)
│   ├── validators/
│   │   ├── auth.validator.ts
│   │   ├── user.validator.ts
│   │   └── financial.validator.ts
│   ├── middleware/
│   │   ├── authenticate.middleware.ts   ← JWT verification → req.user
│   │   ├── authorize.middleware.ts      ← Permission / role gate
│   │   ├── rate-limiter.middleware.ts   ← Global + auth limiters
│   │   ├── validate.middleware.ts       ← Zod validation pipe
│   │   ├── error-handler.middleware.ts  ← Global error handler
│   │   └── request-logger.middleware.ts ← Morgan HTTP logging
│   ├── repositories/
│   │   ├── user.repository.ts
│   │   ├── financial.repository.ts      ← Records + categories + aggregations
│   │   └── audit.repository.ts
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── user.service.ts
│   │   ├── financial.service.ts
│   │   └── dashboard.service.ts
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── user.controller.ts
│   │   ├── financial.controller.ts
│   │   └── dashboard.controller.ts
│   ├── routes/
│   │   ├── v1/
│   │   │   ├── auth.routes.ts
│   │   │   ├── user.routes.ts
│   │   │   ├── financial.routes.ts
│   │   │   ├── dashboard.routes.ts
│   │   │   └── index.ts
│   │   └── index.ts
│   ├── app.ts               ← Express app factory
│   └── server.ts            ← Process entry point + graceful shutdown
├── tests/
│   ├── unit/services/       ← AuthService, UserService, FinancialService
│   ├── unit/utils/          ← Pagination utilities
│   ├── integration/         ← Auth + Financial endpoint tests (real DB)
│   └── helpers/test-setup.ts
├── .env.example
├── .env.test
├── jest.config.ts
├── tsconfig.json
└── package.json
```

---

## Access Control Model

### Roles

| Role | Description |
|---|---|
| `VIEWER` | Read-only access to own records and summary dashboard |
| `ANALYST` | Can create and manage own records; full analytics access |
| `ADMIN` | Full record management; user management (except role changes) |
| `SUPER_ADMIN` | All permissions including role changes and user deletion |

### Permission Matrix

| Permission | VIEWER | ANALYST | ADMIN | SUPER_ADMIN |
|---|:---:|:---:|:---:|:---:|
| View own records | ✅ | ✅ | ✅ | ✅ |
| View all records | ❌ | ✅ | ✅ | ✅ |
| Create records | ❌ | ✅ | ✅ | ✅ |
| Update own records | ❌ | ✅ | ✅ | ✅ |
| Update any record | ❌ | ❌ | ✅ | ✅ |
| Delete records | ❌ | ❌ | ✅ | ✅ |
| View dashboard summary | ✅ | ✅ | ✅ | ✅ |
| View analytics | ❌ | ✅ | ✅ | ✅ |
| View/manage categories | read | read | ✅ | ✅ |
| List/create users | ❌ | ❌ | ✅ | ✅ |
| Change user status | ❌ | ❌ | ✅ | ✅ |
| Change user role | ❌ | ❌ | ❌ | ✅ |
| Delete users | ❌ | ❌ | ❌ | ✅ |

---

## API Endpoints

Base URL: `http://localhost:3000/api/v1`

### Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | None | Register a new VIEWER account |
| POST | `/auth/login` | None | Log in, receive access + refresh tokens |
| POST | `/auth/refresh` | None | Refresh access token |
| POST | `/auth/logout` | Bearer | Invalidate session |
| GET | `/auth/me` | Bearer | Get own profile |

### Users (Admin+)

| Method | Endpoint | Auth | Permission |
|---|---|---|---|
| GET | `/users` | Bearer | `READ_ALL_USERS` |
| POST | `/users` | Bearer | `CREATE_USER` |
| GET | `/users/:id` | Bearer | `READ_ALL_USERS` |
| PATCH | `/users/:id` | Bearer | `UPDATE_USER` |
| PATCH | `/users/:id/status` | Bearer | `UPDATE_USER_STATUS` |
| PATCH | `/users/:id/role` | Bearer | `CHANGE_USER_ROLE` (Super Admin only) |
| DELETE | `/users/:id` | Bearer | `DELETE_USER` (Super Admin only) |

### Financial Records

| Method | Endpoint | Auth | Permission |
|---|---|---|---|
| GET | `/financial/records` | Bearer | `READ_OWN_RECORDS`+ |
| POST | `/financial/records` | Bearer | `CREATE_RECORD` (Analyst+) |
| GET | `/financial/records/:id` | Bearer | `READ_OWN_RECORDS`+ |
| PATCH | `/financial/records/:id` | Bearer | `UPDATE_OWN_RECORD`+ |
| DELETE | `/financial/records/:id` | Bearer | `DELETE_RECORD` (Admin+) |

**Query params for `GET /financial/records`:** `type`, `categoryId`, `startDate`, `endDate`, `search`, `page`, `limit`, `sortBy`, `sortOrder`

### Categories

| Method | Endpoint | Auth | Permission |
|---|---|---|---|
| GET | `/financial/categories` | Bearer | All roles |
| GET | `/financial/categories/:id` | Bearer | All roles |
| POST | `/financial/categories` | Bearer | Admin+ |
| PATCH | `/financial/categories/:id` | Bearer | Admin+ |
| DELETE | `/financial/categories/:id` | Bearer | Admin+ |

### Dashboard

| Method | Endpoint | Auth | Permission |
|---|---|---|---|
| GET | `/dashboard/summary` | Bearer | All roles |
| GET | `/dashboard/analytics` | Bearer | Analyst+ |
| GET | `/dashboard/trends` | Bearer | Analyst+ |
| GET | `/dashboard/categories` | Bearer | Analyst+ |
| GET | `/dashboard/recent` | Bearer | All roles |

---

## Setup & Running

### Prerequisites

- Node.js 18+
- PostgreSQL 14+ running locally (or connection string to a hosted instance)

### 1. Clone and install dependencies

```bash
cd "d:\FinData Hub"
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` — set `DATABASE_URL`, `JWT_ACCESS_SECRET`, and `JWT_REFRESH_SECRET`:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/findata_hub
JWT_ACCESS_SECRET=replace-with-a-long-random-string-32-chars-min
JWT_REFRESH_SECRET=replace-with-another-long-random-string
```

### 3. Set up the database

```bash
# Generate the Prisma client
npm run db:generate

# Run migrations (creates the database schema)
npm run db:migrate

# Seed demo data (users + categories)
npm run db:seed
```

### 4. Run in development

```bash
npm run dev
```

The server starts at **http://localhost:3000**

- Health check: http://localhost:3000/health
- API docs: http://localhost:3000/api/docs

### 5. Build for production

```bash
npm run build
npm start
```

---

## Demo Credentials (after seeding)

| Email | Password | Role |
|---|---|---|
| superadmin@findata.com | SuperAdmin@123 | SUPER_ADMIN |
| admin@findata.com | Admin@123456 | ADMIN |
| analyst@findata.com | Analyst@123 | ANALYST |
| viewer@findata.com | Viewer@1234 | VIEWER |

---

## Testing

### Unit tests (no database required)

```bash
npm run test:unit
```

Covers: `AuthService`, `UserService`, `FinancialService`, pagination utilities.  
Prisma and bcrypt are mocked — tests run in isolation.

### Integration tests (requires PostgreSQL)

```bash
# Make sure .env.test points to the test DB
npm run test:integration
```

Covers: full HTTP request/response cycle for auth and financial record endpoints.

### All tests with coverage report

```bash
npm run test:coverage
```

---

## API Documentation (Swagger)

Interactive Swagger UI is available at:

```
http://localhost:3000/api/docs
```

Raw OpenAPI JSON:

```
http://localhost:3000/api/docs.json
```

---

## Design Decisions & Assumptions

### Authentication: JWT with Refresh Token Rotation

Access tokens are short-lived (15 min). Refresh tokens are stored in the database and rotated on every refresh call. If a previously-used refresh token is presented again (possible token theft), all sessions are immediately invalidated.

### Soft Deletes

Financial records and users are never hard-deleted. Records get `status = DELETED` and `deletedAt` timestamp; users get `deletedAt` + `status = INACTIVE`. This preserves audit history and allows recovery.

### Ownership vs. Role Access

Services enforce both **permission** checks and **ownership** checks:
- An ANALYST can only update/read their own records
- An ADMIN or SUPER_ADMIN can read/update/delete any record
- A VIEWER accessing another user's record receives a `404` (not `403`), preventing resource enumeration

### VIEWER Dashboard Scoping

VIEWER-role users always have their `userId` injected into queries automatically — they cannot opt to see all data even if they craft a request to do so.

### Database Indexes

All foreign keys, enum filter columns, and date columns are indexed. Compound indexes on `(userId, date)` and `(userId, type)` accelerate the most common dashboard queries.

### Category Model

Categories are system-level entities managed by admins. Records reference an optional `categoryId`. Categories have a `type` field (`INCOME` / `EXPENSE` / `BOTH`) to support future UI filtering.

### Rate Limiting

- Global: 100 requests / 15 minutes per IP
- Auth endpoints (login, register): 10 requests / 15 minutes per IP

Both limiters are disabled in the `test` environment via the `skip` option.

### Environment Validation

All environment variables are validated at startup using Zod. Missing or malformed configuration causes an immediate crash with a clear error message — no silent misconfiguration in production.

---

## Security Considerations

| Concern | Mitigation |
|---|---|
| SQL Injection | Prisma parameterised queries — no raw SQL |
| Password Storage | bcrypt with 12 rounds |
| JWT Secret Exposure | Secrets validated present at startup; never logged |
| Token Replay | Refresh token rotation; reuse detected and all sessions invalidated |
| Horizontal Privilege Escalation | Service layer checks ownership before allowing mutations |
| Vertical Privilege Escalation | `CHANGE_USER_ROLE` only allows assigning roles strictly below the requester's own role |
| Brute Force | Per-IP rate limiting on auth endpoints (10 req / 15 min) |
| XSS / Clickjacking | Helmet sets Content-Security-Policy, X-Frame-Options, etc. |
| Mass Assignment | Validation schemas whitelist only known fields; no `req.body` passed directly to Prisma |
| Error Information Leakage | Generic error messages for unexpected errors; stack traces never sent to the client |

---

## Frontend (React Dashboard)

A production-quality **React + TypeScript + Tailwind CSS** dashboard that consumes all backend API endpoints with full RBAC integration.

### Frontend Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + Vite 5 |
| Language | TypeScript |
| Styling | Tailwind CSS 3 |
| Routing | React Router 6 |
| HTTP Client | Axios (with JWT interceptors) |
| Charts | Recharts (Area, Bar, Pie, Line, Radial) |
| Icons | Lucide React |
| Notifications | React Hot Toast |

### Frontend Features

- **Authentication** — Login/Register pages with JWT token management and auto-refresh
- **RBAC-aware UI** — Sidebar navigation, page access, and action buttons conditionally rendered based on user permissions
- **Dashboard** — Summary cards (income, expenses, net balance, record count), monthly trends area chart, expense pie chart, income vs expense bar chart, recent activity feed
- **Analytics** — Dedicated page (Analyst+) with net balance line chart, income/expense category pie charts, top expense bar chart, period selector
- **Records** — Search, type/category/sort filters, paginated table, create/edit/delete with modals, RBAC-gated actions
- **Categories** — Grid card layout with color swatches, CRUD modals (Admin+)
- **User Management** — User table (Admin+) with inline role changer, status toggles (activate/suspend), create/edit/delete

### Running the Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend runs at **http://localhost:5173** and proxies API requests to the backend at `http://localhost:3000`.

---

## Assumptions Made

1. A user registers with the `VIEWER` role by default. Admins can create users with a specified role via `POST /users`.
2. Financial records belong to the user who created them. Admins can view and manage all records.
3. Categories are global (not per-user) and managed by admins.
4. The `tags` field on financial records is stored as JSON to maintain schema portability.
5. The `amount` field supports up to 13 integer digits and 2 decimal places (suitable for most currencies).
6. Pagination defaults to page 1, limit 20, maximum limit 100.
7. Dashboard date range filters are optional — omitting them returns all-time data.
