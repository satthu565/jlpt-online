import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { FastifyAdapter } from '@nestjs/platform-fastify';

import { AppModule } from './app.module.js';
import { configureImportFastify } from './modules/import/fastify-http-config.js';
import { PaymentModule } from './modules/payment/payment.module.js';
import { PaymentService } from './modules/payment/payment.service.js';
import { EntitlementModule } from './modules/entitlement/entitlement.module.js';
import { LearningModule } from './modules/learning/learning.module.js';
import { PlannerModule } from './modules/planner/planner.module.js';
import { AiModule } from './modules/ai/ai.module.js';
import { AiService } from './modules/ai/ai.service.js';
import { DB_CLIENT as DB_TOKEN } from './common/database/database.module.js';
import { OutboxService } from './modules/outbox/outbox.service.js';
import { VocabModule } from './modules/vocab/vocab.module.js';
import { ReportingModule } from './modules/reporting/reporting.module.js';
import { CmsModule } from './modules/cms/cms.module.js';
import { ExperimentModule } from './modules/experiment/experiment.module.js';

import { AiController } from './modules/ai/ai.controller.js';
import { VocabController } from './modules/vocab/vocab.controller.js';

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

// Normalize controller paths that already include api/v1 prefix to avoid route nesting /api/v1/api/v1
Reflect.defineMetadata('path', '', AiController);
Reflect.defineMetadata('path', '', VocabController);

export class StagingAppModule {}
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

export async function createApp() {
  const adapter = new FastifyAdapter();
  configureImportFastify(adapter.getInstance());
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

  return app;
}

async function bootstrap() {
  const app = await createApp();

  // Initialize seed plans for payment
  try {
    const paymentService = app.get(PaymentService);
    if (paymentService?.ensureInitialPlans) {
      await paymentService.ensureInitialPlans();
    }
  } catch (err) {
    console.warn('[entrypoint] Error initializing payment plans:', err);
  }

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
  await app.listen(port, '0.0.0.0');
  console.log(`JLPT API listening on port ${port}`);
}

if (process.env.NODE_ENV !== 'test') {
  bootstrap().catch((err) => {
    console.error('Fatal error during bootstrap:', err);
    process.exit(1);
  });
}
