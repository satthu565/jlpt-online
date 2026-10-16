import { Module } from '@nestjs/common';
import { LicenseModule } from '../license/license.module.js';
import { MediaModule } from '../media/media.module.js';
import { StorageModule } from '../storage/storage.module.js';
import { QuestionBankController } from './question-bank.controller.js';
import { QuestionBankService } from './question-bank.service.js';

@Module({
  imports: [LicenseModule, MediaModule, StorageModule],
  controllers: [QuestionBankController],
  providers: [QuestionBankService],
  exports: [QuestionBankService],
})
export class QuestionBankModule {}
