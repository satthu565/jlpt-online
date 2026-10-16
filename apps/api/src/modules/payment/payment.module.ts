import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../common/database/database.module.js';
import { OutboxModule } from '../outbox/outbox.module.js';
import { EntitlementModule } from '../entitlement/entitlement.module.js';
import { PaymentController } from './payment.controller.js';
import { PaymentService } from './payment.service.js';
import { PaymentProviderRegistry } from './provider/provider.registry.js';
import { PayOSAdapter } from './provider/payos.adapter.js';

@Module({
  imports: [DatabaseModule, OutboxModule, EntitlementModule],
  controllers: [PaymentController],
  providers: [
    PaymentService,
    PaymentProviderRegistry,
    PayOSAdapter,
  ],
  exports: [PaymentService, PaymentProviderRegistry],
})
export class PaymentModule {}
