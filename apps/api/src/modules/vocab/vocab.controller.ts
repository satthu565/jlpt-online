import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator.js';
import { CorpusService } from './corpus.service.js';
import { VocabService } from './vocab.service.js';
import type {
  CorpusFilterQueryDto,
  DictionaryLookupQueryDto,
  TagQuestionDto,
} from './vocab.types.js';

@Controller('api/v1')
export class VocabController {
  constructor(
    private readonly vocabService: VocabService,
    private readonly corpusService: CorpusService,
  ) {}

  // ---------------------------------------------------------------------------
  // 1. Dictionary Lookup (Acceptance 4)
  // ---------------------------------------------------------------------------

  @Public()
  @Get('dictionary/lookup')
  async lookupDictionary(@Query() query: DictionaryLookupQueryDto) {
    return this.vocabService.lookupDictionary(query);
  }

  // ---------------------------------------------------------------------------
  // 2. Corpus Datasets (Acceptance 3)
  // ---------------------------------------------------------------------------

  @Public()
  @Get('datasets')
  async listDatasets() {
    return this.corpusService.listDatasets();
  }

  @Public()
  @Get('datasets/:id')
  async getDataset(@Param('id') id: string) {
    return this.corpusService.getDataset(id);
  }

  // ---------------------------------------------------------------------------
  // 3. Vocabulary Statistics & Frequency (DATA-03..10, Acceptance 1 & 2)
  // ---------------------------------------------------------------------------

  @Public()
  @Get('datasets/:id/vocabulary')
  async getDatasetVocabulary(
    @Param('id') id: string,
    @Query() query: CorpusFilterQueryDto = {},
  ) {
    return this.corpusService.getDatasetVocabulary(id, query);
  }

  // ---------------------------------------------------------------------------
  // 4. Grammar Statistics (DATA-19, DATA-20, DATA-21)
  // ---------------------------------------------------------------------------

  @Public()
  @Get('datasets/:id/grammar')
  async getDatasetGrammar(
    @Param('id') id: string,
    @Query() query: CorpusFilterQueryDto = {},
  ) {
    return this.corpusService.getDatasetGrammar(id, query);
  }

  // ---------------------------------------------------------------------------
  // 5. Kanji Statistics (DATA-22, DATA-23)
  // ---------------------------------------------------------------------------

  @Public()
  @Get('datasets/:id/kanji')
  async getDatasetKanji(
    @Param('id') id: string,
    @Query() query: CorpusFilterQueryDto = {},
  ) {
    return this.corpusService.getDatasetKanji(id, query);
  }

  // ---------------------------------------------------------------------------
  // 6. Question Tagging (QB-09)
  // ---------------------------------------------------------------------------

  @Post('vocab/tag-question')
  async tagQuestion(@Body() dto: TagQuestionDto) {
    const tags = await this.vocabService.tagQuestion(dto);
    return { tags };
  }
}
