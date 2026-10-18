import { Global, Module, OnModuleDestroy, Provider } from '@nestjs/common';
import { createDbClient, type DbClientInstance } from '../../db/client.js';
import { runMigrations } from '../../db/migrate.js';
import { ensureAttemptEventsPartitions } from '../../db/partitions.js';
import { ensureJlptExamSchedulesTable } from './jlpt-schedule-migration.js';

export const DB_CLIENT = 'DB_CLIENT';

let cachedClient: DbClientInstance | null = null;
let pendingClient: Promise<DbClientInstance> | null = null;

// Concurrent first callers share one initialisation, and nobody gets the client before its
// migrations and partitions are in place.
export async function getOrCreateDbClient(): Promise<DbClientInstance> {
  if (cachedClient) return cachedClient;
  pendingClient ??= (async () => {
    const client = await createDbClient();
    await runMigrations(client);
    await ensureAttemptEventsPartitions(client);
    await ensureJlptExamSchedulesTable(client);
    cachedClient = client;
    return client;
  })().finally(() => {
    pendingClient = null;
  });
  return pendingClient;
}

export function setTestDbClient(client: DbClientInstance | null): void {
  cachedClient = client;
}

const dbProvider: Provider = {
  provide: DB_CLIENT,
  useFactory: async () => {
    return getOrCreateDbClient();
  },
};

@Global()
@Module({
  providers: [dbProvider],
  exports: [dbProvider],
})
export class DatabaseModule implements OnModuleDestroy {
  async onModuleDestroy() {
    if (cachedClient) {
      await cachedClient.close();
      cachedClient = null;
    }
  }
}
