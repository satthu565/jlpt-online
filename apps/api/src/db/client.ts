import * as schema from './schema.js';

export interface DbClientInstance {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rawClient: any;
  type: 'postgres' | 'pglite';
  close: () => Promise<void>;
  query: (sqlQuery: string) => Promise<unknown>;
}

export interface DbClientOptions {
  connectionString?: string;
  inMemory?: boolean;
}

/**
 * Creates a database client.
 * Connects to PostgreSQL via postgres.js if connectionString or DATABASE_URL is set,
 * otherwise creates an in-process PGlite (WASM Postgres 16) instance.
 */
export async function createDbClient(options: DbClientOptions = {}): Promise<DbClientInstance> {
  const connectionString = options.connectionString ?? process.env.DATABASE_URL;

  if (connectionString && !options.inMemory) {
    const { default: postgres } = await import('postgres');
    const { drizzle } = await import('drizzle-orm/postgres-js');

    const sqlClient = postgres(connectionString, { max: 10 });
    const db = drizzle(sqlClient, { schema });

    return {
      db,
      rawClient: sqlClient,
      type: 'postgres',
      close: async () => {
        await sqlClient.end();
      },
      query: async (sqlQuery: string) => {
        return sqlClient.unsafe(sqlQuery);
      },
    };
  }

  // Fallback to in-process PGlite (WASM PostgreSQL 16)
  const { PGlite } = await import('@electric-sql/pglite');
  const { drizzle } = await import('drizzle-orm/pglite');

  const pglite = new PGlite();
  const db = drizzle(pglite, { schema });

  return {
    db,
    rawClient: pglite,
    type: 'pglite',
    close: async () => {
      await pglite.close();
    },
    query: async (sqlQuery: string) => {
      return pglite.query(sqlQuery);
    },
  };
}
