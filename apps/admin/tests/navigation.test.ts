import { describe, it, expect } from 'vitest';
import {
  getNavigationSections,
  getAllowedRoutes,
  canAccessRoute,
  getRequiredRolesForRoute,
  isStaffRole,
  STAFF_ROLES,
} from '../lib/navigation';

describe('Admin Navigation & Role-Based Access (Acceptance 1: Editor reviewer admin thấy đúng menu)', () => {
  it('confirms staff roles correctly', () => {
    expect(STAFF_ROLES).toEqual(['admin', 'editor', 'reviewer', 'moderator', 'billing_admin']);
    expect(isStaffRole('admin')).toBe(true);
    expect(isStaffRole('editor')).toBe(true);
    expect(isStaffRole('reviewer')).toBe(true);
    expect(isStaffRole('moderator')).toBe(true);
    expect(isStaffRole('billing_admin')).toBe(true);

    expect(isStaffRole('student')).toBe(false);
    expect(isStaffRole(null)).toBe(false);
    expect(isStaffRole(undefined)).toBe(false);
  });

  describe('Editor Role Navigation', () => {
    it('Editor sees Question Bank, Blueprints, Media, Imports and Exams', () => {
      const sections = getNavigationSections('editor');
      const allHrefs = sections.flatMap((sec) => sec.items.map((i) => i.href));

      expect(allHrefs).toContain('/');
      expect(allHrefs).toContain('/questions');
      expect(allHrefs).toContain('/blueprints');
      expect(allHrefs).toContain('/media');
      expect(allHrefs).toContain('/imports');
      expect(allHrefs).toContain('/exams');

      // Allowed routes capability check
      expect(canAccessRoute('editor', '/')).toBe(true);
      expect(canAccessRoute('editor', '/questions')).toBe(true);
      expect(canAccessRoute('editor', '/questions/123')).toBe(true);
      expect(canAccessRoute('editor', '/blueprints')).toBe(true);
      expect(canAccessRoute('editor', '/media')).toBe(true);
      expect(canAccessRoute('editor', '/imports')).toBe(true);
      expect(canAccessRoute('editor', '/exams')).toBe(true);
    });

    it('Editor CANNOT see or access Review Queue, Moderation, Commercial, Audit Logs or Users', () => {
      const sections = getNavigationSections('editor');
      const allHrefs = sections.flatMap((sec) => sec.items.map((i) => i.href));

      expect(allHrefs).not.toContain('/reviews');
      expect(allHrefs).not.toContain('/reviews/explanations');
      expect(allHrefs).not.toContain('/reports/content');
      expect(allHrefs).not.toContain('/moderation/discussions');
      expect(allHrefs).not.toContain('/commercial/plans');
      expect(allHrefs).not.toContain('/reports/revenue');
      expect(allHrefs).not.toContain('/audit-logs');
      expect(allHrefs).not.toContain('/users');
      expect(allHrefs).not.toContain('/settings');

      // Access checks strictly return false
      expect(canAccessRoute('editor', '/reviews')).toBe(false);
      expect(canAccessRoute('editor', '/reviews/explanations')).toBe(false);
      expect(canAccessRoute('editor', '/audit-logs')).toBe(false);
      expect(canAccessRoute('editor', '/users')).toBe(false);
      expect(canAccessRoute('editor', '/commercial/plans')).toBe(false);
      expect(canAccessRoute('editor', '/reports/revenue')).toBe(false);
    });
  });

  describe('Reviewer Role Navigation', () => {
    it('Reviewer sees Review Queue, Explanations, Content Reports, and Exams', () => {
      const sections = getNavigationSections('reviewer');
      const allHrefs = sections.flatMap((sec) => sec.items.map((i) => i.href));

      expect(allHrefs).toContain('/');
      expect(allHrefs).toContain('/reviews');
      expect(allHrefs).toContain('/reviews/explanations');
      expect(allHrefs).toContain('/reports/content');
      expect(allHrefs).toContain('/exams');

      expect(canAccessRoute('reviewer', '/')).toBe(true);
      expect(canAccessRoute('reviewer', '/reviews')).toBe(true);
      expect(canAccessRoute('reviewer', '/reviews/explanations')).toBe(true);
      expect(canAccessRoute('reviewer', '/reports/content')).toBe(true);
      expect(canAccessRoute('reviewer', '/exams')).toBe(true);
    });

    it('Reviewer CANNOT see or access Question authoring, Imports, Media, Commercial, Audit Logs or Users', () => {
      const sections = getNavigationSections('reviewer');
      const allHrefs = sections.flatMap((sec) => sec.items.map((i) => i.href));

      expect(allHrefs).not.toContain('/questions');
      expect(allHrefs).not.toContain('/blueprints');
      expect(allHrefs).not.toContain('/media');
      expect(allHrefs).not.toContain('/imports');
      expect(allHrefs).not.toContain('/commercial/plans');
      expect(allHrefs).not.toContain('/audit-logs');
      expect(allHrefs).not.toContain('/users');

      expect(canAccessRoute('reviewer', '/questions')).toBe(false);
      expect(canAccessRoute('reviewer', '/imports')).toBe(false);
      expect(canAccessRoute('reviewer', '/audit-logs')).toBe(false);
      expect(canAccessRoute('reviewer', '/users')).toBe(false);
      expect(canAccessRoute('reviewer', '/commercial/plans')).toBe(false);
    });
  });

  describe('Admin Role Navigation', () => {
    it('Admin sees ALL sections and ALL navigation items', () => {
      const sections = getNavigationSections('admin');
      const allHrefs = sections.flatMap((sec) => sec.items.map((i) => i.href));

      // Content & Authoring
      expect(allHrefs).toContain('/questions');
      expect(allHrefs).toContain('/blueprints');
      expect(allHrefs).toContain('/media');
      expect(allHrefs).toContain('/imports');

      // Review & Quality
      expect(allHrefs).toContain('/reviews');
      expect(allHrefs).toContain('/reviews/explanations');
      expect(allHrefs).toContain('/reports/content');

      // Exams
      expect(allHrefs).toContain('/exams');

      // Community & Commercial
      expect(allHrefs).toContain('/moderation/discussions');
      expect(allHrefs).toContain('/commercial/plans');
      expect(allHrefs).toContain('/commercial/subscriptions');
      expect(allHrefs).toContain('/commercial/payments');
      expect(allHrefs).toContain('/commercial/refunds');
      expect(allHrefs).toContain('/commercial/coupons');

      // Analytics & Administration
      expect(allHrefs).toContain('/reports/revenue');
      expect(allHrefs).toContain('/users');
      expect(allHrefs).toContain('/audit-logs');
      expect(allHrefs).toContain('/experiments');
      expect(allHrefs).toContain('/settings');

      // Full access across all routes
      expect(canAccessRoute('admin', '/')).toBe(true);
      expect(canAccessRoute('admin', '/questions')).toBe(true);
      expect(canAccessRoute('admin', '/reviews')).toBe(true);
      expect(canAccessRoute('admin', '/audit-logs')).toBe(true);
      expect(canAccessRoute('admin', '/users')).toBe(true);
      expect(canAccessRoute('admin', '/reports/revenue')).toBe(true);
      expect(canAccessRoute('admin', '/any/custom/path')).toBe(true);
    });
  });

  describe('Non-Staff / Student Access', () => {
    it('Student or unauthenticated receives empty navigation and no route access', () => {
      expect(getNavigationSections('student')).toEqual([]);
      expect(getNavigationSections(null)).toEqual([]);
      expect(getNavigationSections(undefined)).toEqual([]);

      expect(getAllowedRoutes('student')).toEqual([]);
      expect(getAllowedRoutes(null)).toEqual([]);

      expect(canAccessRoute('student', '/')).toBe(false);
      expect(canAccessRoute('student', '/questions')).toBe(false);
      expect(canAccessRoute('student', '/reviews')).toBe(false);
      expect(canAccessRoute('student', '/audit-logs')).toBe(false);
      expect(canAccessRoute(null, '/')).toBe(false);
    });
  });

  describe('Route Requirements Mapping', () => {
    it('returns expected required roles for each route', () => {
      expect(getRequiredRolesForRoute('/questions')).toEqual(['admin', 'editor']);
      expect(getRequiredRolesForRoute('/reviews')).toEqual(['admin', 'reviewer']);
      expect(getRequiredRolesForRoute('/audit-logs')).toEqual(['admin']);
      expect(getRequiredRolesForRoute('/users')).toEqual(['admin']);
      expect(getRequiredRolesForRoute('/commercial/plans')).toEqual(['admin', 'billing_admin']);
      expect(getRequiredRolesForRoute('/unknown-admin-page')).toEqual(['admin']);
    });
  });
});
