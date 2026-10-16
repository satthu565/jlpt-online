import { Global, Module } from '@nestjs/common';
import { DatabaseModule } from '../../common/database/database.module.js';
import { StorageModule } from '../storage/storage.module.js';
import { MediaModule } from '../media/media.module.js';
import { ReviewModule } from '../review/review.module.js';
import { OutboxModule } from '../outbox/outbox.module.js';
import { BlueprintModule } from '../blueprint/blueprint.module.js';
import { ImportService } from './import.service.js';
import { ImportController } from './import.controller.js';

@Global()
@Module({
  imports: [
    DatabaseModule,
    StorageModule,
    MediaModule,
    ReviewModule,
    OutboxModule,
    BlueprintModule,
  ],
  controllers: [ImportController],
  providers: [ImportService],
  exports: [ImportService],
})
export class ImportModule {}
