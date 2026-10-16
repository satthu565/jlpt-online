import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../common/database/database.module.js';
import { CmsService } from './cms.service.js';
import { CmsController } from './cms.controller.js';

@Module({
  imports: [DatabaseModule],
  controllers: [CmsController],
  providers: [CmsService],
  exports: [CmsService],
})
export class CmsModule {}
