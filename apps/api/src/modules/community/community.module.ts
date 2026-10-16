import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../common/database/database.module.js';
import { CommunityController } from './community.controller.js';
import { CommunityService } from './community.service.js';

@Module({
  imports: [DatabaseModule],
  controllers: [CommunityController],
  providers: [CommunityService],
  exports: [CommunityService],
})
export class CommunityModule {}
