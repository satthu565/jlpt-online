import { Module } from '@nestjs/common';
import { HealthController } from './modules/health/health.controller.js';

@Module({
  imports: [],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
