import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import type { DbClientInstance } from '../../db/client.js';
import * as schema from '../../db/schema.js';

export function createBetterAuthInstance(client: DbClientInstance) {
  const secret =
    process.env.AUTH_SECRET ||
    'dev_secret_auth_key_must_be_at_least_32_bytes_long_random';

  return betterAuth({
    database: drizzleAdapter(client.db, {
      provider: 'pg',
      schema: {
        user: schema.users,
        session: schema.sessions,
        account: schema.accounts,
        verification: schema.verifications,
      },
    }),
    secret,
    baseURL: process.env.API_INTERNAL_URL
      ? `${process.env.API_INTERNAL_URL}/api/v1/auth`
      : 'http://localhost:4000/api/v1/auth',
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
    },
  });
}
