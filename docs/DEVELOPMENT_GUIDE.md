# Developer Onboarding & Environment Guide — Synchro

## 1. Prerequisites
- **Node.js**: `v20.x` or `v24.x`
- **Package Manager**: `npm`
- **Database**: PostgreSQL (Any local or hosted PostgreSQL instance)

---

## 2. Environment Variables Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

| Variable | Required | Description | Example |
|---|:---:|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string | `postgresql://postgres:password@localhost:5432/synchro_db?schema=public` |
| `NEXTAUTH_SECRET` | Yes | 32+ char secret for session token signing | Generate via `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Yes | Canonical base URL | `http://localhost:3000` |
| `NODE_ENV` | No | Environment mode | `development` / `production` |

---

## 3. Database Initialization & Seed

1. Generate Prisma client:
   ```bash
   npx prisma generate
   ```
2. Apply schema migrations:
   ```bash
   npx prisma db push
   ```
3. Seed default workspace and test accounts:
   ```bash
   npx tsx prisma/seed.ts
   ```
   *Creates:*
   - **Workspace**: "Engineering Workspace" (`slug: engineering`)
   - **Admin Member**: `admin@test.com` / `Admin123!` (Role: `ADMIN` in workspace)
   - **Manager Member**: `manager@test.com` / `Manager123!` (Role: `MANAGER` in workspace)
   - **Regular Member**: `member@test.com` / `Member123!` (Role: `MEMBER` in workspace)

---

## 4. Comprehensive Verification Pipeline

Synchro requires all changes to pass the full quality and security verification gate:

```bash
# 1. Type Safety Check
npx tsc --noEmit

# 2. Code Linting
npm run lint

# 3. Prisma Schema Validation
npx prisma validate

# 4. Production Build Verification
npm run build

# 5. Dependency Security Audit
npm audit
```
