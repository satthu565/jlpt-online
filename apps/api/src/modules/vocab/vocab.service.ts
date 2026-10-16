import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import {
  DictionaryAdapter,
  tagQuestion,
  type QuestionTagItem,
} from './nlp/index.js';
import { DB_CLIENT } from '../../common/database/database.module.js';
import type { DbClientInstance } from '../../db/client.js';
import {
  entryMeanings,
  entryReadings,
  lexicalEntries,
  lexiconLicenses,
  questionTags,
} from '../../db/schema.js';
import { generateUuidV7 } from '../../common/utils/uuid.js';
import type {
  DictionaryLookupQueryDto,
  DictionaryLookupResponseDto,
  QuestionTagResultDto,
  TagQuestionDto,
} from './vocab.types.js';

@Injectable()
export class VocabService {
  private dictionaryAdapter = new DictionaryAdapter({ providerType: 'sandbox' });

  constructor(@Inject(DB_CLIENT) private readonly dbClient: DbClientInstance) {}

  /**
   * Tra cứu từ vựng trong từ điển có bản quyền (Acceptance 4).
   */
  async lookupDictionary(
    dto: DictionaryLookupQueryDto,
  ): Promise<DictionaryLookupResponseDto> {
    if (!dto.text || dto.text.trim().length === 0) {
      throw new BadRequestException('Query text is required for dictionary lookup');
    }

    const trimmed = dto.text.trim();
    const locale = dto.locale ?? 'vi';

    // 1. Try DB lexical entries if populated
    try {
      const dbEntries = await this.dbClient.db
        .select()
        .from(lexicalEntries)
        .where(eq(lexicalEntries.term, trimmed))
        .limit(1);

      if (dbEntries.length > 0) {
        const entry = dbEntries[0]!;
        const readings = await this.dbClient.db
          .select()
          .from(entryReadings)
          .where(eq(entryReadings.entryId, entry.id));
        const meanings = await this.dbClient.db
          .select()
          .from(entryMeanings)
          .where(eq(entryMeanings.entryId, entry.id));

        let licenseName = 'CC-BY-SA-4.0';
        let attribution =
          'Electronic Dictionary Research and Development Group (EDRDG) JMdict / CC-BY-SA 4.0';

        if (entry.licenseId) {
          const lic = await this.dbClient.db
            .select()
            .from(lexiconLicenses)
            .where(eq(lexiconLicenses.id, entry.licenseId))
            .limit(1);
          if (lic.length > 0) {
            licenseName = lic[0]!.license;
            attribution = `${lic[0]!.provider} / ${lic[0]!.license}`;
          }
        }

        return {
          entry: entry.term,
          readings: readings.map((r: { reading: string }) => r.reading),
          meanings: meanings.map((m: { meaning: string }) => m.meaning),
          examples: [],
          license: licenseName,
          attribution,
          level: entry.level ?? undefined,
          partOfSpeech: entry.partOfSpeech ?? undefined,
          status: 'READY',
        };
      }
    } catch {
      // Fall through to dictionary adapter if DB not populated
    }

    // 2. Fallback to dictionary adapter with sandbox & full license/attribution
    const result = this.dictionaryAdapter.lookup(trimmed, locale);
    if (!result) {
      throw new NotFoundException(`No dictionary entry found for '${trimmed}'`);
    }

    return {
      entry: result.entry,
      readings: result.readings,
      meanings: result.meanings,
      examples: result.examples,
      license: result.license,
      attribution: result.attribution,
      level: result.level,
      partOfSpeech: result.partOfSpeech,
      status: result.status,
    };
  }

  /**
   * Tự động gắn tag từ vựng, target_vocab, kanji, ngữ pháp cho câu hỏi (QB-09).
   */
  async tagQuestion(dto: TagQuestionDto): Promise<QuestionTagResultDto[]> {
    const generatedTags: QuestionTagItem[] = tagQuestion({
      id: dto.questionId,
      skill: dto.skill,
      level: dto.level,
      mondai: dto.mondai,
      stem: dto.stem,
      options: dto.options,
      passage: dto.passage,
    });

    // If questionId provided, persist to questionTags table
    if (dto.questionId) {
      for (const t of generatedTags) {
        await this.dbClient.db.insert(questionTags).values({
          id: generateUuidV7(),
          questionId: dto.questionId,
          tag: t.tag,
          category: t.category,
        });
      }
    }

    return generatedTags.map((t) => ({ tag: t.tag, category: t.category }));
  }

  /**
   * Lấy danh sách tags đã gắn cho một câu hỏi.
   */
  async getQuestionTags(questionId: string): Promise<QuestionTagResultDto[]> {
    const rows = await this.dbClient.db
      .select()
      .from(questionTags)
      .where(eq(questionTags.questionId, questionId));
    return rows.map((r: { tag: string; category: string | null }) => ({
      tag: r.tag,
      category: r.category ?? 'general',
    }));
  }
}
