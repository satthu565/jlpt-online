import { createDbClient } from '/app/apps/api/dist/src/db/client.js';
import { runMigrations } from '/app/apps/api/dist/src/db/migrate.js';

const client = await createDbClient();
try {
  const result = await runMigrations(client, '/app/apps/api/dist/src/db/migrations');
  console.log(JSON.stringify(result));
} finally {
  await client.close();
}
