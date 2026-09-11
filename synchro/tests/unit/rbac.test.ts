import { describe, it, expect } from 'vitest';
import { canModifyTask, canDeleteTask, canUpdateStatus } from '../../lib/rbac';
import { Role } from '@prisma/client';

describe('RBAC Helpers', () => {
  describe('canModifyTask', () => {
    it('allows ADMIN to edit', () => {
      expect(canModifyTask(Role.ADMIN)).toBe(true);
    });

    it('allows MANAGER to edit', () => {
      expect(canModifyTask(Role.MANAGER)).toBe(true);
    });

    it('denies MEMBER from editing', () => {
      expect(canModifyTask(Role.MEMBER)).toBe(false);
    });
  });

  describe('canUpdateStatus', () => {
    it('allows MEMBER to update if assigned', () => {
      expect(canUpdateStatus(Role.MEMBER, 'user1', 'user1')).toBe(true);
      expect(canUpdateStatus(Role.MEMBER, 'user1', 'user2')).toBe(false);
    });
  });

  describe('canDeleteTask', () => {
    it('allows ADMIN to delete', () => {
      expect(canDeleteTask(Role.ADMIN)).toBe(true);
    });

    it('denies MANAGER and MEMBER from deleting', () => {
      expect(canDeleteTask(Role.MANAGER)).toBe(false);
      expect(canDeleteTask(Role.MEMBER)).toBe(false);
    });
  });
});
