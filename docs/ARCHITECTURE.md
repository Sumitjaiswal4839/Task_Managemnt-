# System Architecture & Technical Specification — Synchro

## 1. Executive Summary & Core Mission
**Synchro** is an enterprise-grade collaborative task management application engineered for multi-tenant workspace isolation, strict data consistency, and fine-grained role-based access control (RBAC). Modeled as a lightweight Jira/Trello hybrid, it empowers organizations to orchestrate workflows across defined workspaces where user capabilities are governed by their specific workspace membership role (`ADMIN`, `MANAGER`, `MEMBER`).

---

## 2. Multi-Tenant Layered Architecture

Synchro enforces a unidirectional dependency flow across five core tiers with explicit workspace boundaries:

```
┌─────────────────────────────────────────────────────────┐
│                    Presentation Layer                   │
│   (Next.js 15 App Router + React Server/Client Comps)   │
└────────────────────────────┬────────────────────────────┘
                             │ HTTP / Server Action Calls
                             ▼
┌─────────────────────────────────────────────────────────┐
│                API / Controller Layer                   │
│      (Route Handlers with Zod Validation & Session)     │
│   [Scoped to: /api/workspaces/[workspaceId]/...]       │
└────────────────────────────┬────────────────────────────┘
                             │ DTOs + Workspace Membership Context
                             ▼
┌─────────────────────────────────────────────────────────┐
│                     Service Layer                       │
│    (Domain Logic, Invariant Enforcers, State Machine)   │
│         [Argon2id Hashing + Workspace RBAC Guards]      │
└────────────────────────────┬────────────────────────────┘
                             │ Atomic Transactions ($transaction)
                             ▼
┌─────────────────────────────────────────────────────────┐
│               Repository / Data Access Layer            │
│         (Prisma ORM Client with Parameterized SQL)      │
└────────────────────────────┬────────────────────────────┘
                             │ Pooled TCP / pg Connection
                             ▼
┌─────────────────────────────────────────────────────────┐
│                 Database Layer (PostgreSQL)             │
│        (Workspaces, Memberships, Tasks, Audits)         │
└────────────────────────────┬────────────────────────────┘
```

### Layer Responsibilities

1. **Presentation Layer (`app/`, `components/`)**:
   - Renders intuitive, responsive interfaces using Tailwind CSS and semantic HTML5.
   - Handles client-side UX: instant feedback, loading indicators, optimistic transitions, accessible forms.
   - **Crucial Invariant**: Client UI never makes authorization assumptions; buttons may be hidden for UX, but authorization is strictly verified downstream in the workspace context.

2. **API & Route Handler Layer (`app/api/**/route.ts`)**:
   - Validates incoming request headers, database session cookies, and payloads using Zod schemas.
   - Resolves authenticated context (`userId`) and verifies caller's `Membership` in the target `workspaceId`.
   - Rejects unauthenticated/unauthorized payloads before domain logic execution (`401 Unauthorized` / `403 Forbidden`).
   - Formats responses into standardized RFC 7807 problem details on errors.

3. **Domain Service Layer (`lib/services/`)**:
   - Enforces workspace-level authorization matrix (`ADMIN`, `MANAGER`, `MEMBER`).
   - Password hashing strictly powered by **Argon2id** (OWASP recommended memory-hard hashing).
   - Manages state machine transitions (`TODO` ➔ `IN_PROGRESS` ➔ `DONE`) with Optimistic Concurrency Control (`version`).
   - Emits structured `ActivityLog` entries inside atomic transactions (`prisma.$transaction`).

4. **Repository & Data Access Layer (`lib/prisma.ts`)**:
   - Single source of truth for database access via a cached Prisma singleton client.
   - Prevents connection pool exhaustion in serverless/Node runtimes.
   - Executes parameterized queries, avoiding dynamic SQL string interpolation.

5. **PostgreSQL Database**:
   - Multi-tenant relational schema: `users`, `workspaces`, `memberships`, `tasks`, `comments`, `activity_logs`.
   - Foreign key constraints with explicit cascade and restrict policies.
   - B-Tree indexes targeting hot query paths.

---

## 3. Concurrency, Race Conditions & State Machine

### Concurrency Mitigations
- **Double-Submit / Replay**: Client-side submission disabled + server-side idempotency / atomic database checks.
- **Optimistic Concurrency Control (OCC)**:
  - Tasks maintain an integer `version` field.
  - State updates execute `WHERE id = :id AND version = :currentVersion`, incrementing `version` by 1.
  - If zero rows are updated, an `HTTP 409 Conflict` is returned, alerting the user that the task was modified concurrently.
- **State Machine Enforcement**:
  - Tasks can only transition through defined operational pathways:
    - `TODO` ➔ `IN_PROGRESS`
    - `IN_PROGRESS` ➔ `DONE`
    - `DONE` ➔ `IN_PROGRESS` (Reopened)
    - `IN_PROGRESS` ➔ `TODO` (Blocked/Reset)
  - Direct invalid jumps or transitions by unauthorized members are rejected at the service layer.

---

## 4. Error Handling & Safe Failure Boundaries

- **No Information Leakage**: Database exception traces, connection strings, or system paths are never returned to client responses.
- **Unified API Error Contract**:
  ```json
  {
    "success": false,
    "error": {
      "code": "TASK_NOT_FOUND",
      "message": "The requested task does not exist or you do not have permission to view it.",
      "details": []
    }
  }
  ```
- **React Error Boundaries**: UI wrapped in graceful error boundaries (`error.tsx`) to prevent whole-page crashes if a widget fails.
