import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export class UnauthorizedError extends Error {
  constructor(message = "Authentication required") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Access denied: insufficient permissions for this workspace") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends Error {
  constructor(message = "Resource not found in this workspace") {
    super(message);
    this.name = "NotFoundError";
  }
}

/**
 * Resolves caller's membership and role within a target workspace
 */
export async function getWorkspaceMembership(userId: string, workspaceId: string) {
  const membership = await prisma.membership.findUnique({
    where: {
      userId_workspaceId: {
        userId,
        workspaceId,
      },
    },
  });

  return membership;
}

export function canCreateTask(role: Role): boolean {
  return role === Role.ADMIN || role === Role.MANAGER;
}

export function canAssignTask(role: Role): boolean {
  return role === Role.ADMIN || role === Role.MANAGER;
}

export function canModifyTask(role: Role): boolean {
  return role === Role.ADMIN || role === Role.MANAGER;
}

export function canDeleteTask(role: Role): boolean {
  return role === Role.ADMIN;
}

export function canUpdateStatus(role: Role, userId: string, taskAssignedToId: string | null): boolean {
  if (role === Role.ADMIN || role === Role.MANAGER) {
    return true;
  }
  // Members can only update status if the task is assigned to them
  return role === Role.MEMBER && taskAssignedToId === userId;
}

export function canDeleteComment(role: Role, userId: string, commentAuthorId: string): boolean {
  if (role === Role.ADMIN) return true;
  return userId === commentAuthorId;
}
