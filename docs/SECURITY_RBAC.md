# Security & Role-Based Access Control (RBAC) Specification — Synchro

## 1. Workspace-Scoped Access Control Matrix

In Synchro, authorization is evaluated **strictly within the context of a Workspace**. A user's capabilities are determined by their `Membership.role` (`ADMIN`, `MANAGER`, `MEMBER`) in that specific workspace.

| Capability / Action | Workspace ADMIN | Workspace MANAGER | Workspace MEMBER | Server Enforcement Rule |
|---|:---:|:---:|:---:|---|
| **View Workspace Tasks & Metrics** | ✅ All | ✅ All | ✅ All | Scoped strictly to tasks belonging to `workspaceId` |
| **Create Task in Workspace** | ✅ Yes | ✅ Yes | ❌ No | Rejected with `403 Forbidden` if caller role is `MEMBER` |
| **Assign Task to Members** | ✅ Yes | ✅ Yes | ❌ No | Can assign only to users holding active membership in this workspace |
| **Update Task Details** (Title, Desc, Priority) | ✅ Yes | ✅ Yes | ❌ No | Only Workspace Admins and Managers can edit core specifications |
| **Update Task Status** (Todo ➔ In Progress ➔ Done) | ✅ Yes | ✅ Yes | ✅ Assigned only | Members can ONLY change status of tasks assigned to their user ID |
| **Delete Task** | ✅ Yes | ❌ No | ❌ No | Restricted exclusively to Workspace `ADMIN` |
| **Add Comment to Task** | ✅ Yes | ✅ Yes | ✅ Yes | Any active workspace member can comment on tasks in that workspace |
| **Delete Comment** | ✅ Yes | ❌ No | ✅ Own only | Members can delete only their own comments; Admin can moderate |
| **Invite Member / Change Member Roles** | ✅ Yes | ❌ No | ❌ No | Restricted strictly to Workspace `ADMIN` |
| **Workspace Settings & Deletion** | ✅ Yes | ❌ No | ❌ No | Restricted strictly to Workspace `ADMIN` |

---

## 2. Multi-Tenant IDOR / BOLA Prevention Architecture

### Threat Scenario
User A belongs to Workspace Alpha. User A intercepts a network request and changes the URL to target Task 99 in Workspace Beta (`PATCH /api/workspaces/beta/tasks/99/status`).

### Synchro Server Defense Pattern
Every workspace API route executes a mandatory verification gate before executing any data access:

```typescript
// 1. Resolve authenticated user identity
const session = await getSession();
if (!session) throw new UnauthorizedError();

// 2. Resolve caller's membership in the target workspace
const membership = await prisma.membership.findUnique({
  where: {
    userId_workspaceId: {
      userId: session.id,
      workspaceId: targetWorkspaceId,
    },
  },
});

if (!membership) {
  // If user is not enrolled in this workspace, return 404/403 to prevent enumeration
  throw new ForbiddenError("You do not have access to this workspace");
}

// 3. Verify the target resource belongs to the target workspace
const task = await prisma.task.findFirst({
  where: {
    id: taskId,
    workspaceId: targetWorkspaceId,
  },
});

if (!task) {
  throw new NotFoundError("Task not found in this workspace");
}

// 4. Verify role permissions on the resource
if (membership.role === "MEMBER" && task.assignedToId !== session.id) {
  throw new ForbiddenError("Members can only update status for their assigned tasks");
}
```

This guarantees **zero cross-workspace leakage** and neutralizes IDOR/BOLA attacks completely.

---

## 3. Cryptographic Security Standards

1. **Password Hashing with Argon2id**:
   - Algorithms like plain MD5/SHA-256 or older bcrypt are superseded by **Argon2id** (winner of the Password Hashing Competition).
   - Resistant to side-channel timing attacks and massively parallel GPU/ASIC brute force.
2. **Custom JWT Authentication**:
   - Session tokens are custom JSON Web Tokens (JWT) verified using a strong, environment-configured secret.
   - Tokens are stored in signed, encrypted `HttpOnly`, `SameSite=Lax`, and `Secure` cookies with a 7-day expiration.
3. **Strict Input Allowlisting**:
   - Every API mutation parses inputs via `.strict()` Zod schemas. Mass assignment (`...req.body`) is strictly prohibited.
