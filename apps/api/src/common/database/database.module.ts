import { Global, Module, OnModuleDestroy, Provider } from '@nestjs/common';
import { createDbClient, type DbClientInstance } from '../../db/client.js';
import { runMigrations } from '../../db/migrate.js';

export const DB_CLIENT = 'DB_CLIENT';

let cachedClient: DbClientInstance | null = null;

export async function getOrCreateDbClient(): Promise<DbClientInstance> {
  if (!cachedClient) {
    cachedClient = await createDbClient();
    await runMigrations(cachedClient);
  }
  return cachedClient;
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
