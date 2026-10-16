import type { Role } from '@jlpt/schema';

export interface AuthUserContext {
  userId: string;
  email: string;
  name: string | null;
  role: Role;
  sessionId: string;
  sessionToken: string;
  emailVerified: boolean;
  twoFactorEnabled?: boolean;
  tenantId?: string | null;
}

export interface AuthenticatedRequest {
  user?: AuthUserContext;
  guestId?: string;
  headers: Record<string, string | string[] | undefined>;
  raw?: {
    url?: string;
    method?: string;
  };
}

