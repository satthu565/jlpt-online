import { Global, Module } from '@nestjs/common';
import { DatabaseModule } from '../../common/database/database.module.js';
import { BlueprintService } from './blueprint.service.js';
import { BlueprintController } from './blueprint.controller.js';

@Global()
@Module({
  imports: [DatabaseModule],
  controllers: [BlueprintController],
  providers: [BlueprintService],
  exports: [BlueprintService],
})
export class BlueprintModule {}
