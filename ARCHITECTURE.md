# Architecture

This document walks through the internal architecture of FinData Hub — what happens when a request hits the server, how access control decisions get made, and why the pieces are laid out the way they are.

---

## How a Request Flows Through the System

Every incoming HTTP request goes through the same stack of middleware before it reaches any business logic. This isn't accidental — the ordering matters.

```
Client Request
      │
      ▼
  Helmet            ← Sets security headers (CSP, X-Frame-Options, etc.)
      │
      ▼
  CORS              ← Validates the request origin against the whitelist
      │
      ▼
  Body Parser       ← Parses JSON, caps payload at 1MB to prevent abuse
      │
      ▼
  Compression       ← Gzips responses to save bandwidth
      │
      ▼
  Request Logger    ← Morgan logs method, path, status, and duration
      │
      ▼
  Rate Limiter      ← Rejects if the IP has exceeded its quota
      │
      ▼
  Router            ← Matches method + path to a handler chain
      │
      ├─ validate()       Zod schema check on body/params/query
      ├─ authenticate()   JWT verification + user lookup from DB
      ├─ authorize()      Permission check against role
      │
      ▼
  Controller        ← Parses the request, calls the service, formats the response
      │
      ▼
  Service           ← Business logic: ownership checks, rule enforcement
      │
      ▼
  Repository        ← Prisma query — the only layer that touches the database
      │
      ▼
  PostgreSQL
```

The important thing here is that **no layer skips any other**. A controller never queries the database directly. A repository never checks permissions. A service never sends an HTTP response. Each layer has exactly one job.

---

## Access Control: How RBAC Actually Works Here

The RBAC system has two parts, and they work together but at different points in the request lifecycle.

### Part 1: Permission Gates (Middleware)

There are 17 granular permissions defined in `constants/permissions.ts`. Each role has a fixed set:

| Permission | VIEWER | ANALYST | ADMIN | SUPER_ADMIN |
|---|:---:|:---:|:---:|:---:|
| READ_OWN_RECORDS | ✓ | ✓ | ✓ | ✓ |
| READ_ALL_RECORDS | | ✓ | ✓ | ✓ |
| CREATE_RECORD | | ✓ | ✓ | ✓ |
| UPDATE_OWN_RECORD | | ✓ | ✓ | ✓ |
| UPDATE_ANY_RECORD | | | ✓ | ✓ |
| DELETE_RECORD | | | ✓ | ✓ |
| READ_ANALYTICS | | ✓ | ✓ | ✓ |
| MANAGE_CATEGORIES | | | ✓ | ✓ |
| CREATE_USER | | | ✓ | ✓ |
| CHANGE_USER_ROLE | | | | ✓ |
| DELETE_USER | | | | ✓ |

When a route is defined, it specifies which permissions it needs:

```typescript
router.post('/records', authenticate, authorize(Permission.CREATE_RECORD), controller.create);
```

The `authorize()` middleware factory checks if the user's role has all the required permissions. If not, it returns 403 with a message that tells the user exactly which permission they're missing. This is a deliberate trade-off — in an internal tool, clarity is more valuable than obscurity.

### Part 2: Ownership Checks (Service Layer)

Permission gates alone aren't enough. An ANALYST with `UPDATE_OWN_RECORD` should only update records they created, not anyone else's. But the middleware can't know this — it doesn't have access to the record being modified.

So the service layer performs a second check:

```typescript
// In FinancialService.updateRecord():
const canUpdateAny = hasPermission(requesterRole, Permission.UPDATE_ANY_RECORD);
const canUpdateOwn = hasPermission(requesterRole, Permission.UPDATE_OWN_RECORD);

if (!canUpdateAny && !(canUpdateOwn && record.userId === requesterId)) {
  throw new ForbiddenError('Cannot update records belonging to other users');
}
```

There's a subtle detail here: when a VIEWER tries to access a record that belongs to someone else, the system returns 404 — not 403. This prevents resource enumeration. If an attacker is trying to probe for valid record IDs, a 403 would confirm the record exists but is forbidden. A 404 reveals nothing.

### Part 3: Role Hierarchy

Some operations don't map to individual permissions — they need to compare roles. For example, `CHANGE_USER_ROLE` on the backend also checks that you can only assign roles strictly below your own. A SUPER_ADMIN can promote someone to ADMIN, but an ADMIN cannot make another ADMIN.

This is enforced through `ROLE_HIERARCHY`, a numeric mapping:

```typescript
const ROLE_HIERARCHY = { VIEWER: 1, ANALYST: 2, ADMIN: 3, SUPER_ADMIN: 4 };
```

---

## Authentication: Why Token Rotation Matters

The auth system uses short-lived access tokens (15 minutes) and long-lived refresh tokens (7 days). This is a common pattern, but the implementation includes one important protection: **refresh token rotation with reuse detection**.

Here's what happens during a normal refresh:

1. Client sends the old refresh token
2. Server verifies the token signature and checks it matches the one stored in the database
3. Server generates a new access + refresh token pair
4. Server stores the new refresh token in the database, invalidating the old one
5. Server returns the new pair

Now the critical case: what if an attacker steals a refresh token and uses it after the legitimate user has already refreshed?

1. Attacker sends the stolen refresh token
2. Server verifies the signature — it's valid
3. Server compares it to the stored token — **they don't match** (because the user already refreshed)
4. Server detects token reuse → immediately sets the stored token to `null`
5. Both the attacker AND the user are logged out

