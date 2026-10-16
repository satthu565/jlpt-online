import crypto from 'node:crypto';
import {
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';
import {
  CorpusAggregator,
  type ExamPackageInput,
} from '../../../../../packages/content-tools/dist/index.js';
import { DB_CLIENT } from '../../common/database/database.module.js';
import type { DbClientInstance } from '../../db/client.js';
import {
  corpusAggregates,
  datasetDocuments,
  datasets,
  lexiconLicenses,
} from '../../db/schema.js';
import { generateUuidV7 } from '../../common/utils/uuid.js';
import type {
  CorpusFilterQueryDto,
  CreateDatasetDto,
  DatasetDetailDto,
  DatasetItemDto,
} from './vocab.types.js';

@Injectable()
export class CorpusService {
  // In-memory corpus aggregators cached per datasetId
  private aggregators = new Map<string, CorpusAggregator>();

  constructor(@Inject(DB_CLIENT) private readonly dbClient: DbClientInstance) {}

  private getOrCreateAggregator(
    datasetId: string,
    meta?: { name?: string; version?: string; source?: string; date?: string },
  ): CorpusAggregator {
    let agg = this.aggregators.get(datasetId);
    if (!agg) {
      agg = new CorpusAggregator({
        datasetId,
        name: meta?.name,
        version: meta?.version,
        source: meta?.source,
        date: meta?.date,
      });
      this.aggregators.set(datasetId, agg);
    }
    return agg;
  }

  /**
   * Tạo một tập ngữ liệu mới (Corpus Dataset) (Acceptance 3).
   */
  async createDataset(dto: CreateDatasetDto) {
    const id = dto.id ?? generateUuidV7();

    // Default license if not specified
    let licenseId = dto.licenseId;
    if (!licenseId) {
      const existingLicenses = await this.dbClient.db
        .select()
        .from(lexiconLicenses)
        .limit(1);
      if (existingLicenses.length > 0) {
        licenseId = existingLicenses[0]!.id;
      } else {
        const newLicId = generateUuidV7();
        await this.dbClient.db.insert(lexiconLicenses).values({
          id: newLicId,
          provider: 'EDRDG JMdict',
          license: 'CC-BY-SA-4.0',
          rightsTerms:
            'Electronic Dictionary Research and Development Group (EDRDG) JMdict / CC-BY-SA 4.0',
        });
        licenseId = newLicId;
      }
    }

    await this.dbClient.db.insert(datasets).values({
      id,
      name: dto.name,
      version: dto.version,
      licenseId,
    });

    this.getOrCreateAggregator(id, {
      name: dto.name,
      version: dto.version,
      source: dto.source,
      date: dto.date,
    });

    return { id, name: dto.name, version: dto.version, licenseId };
  }

  /**
   * Danh sách tập ngữ liệu (GET /api/v1/datasets).
   */
  async listDatasets(): Promise<{ items: DatasetItemDto[] }> {
    const rows = await this.dbClient.db.select().from(datasets);

    const items: DatasetItemDto[] = rows.map(
      (r: { id: string; name: string; version: string }) => {
        const agg = this.aggregators.get(r.id);
        const totalWords = agg ? agg.getMetadata().totalTokens : 0;
        return {
          id: r.id,
          name: r.name,
          version: r.version,
          totalWords,
        };
      },
    );

    return { items };
  }

  /**
   * Chi tiết tập ngữ liệu (GET /api/v1/datasets/:id) (Acceptance 3: version, size, source, date).
   */
  async getDataset(id: string): Promise<DatasetDetailDto> {
    const rows = await this.dbClient.db
      .select()
      .from(datasets)
      .where(eq(datasets.id, id))
      .limit(1);

    if (rows.length === 0) {
      throw new NotFoundException(`Dataset '${id}' not found`);
    }

    const d = rows[0]!;
    let license = 'CC-BY-SA-4.0';
    if (d.licenseId) {
      const lics = await this.dbClient.db
        .select()
        .from(lexiconLicenses)
        .where(eq(lexiconLicenses.id, d.licenseId))
        .limit(1);
      if (lics.length > 0) {
        license = lics[0]!.license;
      }
    }

    const agg = this.getOrCreateAggregator(id, { name: d.name, version: d.version });
    const meta = agg.getMetadata();

    return {
      id: d.id,
      name: d.name,
      version: d.version,
      license,
      licenseId: d.licenseId,
      documentCount: meta.documentCount,
      totalTokens: meta.totalTokens,
      source: meta.source,
      date: meta.date,
      createdAt: d.createdAt?.toISOString(),
    };
  }

  /**
   * Nhập đề thi/văn bản vào ngữ liệu (DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, DATA-06, DATA-07, DATA-08).
   */
  async ingestExamPackage(datasetId: string, pkg: ExamPackageInput) {
    await this.getDataset(datasetId); // ensure dataset exists

    const agg = this.getOrCreateAggregator(datasetId);
    agg.ingestExam(pkg);

    // Save document record to DB
    const docHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(pkg))
      .digest('hex');

    const docId = generateUuidV7();
    await this.dbClient.db.insert(datasetDocuments).values({
      id: docId,
      datasetId,
      documentHash: docHash,
      content: pkg.exam.title,
      metadata: {
        packageId: pkg.packageId,
        source: pkg.source,
        title: pkg.exam.title,
      },
    });

    // Save aggregate summary to corpusAggregates table
    const meta = agg.getMetadata();
    for (const [lvl, count] of Object.entries(meta.levels)) {
      const countNum = Number(count);
      if (countNum > 0) {
        await this.dbClient.db.insert(corpusAggregates).values({
          id: generateUuidV7(),
          level: lvl,
          aggregateType: 'vocab_summary',
          payload: {
            datasetId,
            tokenCount: countNum,
            uniqueVocabCount: meta.uniqueVocabCount,
            source: meta.source,
          },
        });
      }
    }

    return {
      documentId: docId,
      documentHash: docHash,
      datasetId,
      metadata: meta,
    };
  }

  /**
   * Thống kê từ vựng theo cấp độ và tần suất xuất hiện (GET /api/v1/datasets/:id/vocabulary).
   */
  async getDatasetVocabulary(id: string, filter: CorpusFilterQueryDto = {}) {
    await this.getDataset(id);
    const agg = this.getOrCreateAggregator(id);
    return agg.getVocabularyAnalysis(filter);
  }

  /**
   * Thống kê ngữ pháp theo cấp độ (GET /api/v1/datasets/:id/grammar) (DATA-19, DATA-20, DATA-21).
   */
  async getDatasetGrammar(id: string, _filter: CorpusFilterQueryDto = {}) {
    await this.getDataset(id);
    const agg = this.getOrCreateAggregator(id);
    return agg.getGrammarAnalysis();
  }

  /**
   * Thống kê Hán tự theo cấp độ (GET /api/v1/datasets/:id/kanji) (DATA-22, DATA-23).
   */
  async getDatasetKanji(id: string, _filter: CorpusFilterQueryDto = {}) {
    await this.getDataset(id);
    const agg = this.getOrCreateAggregator(id);
    return agg.getKanjiAnalysis();
  }
}
