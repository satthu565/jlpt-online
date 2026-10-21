import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Injectable,
  Param,
  Patch,
  PipeTransform,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import type { AuthUserContext } from '../../common/types/auth.types.js';
import { CorpusService } from './corpus.service.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { VocabService, type LexiconListResult } from './vocab.service.js';
import type { KanjiListResult } from './kanji-list.js';
import { RateLimit } from '../../common/decorators/rate-limit.decorator.js';
import { isUuid } from '../../common/pipes/uuid-param.pipe.js';
import { computeHanViet, getHanVietForWord, getHanVietForKanji, getHanVietLicenseInfo } from './nlp/index.js';

@Injectable()
export class DatasetIdPipe implements PipeTransform<string, string> {
  transform(value: unknown): string {
    if (typeof value !== 'string') {
      throw new BadRequestException({
        code: 'INVALID_UUID',
        message: 'Mã dataset không hợp lệ',
      });
    }

    const trimmed = value.trim();
    if (isUuid(trimmed) || trimmed === 'jlpt-official') {
      return trimmed;
    }

    throw new BadRequestException({
      code: 'INVALID_UUID',
      message: `Mã dataset không đúng định dạng UUID hoặc slug hợp lệ: ${trimmed}`,
    });
  }
}
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

  @Roles('admin', 'editor', 'reviewer')
  @Get('admin/lexicon/entries')
  async adminListLexicon(
    @Query('q') q?: string,
    @Query('pos') pos?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<LexiconListResult> {
    return this.vocabService.listLexiconEntries({ q, pos, page: Number(page) || 1, pageSize: Number(pageSize) || 50 });
  }

  @Roles('admin', 'editor', 'reviewer')
  @Get('admin/lexicon/kanji')
  async adminListKanji(
    @Query('q') q?: string,
    @Query('level') level?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<KanjiListResult> {
    return this.vocabService.listKanjiEntries({ q, level, page: Number(page) || 1, pageSize: Number(pageSize) || 60 });
  }

  @Public()
  @Get('dictionary/lookup')
  async lookupDictionary(@Query() query: DictionaryLookupQueryDto) {
    return this.vocabService.lookupDictionary(query);
  }

  @Public()
  @Get('dictionary/hanviet')
  async getHanViet(
    @Query('text') text?: string,
    @Query('q') q?: string,
    @Query('reading') reading?: string,
  ) {
    const rawText = text || q || '';
    const readingText = reading?.trim() || undefined;
    const hanViet = getHanVietForWord(rawText, readingText);
    const computed = computeHanViet(rawText, readingText);
    const kanjiChars = Array.from(rawText).filter((c) => /[\u4e00-\u9faf\u3400-\u4dbf]/.test(c));
    const entries = kanjiChars.map((k) => ({
      kanji: k,
      hanViet: getHanVietForKanji(k),
    }));
    return {
      query: rawText,
      text: rawText,
      hanViet,
      confidence: computed.confidence,
      perKanji: computed.perKanji,
      entries,
      license: getHanVietLicenseInfo(),
    };
  }

  // H01: Hán Việt review (H03 admin) and learner reports (H02).
  @Roles('admin', 'editor', 'reviewer')
  @Get('admin/lexicon/hanviet')
  async adminListHanViet(
    @Query('confidence') confidence?: string,
    @Query('q') q?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.vocabService.listHanVietForReview({ confidence, q, page: Number(page) || 1, pageSize: Number(pageSize) || 50 });
  }

  @Roles('admin', 'editor', 'reviewer')
  @Patch('admin/lexicon/:id/hanviet')
  async adminUpdateHanViet(
    @Param('id') id: string,
    @Body() body: { hanViet?: unknown },
    @CurrentUser() user?: AuthUserContext,
  ) {
    return this.vocabService.updateEntryHanViet(id, body?.hanViet, user?.userId);
  }

  @RateLimit({ limit: 10, windowSec: 3600, keyPrefix: 'hanviet-reports' })
  @Post('dictionary/hanviet-reports')
  async reportHanViet(
    @Body() body: { entry?: unknown; reading?: unknown; suggestion?: unknown; note?: unknown },
    @CurrentUser() user?: AuthUserContext,
  ) {
    return this.vocabService.reportHanViet(body ?? {}, user?.userId);
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
  async getDataset(@Param('id', DatasetIdPipe) id: string) {
    return this.corpusService.getDataset(id);
  }

  // ---------------------------------------------------------------------------
  // 3. Vocabulary Statistics & Frequency (DATA-03..10, Acceptance 1 & 2)
  // ---------------------------------------------------------------------------

  @Public()
  @Get('datasets/:id/vocabulary')
  async getDatasetVocabulary(
    @Param('id', DatasetIdPipe) id: string,
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
    @Param('id', DatasetIdPipe) id: string,
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
    @Param('id', DatasetIdPipe) id: string,
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
    @Param('id', DatasetIdPipe) id: string,
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
    @Param('id', DatasetIdPipe) id: string,
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
    @Param('id', DatasetIdPipe) id: string,
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
  async getTimeSeries(@Param('id', DatasetIdPipe) id: string): Promise<TimeSeriesResponseDto> {
    return this.corpusService.getTimeSeries(id);
  }

  // ---------------------------------------------------------------------------
  // 11. DATA-15: Tạo danh sách từ thường gặp để ôn tập
  // ---------------------------------------------------------------------------

  @Public()
  @Get('datasets/:id/study-lists')
  async getStudyList(
    @Param('id', DatasetIdPipe) id: string,
    @Query() query: StudyListQueryDto = {},
  ): Promise<StudyListResponseDto> {
    return this.corpusService.createStudyList(id, query);
  }

  @Post('datasets/:id/study-lists')
  async createStudyList(
    @Param('id', DatasetIdPipe) id: string,
    @Body() dto: StudyListQueryDto = {},
  ): Promise<StudyListResponseDto> {
    return this.corpusService.createStudyList(id, dto);
  }

  // ---------------------------------------------------------------------------
  // 12. DATA-16: Kết nối từ vựng với sổ tay cá nhân
  // ---------------------------------------------------------------------------

  @Post('datasets/:id/add-to-notebook')
  async addToNotebook(
    @Param('id', DatasetIdPipe) id: string,
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
    @Param('id', DatasetIdPipe) id: string,
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
    @Param('id', DatasetIdPipe) id: string,
    @Query() query: DatasetExportQueryDto = {},
  ): Promise<DatasetExportResponseDto> {
    return this.corpusService.exportDataset(id, query);
  }

  @Public()
  @Post('datasets/:id/exports')
  async exportDatasetPost(
    @Param('id', DatasetIdPipe) id: string,
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
    @Param('id', DatasetIdPipe) id: string,
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
    @Param('id', DatasetIdPipe) id: string,
    @Param('patternId') patternId: string,
  ): Promise<GrammarPracticeResponseDto> {
    return this.corpusService.getGrammarPractice(id, patternId);
  }

  // ---------------------------------------------------------------------------
  // 17. DATA-26: Gợi ý danh sách ôn tập dựa trên mức phổ biến và mức độ chưa thành thạo
  // ---------------------------------------------------------------------------

  @Get('datasets/:id/recommendations')
  async getRecommendations(
    @Param('id', DatasetIdPipe) id: string,
    @Query() query: RecommendationQueryDto = {},
    @CurrentUser() user?: AuthUserContext,
  ): Promise<RecommendationResponseDto> {
    if (!user) {
      throw new UnauthorizedException('Authentication required for personalized recommendations.');
    }
    return this.corpusService.getRecommendations(user.userId, id, query);
  }
}