This is intentional. If token reuse is detected, the safest thing is to invalidate everything and force a fresh login. The user gets inconvenienced for 30 seconds; the attacker gets locked out.

### Login Timing Attack Prevention

There's another detail worth mentioning. In the login flow, even when the email doesn't match any user, the system still runs `bcrypt.compare()` against a dummy hash:

```typescript
const dummyHash = '$2a$12$invalidhashinvalidhashinvalidha';
const passwordMatch = await bcrypt.compare(input.password, user?.password ?? dummyHash);
```

Without this, an attacker could measure response times to figure out which emails exist in the system. If the server responds in 2ms for "user not found" but 300ms for "password wrong" (because bcrypt is intentionally slow), that timing difference leaks information. The dummy hash keeps response times consistent regardless of whether the user exists.

---

## The Error System

Errors in the system follow a throw-and-catch pattern. Business logic throws typed errors, and a single global middleware catches them all.

```
AppError (base)
  ├── NotFoundError       → 404
  ├── UnauthorizedError   → 401
  ├── ForbiddenError      → 403
  ├── ConflictError       → 409
  ├── ValidationError     → 422
  └── BadRequestError     → 400
```

The error handler also catches Prisma-specific errors (unique constraint violations, foreign key issues) and Zod validation failures. Each gets mapped to the right HTTP status and a useful error message.

What the handler does NOT do: leak stack traces in production. Unexpected errors get a generic "Internal server error" message. The real error is logged server-side by Winston, but the client never sees implementation details.

---

## Data Access Pattern

The repository layer is the only code that touches Prisma. This is enforced by convention, not by tooling — but it's followed consistently:

- `user.repository.ts` handles `User` queries
- `financial.repository.ts` handles `FinancialRecord` and `Category` queries
- `audit.repository.ts` handles `AuditLog` writes

Each repository returns plain objects, not Prisma model instances. The services never see Prisma types directly. This matters for testability — the unit tests mock the repositories, not Prisma, which keeps them fast and isolated from the database.

### Soft Deletes

Neither users nor financial records are ever hard-deleted. Both have a `deletedAt` timestamp and a status field (`status: DELETED` for records, `status: INACTIVE` for users). All queries filter out soft-deleted rows automatically:

```typescript
where: { deletedAt: null }
```

This preserves audit history and supports recovery without complicating the data model.

### Indexes

The schema includes 15+ indexes tuned for the most common access patterns:

- `(userId, date)` — most dashboard queries filter by user and date range
- `(userId, type)` — income vs. expense filtering
- `(userId, status)` — active records per user
- Individual indexes on `email`, `role`, `status`, `categoryId`, `date`, `createdAt`

These were added proactively rather than reactively. The schema is designed for a real dashboard workload where reads outnumber writes significantly.

---

## Frontend Architecture

The React frontend mirrors the backend's RBAC model. It doesn't just hide UI elements — it enforces access at the routing level.

### How RBAC Works in the Frontend

1. **Login** stores the user's role in context
2. **`ProtectedRoute`** wraps every dashboard route, checking both authentication and permission
3. **Sidebar navigation** only shows links the user's role permits
4. **Action buttons** (edit, delete, create) conditionally render based on `hasPermission()`

This is purely a UX concern — the real enforcement still happens on the backend. But it prevents users from seeing buttons that will just return 403.

### API Communication

The Axios client handles JWT lifecycle automatically:
- Attaches the access token to every request via a request interceptor
- On 401, queues concurrent requests, refreshes the token, then replays them
- If the refresh fails, clears local storage and redirects to login

This is transparent to page components. They just call `api.get()` / `api.post()` and don't think about auth.

---

## What the System Does NOT Do (and Why)

A few features were deliberately scoped out:

- **No WebSocket / real-time updates**: The dashboard is a polling model. For a finance dashboard where data changes are not time-critical, polling on page load is simpler and more predictable than maintaining WebSocket connections.

- **No per-field audit trail**: Audit logs record actions (created, updated, deleted) but don't store before/after diffs. The tradeoff here is simplicity — field-level diffing adds schema complexity for limited benefit in a dashboard context.

- **No multi-tenancy**: All users share one data space. Categories are global. This keeps the data model flat and avoids the complexity of tenant isolation. For a single-organization finance dashboard, this is the right call.

- **No caching layer (Redis)**: Queries hit the database directly. The compound indexes provide enough performance for the expected scale. Caching would add operational complexity without a measurable benefit at this size.

These aren't oversights — they're conscious scope decisions. Each one could be added if the system needed to scale, but none are necessary for the current requirements.

---

## Scaling Considerations

If this system needed to handle significantly more load, here's what would change first:

1. **Connection pooling**: Neon already provides connection pooling via its pooler endpoint. For a self-hosted PostgreSQL, PgBouncer would sit in front.

2. **Read replicas**: Dashboard summary queries are read-heavy. Directing them to a read replica would reduce primary database load.

3. **Background jobs**: Heavy aggregations (monthly reports, trend calculations) could be moved to a job queue (BullMQ) so they don't block API response times.

4. **API caching**: Redis-backed caching on dashboard endpoints with short TTLs (30-60s) would handle repeated dashboard loads without re-querying.

5. **Horizontal scaling**: The application is stateless — JWT tokens are self-contained, and there's no server-side session store. Multiple instances can run behind a load balancer with no coordination needed.

None of this is built today because it isn't needed today. The architecture doesn't prevent any of these additions.
