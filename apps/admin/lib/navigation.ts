import type { Role } from '@jlpt/schema';

export interface NavItem {
  id: string;
  labelKey: string;
  href: string;
  icon?: string;
  requiredRoles: Role[];
  badge?: string;
}

export interface NavSection {
  id: string;
  titleKey: string;
  items: NavItem[];
}

export const STAFF_ROLES: Role[] = [
  'admin',
  'editor',
  'reviewer',
  'moderator',
  'billing_admin',
];

export function isStaffRole(role: string | null | undefined): role is Role {
  if (!role) return false;
  return STAFF_ROLES.includes(role as Role);
}

/**
 * Master navigation structure definition for the JLPT Admin Portal.
 * Each item declares the specific roles allowed to access and view it.
 */
export const ALL_NAV_SECTIONS: NavSection[] = [
  {
    id: 'overview',
    titleKey: 'nav.sections.overview',
    items: [
      {
        id: 'dashboard',
        labelKey: 'nav.dashboard',
        href: '/',
        requiredRoles: ['admin', 'editor', 'reviewer', 'moderator', 'billing_admin'],
      },
    ],
  },
  {
    id: 'authoring',
    titleKey: 'nav.sections.authoring',
    items: [
      {
        id: 'questionBank',
        labelKey: 'nav.questionBank',
        href: '/questions',
        requiredRoles: ['admin', 'editor'],
      },
      {
        id: 'blueprints',
        labelKey: 'nav.blueprints',
        href: '/blueprints',
        requiredRoles: ['admin', 'editor'],
      },
      {
        id: 'media',
        labelKey: 'nav.media',
        href: '/media',
        requiredRoles: ['admin', 'editor'],
      },
      {
        id: 'imports',
        labelKey: 'nav.imports',
        href: '/imports',
        requiredRoles: ['admin', 'editor'],
      },
    ],
  },
  {
    id: 'quality',
    titleKey: 'nav.sections.quality',
    items: [
      {
        id: 'reviews',
        labelKey: 'nav.reviews',
        href: '/reviews',
        requiredRoles: ['admin', 'reviewer'],
      },
      {
        id: 'explanationReviews',
        labelKey: 'nav.explanationReviews',
        href: '/reviews/explanations',
        requiredRoles: ['admin', 'reviewer'],
      },
      {
        id: 'contentReports',
        labelKey: 'nav.contentReports',
        href: '/reports/content',
        requiredRoles: ['admin', 'reviewer', 'moderator'],
      },
    ],
  },
  {
    id: 'exams',
    titleKey: 'nav.sections.exams',
    items: [
      {
        id: 'exams',
        labelKey: 'nav.exams',
        href: '/exams',
        requiredRoles: ['admin', 'editor', 'reviewer'],
      },
    ],
  },
  {
    id: 'community',
    titleKey: 'nav.sections.community',
    items: [
      {
        id: 'discussions',
        labelKey: 'nav.discussions',
        href: '/moderation/discussions',
        requiredRoles: ['admin', 'moderator'],
      },
    ],
  },
  {
    id: 'commercial',
    titleKey: 'nav.sections.commercial',
    items: [
      {
        id: 'plans',
        labelKey: 'nav.plans',
        href: '/commercial/plans',
        requiredRoles: ['admin', 'billing_admin'],
      },
      {
        id: 'subscriptions',
        labelKey: 'nav.subscriptions',
        href: '/commercial/subscriptions',
        requiredRoles: ['admin', 'billing_admin'],
      },
      {
        id: 'payments',
        labelKey: 'nav.payments',
        href: '/commercial/payments',
        requiredRoles: ['admin', 'billing_admin'],
      },
      {
        id: 'refunds',
        labelKey: 'nav.refunds',
        href: '/commercial/refunds',
        requiredRoles: ['admin', 'billing_admin'],
      },
      {
        id: 'coupons',
        labelKey: 'nav.coupons',
        href: '/commercial/coupons',
        requiredRoles: ['admin', 'billing_admin'],
      },
    ],
  },
  {
    id: 'analytics',
    titleKey: 'nav.sections.analytics',
    items: [
      {
        id: 'revenueReport',
        labelKey: 'nav.revenueReport',
        href: '/reports/revenue',
        requiredRoles: ['admin', 'billing_admin'],
      },
    ],
  },
  {
    id: 'admin',
    titleKey: 'nav.sections.admin',
    items: [
      {
        id: 'users',
        labelKey: 'nav.users',
        href: '/users',
        requiredRoles: ['admin'],
      },
      {
        id: 'auditLogs',
        labelKey: 'nav.auditLogs',
        href: '/audit-logs',
        requiredRoles: ['admin'],
      },
      {
        id: 'experiments',
        labelKey: 'nav.experiments',
        href: '/experiments',
        requiredRoles: ['admin'],
      },
      {
        id: 'settings',
        labelKey: 'nav.settings',
        href: '/settings',
        requiredRoles: ['admin'],
      },
    ],
  },
];

/**
 * Returns filtered navigation sections for a given user role.
 * Non-staff roles (or null/unauthenticated) receive an empty array.
 */
export function getNavigationSections(role?: Role | null): NavSection[] {
  if (!role || !isStaffRole(role)) {
    return [];
  }

  // Admin sees all items
  if (role === 'admin') {
    return ALL_NAV_SECTIONS;
  }

  const filteredSections: NavSection[] = [];
  for (const section of ALL_NAV_SECTIONS) {
    const permittedItems = section.items.filter((item) => item.requiredRoles.includes(role));
    if (permittedItems.length > 0) {
      filteredSections.push({
        ...section,
        items: permittedItems,
      });
    }
  }

  return filteredSections;
}

/**
 * Returns a flat list of allowed route path prefixes for a role.
 */
export function getAllowedRoutes(role?: Role | null): string[] {
  if (!role || !isStaffRole(role)) {
    return [];
  }

  const sections = getNavigationSections(role);
  const routes = new Set<string>();

  for (const sec of sections) {
    for (const item of sec.items) {
      routes.add(item.href);
    }
  }

  return Array.from(routes);
}

/**
 * Route-level capability check: returns true if the user's role allows visiting this pathname.
 */
export function canAccessRoute(role: Role | null | undefined, pathname: string): boolean {
  if (!role || !isStaffRole(role)) {
    return false;
  }

  if (role === 'admin') {
    return true; // Admin has superuser access
  }

  // Exact match or sub-route match
  const allowed = getAllowedRoutes(role);
  const normalizedPath = pathname.split('?')[0] ?? '';

  if (normalizedPath === '/' || normalizedPath === '') {
    return allowed.includes('/');
  }

  return allowed.some((route) => {
    if (route === '/') return false;
    return normalizedPath === route || normalizedPath.startsWith(`${route}/`);
  });
}

/**
 * Identifies the required roles for a given pathname.
 */
export function getRequiredRolesForRoute(pathname: string): Role[] {
  const normalizedPath = pathname.split('?')[0] ?? '';

  for (const section of ALL_NAV_SECTIONS) {
    for (const item of section.items) {
      if (item.href === normalizedPath || (item.href !== '/' && normalizedPath.startsWith(`${item.href}/`))) {
        return item.requiredRoles;
      }
    }
  }

  // Default to admin for undefined admin routes
  return ['admin'];
}
