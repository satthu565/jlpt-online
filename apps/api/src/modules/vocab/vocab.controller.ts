import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import type { AuthUserContext } from '../../common/types/auth.types.js';
import { CorpusService } from './corpus.service.js';
import { VocabService } from './vocab.service.js';
import type {
  AddToNotebookDto,
  AddToNotebookResponseDto,
  CompareWithLearnedResponseDto,
  CorpusFilterQueryDto,
  CorpusQuestionDto,
  DatasetExportQueryDto,
  DatasetExportResponseDto,
  DictionaryLookupQueryDto,
  GrammarPracticeResponseDto,
  JlptLevel,
  LevelComparisonResponseDto,
  RecommendationQueryDto,
  RecommendationResponseDto,
  StudyListQueryDto,
  StudyListResponseDto,
  TagQuestionDto,
  TimeSeriesResponseDto,
  VocabStatsResponseDto,
  YearlyTrendsResponseDto,
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

  // ---------------------------------------------------------------------------
  // 7. DATA-11: Questions containing a word (with zero answer leak guard)
  // ---------------------------------------------------------------------------

  @Public()
  @Get('datasets/:id/vocabulary/:term/questions')
  async getQuestionsForWord(
    @Param('id') id: string,
    @Param('term') term: string,
    @Query('level') level?: JlptLevel,
    @Query('limit') limit?: number,
    @CurrentUser() user?: AuthUserContext,
  ): Promise<CorpusQuestionDto[]> {
    return this.corpusService.getQuestionsForWord(id, term, {
      level,
      limit: limit ? Number(limit) : undefined,
      userId: user?.userId,
    });
  }

  // ---------------------------------------------------------------------------
  // 8. DATA-12: Tra cứu một từ để xem thống kê
  // ---------------------------------------------------------------------------

  @Public()
  @Get('datasets/:id/vocabulary/:term/stats')
  async getWordStatistics(
    @Param('id') id: string,
    @Param('term') term: string,
  ): Promise<VocabStatsResponseDto> {
    return this.corpusService.getWordStatistics(id, term);
  }

  // ---------------------------------------------------------------------------
  // 9. DATA-13: So sánh mức xuất hiện giữa các cấp độ
  // ---------------------------------------------------------------------------

  @Public()
  @Get('datasets/:id/compare/levels')
  async compareLevels(
    @Param('id') id: string,
    @Query('terms') terms?: string | string[],
  ): Promise<LevelComparisonResponseDto> {
    const termsArray = terms
      ? Array.isArray(terms)
        ? terms
        : terms.split(',').map((t) => t.trim())
      : undefined;
    return this.corpusService.compareLevels(id, termsArray);
  }

  // ---------------------------------------------------------------------------
  // 10. DATA-14: Thống kê theo khoảng thời gian
  // ---------------------------------------------------------------------------

  @Public()
  @Get('datasets/:id/time-series')
  async getTimeSeries(@Param('id') id: string): Promise<TimeSeriesResponseDto> {
    return this.corpusService.getTimeSeries(id);
  }

  // ---------------------------------------------------------------------------
  // 11. DATA-15: Tạo danh sách từ thường gặp để ôn tập
  // ---------------------------------------------------------------------------

  @Public()
  @Get('datasets/:id/study-lists')
  async getStudyList(
    @Param('id') id: string,
    @Query() query: StudyListQueryDto = {},
  ): Promise<StudyListResponseDto> {
    return this.corpusService.createStudyList(id, query);
  }

  @Post('datasets/:id/study-lists')
  async createStudyList(
    @Param('id') id: string,
    @Body() dto: StudyListQueryDto = {},
  ): Promise<StudyListResponseDto> {
    return this.corpusService.createStudyList(id, dto);
  }

  // ---------------------------------------------------------------------------
  // 12. DATA-16: Kết nối từ vựng với sổ tay cá nhân
  // ---------------------------------------------------------------------------

  @Post('datasets/:id/add-to-notebook')
  async addToNotebook(
    @Param('id') id: string,
    @Body() dto: AddToNotebookDto,
    @CurrentUser() user: AuthUserContext | undefined,
  ): Promise<AddToNotebookResponseDto> {
    if (!user) {
      throw new UnauthorizedException('Authentication required to save to notebook.');
    }
    return this.corpusService.addWordsToNotebook(user.userId, id, dto);
  }

  // ---------------------------------------------------------------------------
  // 13. DATA-17: So sánh danh sách từ thường gặp với các từ đã học
  // ---------------------------------------------------------------------------

  @Get('datasets/:id/compare-with-learned')
  async compareWithLearned(
    @Param('id') id: string,
    @Query('level') level?: JlptLevel,
    @Query('limit') limit?: number,
    @CurrentUser() user?: AuthUserContext,
  ): Promise<CompareWithLearnedResponseDto> {
    if (!user) {
      throw new UnauthorizedException('Authentication required to compare with learned words.');
    }
    return this.corpusService.compareWithLearned(user.userId, id, {
      level,
      limit: limit ? Number(limit) : undefined,
    });
  }

  // ---------------------------------------------------------------------------
  // 14. DATA-18 & Acceptance 6: Xuất báo cáo CSV / Excel
  // ---------------------------------------------------------------------------

  @Public()
  @Get('datasets/:id/export')
  async exportDatasetGet(
    @Param('id') id: string,
    @Query() query: DatasetExportQueryDto = {},
  ): Promise<DatasetExportResponseDto> {
    return this.corpusService.exportDataset(id, query);
  }

  @Public()
  @Post('datasets/:id/exports')
  async exportDatasetPost(
    @Param('id') id: string,
    @Body() dto: DatasetExportQueryDto = {},
  ): Promise<DatasetExportResponseDto> {
    return this.corpusService.exportDataset(id, dto);
  }

  // ---------------------------------------------------------------------------
  // 15. DATA-24: So sánh xu hướng xuất hiện qua các năm
  // ---------------------------------------------------------------------------

  @Public()
  @Get('datasets/:id/trends')
  async getYearlyTrends(
    @Param('id') id: string,
    @Query('minOccurrences') minOccurrences?: number,
  ): Promise<YearlyTrendsResponseDto> {
    return this.corpusService.getYearlyTrends(id, {
      minOccurrences: minOccurrences ? Number(minOccurrences) : undefined,
    });
  }

  // ---------------------------------------------------------------------------
  // 16. DATA-25: Liên kết mẫu ngữ pháp với bài luyện tương ứng
  // ---------------------------------------------------------------------------

  @Public()
  @Get('datasets/:id/grammar/:patternId/practice')
  async getGrammarPractice(
    @Param('id') id: string,
    @Param('patternId') patternId: string,
  ): Promise<GrammarPracticeResponseDto> {
    return this.corpusService.getGrammarPractice(id, patternId);
  }

  // ---------------------------------------------------------------------------
  // 17. DATA-26: Gợi ý danh sách ôn tập dựa trên mức phổ biến và mức độ chưa thành thạo
  // ---------------------------------------------------------------------------

  @Get('datasets/:id/recommendations')
  async getRecommendations(
    @Param('id') id: string,
    @Query() query: RecommendationQueryDto = {},
    @CurrentUser() user?: AuthUserContext,
  ): Promise<RecommendationResponseDto> {
    if (!user) {
      throw new UnauthorizedException('Authentication required for personalized recommendations.');
    }
    return this.corpusService.getRecommendations(user.userId, id, query);
  }
}
