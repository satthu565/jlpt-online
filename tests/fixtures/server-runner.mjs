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
  const mediaTokenEntry = path.join(REPO_ROOT, 'packages/media-token/dist/index.js');
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
  if (!fs.existsSync(mediaTokenEntry)) {
    console.log('[server-runner] packages/media-token/dist missing, running build...');
    execSync('pnpm --filter @jlpt/media-token build', { cwd: REPO_ROOT, stdio: 'inherit' });
  }
  if (!fs.existsSync(distEntry)) {
    console.log('[server-runner] apps/api/dist missing, running build...');
    execSync('pnpm --filter @jlpt/api... build', { cwd: REPO_ROOT, stdio: 'inherit' });
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
  require('reflect-metadata');
  const { NestFactory } = require('@nestjs/core');
  const { Module } = require('@nestjs/common');
  const { FastifyAdapter } = require('@nestjs/platform-fastify');
  const { AppModule } = await import(path.join(REPO_ROOT, 'apps/api/dist/src/app.module.js'));
  const { PaymentModule } = await import(path.join(REPO_ROOT, 'apps/api/dist/src/modules/payment/payment.module.js'));
  const { EntitlementModule } = await import(path.join(REPO_ROOT, 'apps/api/dist/src/modules/entitlement/entitlement.module.js'));
  const { LearningModule } = await import(path.join(REPO_ROOT, 'apps/api/dist/src/modules/learning/learning.module.js'));
  const { PlannerModule } = await import(path.join(REPO_ROOT, 'apps/api/dist/src/modules/planner/planner.module.js'));
  const { AiModule } = await import(path.join(REPO_ROOT, 'apps/api/dist/src/modules/ai/ai.module.js'));
  const { AiService } = await import(path.join(REPO_ROOT, 'apps/api/dist/src/modules/ai/ai.service.js'));
  const { DB_CLIENT: DB_TOKEN } = await import(path.join(REPO_ROOT, 'apps/api/dist/src/common/database/database.module.js'));
  const { OutboxService } = await import(path.join(REPO_ROOT, 'apps/api/dist/src/modules/outbox/outbox.service.js'));
  const { VocabModule } = await import(path.join(REPO_ROOT, 'apps/api/dist/src/modules/vocab/vocab.module.js'));
  const { ReportingModule } = await import(path.join(REPO_ROOT, 'apps/api/dist/src/modules/reporting/reporting.module.js'));
  const { CmsModule } = await import(path.join(REPO_ROOT, 'apps/api/dist/src/modules/cms/cms.module.js'));
  const { ExperimentModule } = await import(path.join(REPO_ROOT, 'apps/api/dist/src/modules/experiment/experiment.module.js'));

  // AiService has an unannotated optional 3rd parameter customProvider?: AiProvider that causes NestJS dependency resolution to fail.
  // We explicitly override the AiModule provider using a factory with only dbClient and outboxService.
  Reflect.defineMetadata('providers', [
    {
      provide: AiService,
      useFactory: (dbClient, outboxService) => new AiService(dbClient, outboxService),
      inject: [DB_TOKEN, OutboxService],
    },
  ], AiModule);
  Reflect.defineMetadata('design:paramtypes', [Object, OutboxService], AiService);

  const { AiController } = await import(path.join(REPO_ROOT, 'apps/api/dist/src/modules/ai/ai.controller.js'));
  const { VocabController } = await import(path.join(REPO_ROOT, 'apps/api/dist/src/modules/vocab/vocab.controller.js'));
  const { GamificationController } = await import(path.join(REPO_ROOT, 'apps/api/dist/src/modules/gamification/gamification.controller.js'));

  // Normalize controllers that were declared with @Controller('api/v1') so they don't produce double prefix under app.setGlobalPrefix('api/v1')
  Reflect.defineMetadata('path', '', AiController);
  Reflect.defineMetadata('path', '', VocabController);
  Reflect.defineMetadata('path', '', GamificationController);

  class StagingAppModule {}
  Module({
    imports: [
      AppModule,
      PaymentModule,
      EntitlementModule,
      LearningModule,
      PlannerModule,
      AiModule,
      VocabModule,
      ReportingModule,
      CmsModule,
      ExperimentModule,
    ],
  })(StagingAppModule);

  const adapter = new FastifyAdapter({ bodyLimit: 50 * 1024 * 1024 });
  const app = await NestFactory.create(StagingAppModule, adapter, {
    logger: ['error', 'warn'],
  });
  app.setGlobalPrefix('api/v1');

  // Enforce X-Robots-Tag: noindex, nofollow on private routes (/me, /admin)
  const fastifyInstance = app.getHttpAdapter().getInstance();
  fastifyInstance.addHook('onSend', (request, reply, payload, done) => {
    const rawUrl = request.raw?.url || request.url || '';
    if (rawUrl.includes('/api/v1/me') || rawUrl.includes('/api/v1/admin')) {
      reply.header('x-robots-tag', 'noindex, nofollow');
    }
    done();
  });

  // Initialize seed plans for payment
  const { PaymentService } = await import(path.join(REPO_ROOT, 'apps/api/dist/src/modules/payment/payment.service.js'));
  const paymentService = app.get(PaymentService);
  if (paymentService?.ensureInitialPlans) {
    await paymentService.ensureInitialPlans();
  }

  // 5. Enhance AuthService.getSession with user tenantId resolved from org_memberships table
  const { AuthService } = await import(
    path.join(REPO_ROOT, 'apps/api/dist/src/modules/auth/auth.service.js')
  );
  const authService = app.get(AuthService);
  const origGetSession = authService.getSession.bind(authService);
  authService.getSession = async (token) => {
    const session = await origGetSession(token);
    if (session && session.userId) {
      try {
        const queryRes = await client.query(
          `SELECT o.slug FROM org_memberships om JOIN organizations o ON om.org_id = o.id WHERE om.user_id = '${session.userId}' LIMIT 1;`
        );
        const rows = Array.isArray(queryRes) ? queryRes : queryRes?.rows || [];
        if (rows.length > 0 && rows[0]?.slug) {
          return {
            ...session,
            tenantId: rows[0].slug,
          };
        }
      } catch (err) {
        console.warn('[server-runner] Error querying tenant membership:', err);
      }
    }
    return session;
  };

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
