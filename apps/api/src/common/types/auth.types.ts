import type { Role } from '@jlpt/schema';

export interface UserTotpMetadata {
  enabled: boolean;
  encryptedSecret?: string;
  hashedRecoveryCodes?: string[];
  verifiedAt?: string;
  lastUsedCode?: string;
  lastUsedStep?: number;
  failedAttempts?: number;
  lockedUntil?: string | null;
}

export interface AuthUserContext {
  userId: string;
  email: string;
  name: string | null;
  role: Role;
  sessionId: string;
  sessionToken: string;
  emailVerified: boolean;
  twoFactorEnabled?: boolean;
  twoFactorVerified?: boolean;
  totpSecret?: string;
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
