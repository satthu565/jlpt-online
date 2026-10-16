import { Global, Module } from '@nestjs/common';
import { DatabaseModule } from '../../common/database/database.module.js';
import { BlueprintService } from './blueprint.service.js';

@Global()
@Module({
  imports: [DatabaseModule],
  providers: [BlueprintService],
  exports: [BlueprintService],
})
export class BlueprintModule {}
