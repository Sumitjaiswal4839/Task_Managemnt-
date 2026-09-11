# API Contracts & Specification — Synchro

All endpoints consume and produce `application/json`. Workspace-scoped operations reside under `/api/workspaces/:workspaceId/*`.

---

## 1. Authentication Endpoints

### `POST /api/auth/register`
- **Body**: `{ "name": "...", "email": "...", "password": "..." }`
- **Password**: Minimum 8 characters, checked with Argon2id. Automatically creates personal default workspace if none exists.
- **Response (201 Created)**: `{ "success": true, "data": { "id": "...", "name": "...", "email": "..." } }`

### `POST /api/auth/login`
- **Body**: `{ "email": "...", "password": "..." }`
- **Response (200 OK)**: Sets `HttpOnly` database session cookie.

---

## 2. Workspace Endpoints

### `GET /api/workspaces`
Returns all workspaces the authenticated user holds membership in.

- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "ws_123",
        "name": "Engineering Workspace",
        "slug": "engineering",
        "role": "ADMIN",
        "membersCount": 5
      }
    ]
  }
  ```

---

## 3. Workspace Tasks Endpoints

### `GET /api/workspaces/:workspaceId/tasks`
Retrieves paginated tasks inside a specific workspace.

- **Query Parameters**: `status`, `priority`, `assignedTo`, `search`, `page`, `limit`.
- **Authorization**: Caller must have active `Membership` in `:workspaceId`.

### `POST /api/workspaces/:workspaceId/tasks`
Creates a task within the workspace.

- **Authorization**: Caller's membership role must be `ADMIN` or `MANAGER`.
- **Body**:
  ```json
  {
    "title": "Design Interactive Kanban Board",
    "description": "Implement drag and drop columns",
    "priority": "HIGH",
    "status": "TODO",
    "dueDate": "2026-09-20T00:00:00.000Z",
    "assignedToId": "usr_member"
  }
  ```

### `PATCH /api/workspaces/:workspaceId/tasks/:taskId/status`
State machine status transition (`TODO` ➔ `IN_PROGRESS` ➔ `DONE`).

- **Authorization**:
  - `ADMIN`, `MANAGER`: Any task in the workspace.
  - `MEMBER`: Only tasks where `assignedToId === session.id`.
- **Body**: `{ "status": "IN_PROGRESS", "version": 1 }`
- **Concurrency**: If `version` does not match database version, returns `409 Conflict`.

### `DELETE /api/workspaces/:workspaceId/tasks/:taskId`
- **Authorization**: Workspace `ADMIN` only.

---

## 4. Standard Error Contract (RFC 7807)

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Only workspace Admins and Managers can create tasks.",
    "details": []
  }
}
```
