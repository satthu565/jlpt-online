import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import console from 'node:console';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../../');

// Set NODE_ENV to test so main.js doesn't auto-bootstrap
process.env.NODE_ENV = 'test';

async function start() {
  const schemaEntry = path.join(REPO_ROOT, 'packages/schema/dist/index.js');
  const contentToolsEntry = path.join(REPO_ROOT, 'packages/content-tools/dist/index.js');
  const examEngineEntry = path.join(REPO_ROOT, 'packages/exam-engine/dist/index.js');
  const distEntry = path.join(REPO_ROOT, 'apps/api/dist/src/main.js');

  const { execSync } = await import('node:child_process');
  if (!fs.existsSync(schemaEntry)) {
    console.log('[server-runner] packages/schema/dist missing, running build...');
    execSync('pnpm --filter @jlpt/schema build', { cwd: REPO_ROOT, stdio: 'inherit' });
  }
  if (!fs.existsSync(contentToolsEntry)) {
    console.log('[server-runner] packages/content-tools/dist missing, running build...');
    execSync('pnpm --filter @jlpt/content-tools build', { cwd: REPO_ROOT, stdio: 'inherit' });
  }
  if (!fs.existsSync(examEngineEntry)) {
    console.log('[server-runner] packages/exam-engine/dist missing, running build...');
    execSync('pnpm --filter @jlpt/exam-engine build', { cwd: REPO_ROOT, stdio: 'inherit' });
  }
  if (!fs.existsSync(distEntry)) {
    console.log('[server-runner] apps/api/dist missing, running build...');
    execSync('pnpm --filter @jlpt/api build', { cwd: REPO_ROOT, stdio: 'inherit' });
  }

  const { getOrCreateDbClient, setTestDbClient } = await import(
    path.join(REPO_ROOT, 'apps/api/dist/src/common/database/database.module.js')
  );
  const { runDemoSeed } = await import(
    path.join(REPO_ROOT, 'apps/api/dist/src/modules/import/demo-seed.js')
  );

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 4092;

  // Ensure migrations directory is linked or copied to dist if missing
  const srcMigrations = path.join(REPO_ROOT, 'apps/api/src/db/migrations');
  const distMigrations = path.join(REPO_ROOT, 'apps/api/dist/src/db/migrations');
  if (fs.existsSync(srcMigrations) && !fs.existsSync(distMigrations)) {
    fs.mkdirSync(path.dirname(distMigrations), { recursive: true });
    fs.cpSync(srcMigrations, distMigrations, { recursive: true });
  }

  // 1. Initialize and cache DB client (in-memory PGlite or PostgreSQL)
  const client = await getOrCreateDbClient();
  setTestDbClient(client);

  // 2. Seed synthetic blueprint and demo exam package
  await runDemoSeed(client);

  // 3. Seed deterministic test user sessions
  const seedSqlPath = path.join(__dirname, 'seed-sessions.sql');
  const seedSql = fs.readFileSync(seedSqlPath, 'utf8');
  await client.rawClient.exec(seedSql);

  // 4. Create and start Fastify NestJS application with 50MB bodyLimit for ZIP uploads
  const { createRequire } = await import('node:module');
  const require = createRequire(path.join(REPO_ROOT, 'apps/api/package.json'));
  const { NestFactory } = require('@nestjs/core');
  const { FastifyAdapter } = require('@nestjs/platform-fastify');
  const { AppModule } = await import(path.join(REPO_ROOT, 'apps/api/dist/src/app.module.js'));

  const adapter = new FastifyAdapter({ bodyLimit: 50 * 1024 * 1024 });
  const app = await NestFactory.create(AppModule, adapter, {
    logger: ['error', 'warn'],
  });
  app.setGlobalPrefix('api/v1');

  await app.listen(port, '127.0.0.1');

  const serverAddress = app.getHttpServer().address();
  const actualPort = typeof serverAddress === 'object' && serverAddress ? serverAddress.port : port;
  const readyUrl = `http://127.0.0.1:${actualPort}`;
  console.log(`API_READY_ON:${readyUrl}`);

  // Graceful shutdown on SIGTERM / SIGINT
  const shutdown = async () => {
    console.log('Stopping test API server...');
    await app.close();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

start().catch((err) => {
  console.error('Fatal error in server-runner.mjs:', err);
  process.exit(1);
});
