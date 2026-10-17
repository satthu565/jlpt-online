import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDbClient, type DbClientInstance } from '../../db/client.js';
import { runMigrations } from '../../db/migrate.js';
import * as schema from '../../db/schema.js';
import { generateUuidV7 } from '../../common/utils/uuid.js';
import { ReportingService } from './reporting.service.js';

describe('V04 Reporting Reconciliation, CSV Escaping & Revenue Rounding', () => {
  let dbClient: DbClientInstance;
  let service: ReportingService;

  beforeEach(async () => {
    dbClient = await createDbClient();
    await runMigrations(dbClient);
    service = new ReportingService(dbClient);
  });

  afterEach(async () => {
    await dbClient.close();
  });

  describe('Acceptance 4: CSV Escaping & Formula Injection Protection', () => {
    it('trung hòa hoàn toàn các tiền tố nguy hiểm (=, +, -, @, \\t, \\r) bằng dấu nháy đơn', () => {
      // Formula injection vectors
      const formula1 = '=cmd|\'/C calc\'!A0';
      const formula2 = '+1234567890';
      const formula3 = '-200000';
      const formula4 = '@SUM(A1:A10)';
      const formula5 = '\tTAB_ATTACK';
      const formula6 = '\rCARRIAGE_ATTACK';

      expect(service.sanitizeCsvCell(formula1)).toBe(`'${formula1}`);
      expect(service.sanitizeCsvCell(formula2)).toBe(`'${formula2}`);
      expect(service.sanitizeCsvCell(formula3)).toBe(`'${formula3}`);
      expect(service.sanitizeCsvCell(formula4)).toBe(`'${formula4}`);
      expect(service.sanitizeCsvCell(formula5)).toBe(`'${formula5}`);
      expect(service.sanitizeCsvCell(formula6)).toBe(`"'\rCARRIAGE_ATTACK"`);
    });

    it('tuân thủ chuẩn RFC 4180: bọc dấu ngoặc kép và escape nháy kép khi ô chứa dấu phẩy, nháy hoặc xuống dòng', () => {
      const complexText = 'JLPT N1: "Ngữ pháp, từ vựng và đọc hiểu"\nXuống dòng';
      const sanitized = service.sanitizeCsvCell(complexText);

      expect(sanitized.startsWith('"')).toBe(true);
      expect(sanitized.endsWith('"')).toBe(true);
      expect(sanitized).toContain('""Ngữ pháp, từ vựng và đọc hiểu""');
    });

    it('kết hợp vừa có formula injection vừa có dấu phẩy: trung hòa an toàn', () => {
      const dangerousCsv = '=HYPERLINK("http://evil.local", "Click me")';
      const sanitized = service.sanitizeCsvCell(dangerousCsv);

      // Must prepend quote and then wrap because of comma and quotes
      expect(sanitized.startsWith('"\'=HYPERLINK')).toBe(true);
      expect(sanitized).toContain('""http://evil.local""');
    });

    it('xuất báo cáo CSV an toàn cho nhiều phân hệ báo cáo (corpus, provider-costs, conversion, funnel)', async () => {
      const csvCorpus = await service.exportReportToCsv('corpus');
      expect(csvCorpus).toContain('Section,Metric,Value');
      expect(csvCorpus).toContain('Summary,Total Datasets');

      const csvCosts = await service.exportReportToCsv('provider-costs');
      expect(csvCosts).toContain('Cost Category,Metric,Value');
      expect(csvCosts).toContain('AI,Prompt Tokens');

      const csvConversion = await service.exportReportToCsv('conversion');
      expect(csvConversion).toContain('Metric,Value');
      expect(csvConversion).toContain('Gross Revenue Minor');

      const csvFunnel = await service.exportReportToCsv('funnel');
      expect(csvFunnel).toContain('Step,Name,Users');
    });
  });

  describe('Acceptance 4: Revenue Rounding & Currency Minor Units', () => {
    it('doanh thu tính toán theo số nguyên (minor units) cho VND và JPY, không bị lỗi số thực (floating point)', async () => {
      const userA = generateUuidV7();
      const userB = generateUuidV7();

      await dbClient.db.insert(schema.users).values([
        { id: userA, email: 'student_a@test.local', role: 'student' },
        { id: userB, email: 'student_b@test.local', role: 'student' },
      ]);

      const orderA = generateUuidV7();
      const orderB = generateUuidV7();

      await dbClient.db.insert(schema.orders).values([
        {
          id: orderA,
          userId: userA,
          totalAmount: 199000,
          currency: 'VND',
          status: 'paid',
        },
        {
          id: orderB,
          userId: userB,
          totalAmount: 599000,
          currency: 'VND',
          status: 'paid',
        },
      ]);

      // Refund 199.000 VND
      await dbClient.db.insert(schema.refundRequests).values({
        id: generateUuidV7(),
        orderId: orderA,
        amount: 199000,
        status: 'refunded',
      });

      const conversion = await service.getConversionReport();

      // Invariant: Gross = 199000 + 599000 = 798000
      expect(conversion.grossRevenueMinor).toBe(798000);
      // Invariant: Refund = 199000
      // Invariant: Net = 798000 - 199000 = 599000
      expect(conversion.netRevenueMinor).toBe(599000);

      // ARPU = Math.round(599000 / 2) = 299500 (Exact integer, no decimals)
      expect(conversion.arpuMinor).toBe(299500);
      expect(Number.isInteger(conversion.arpuMinor)).toBe(true);

      // Conversion rate = 2 / 2 * 100 = 100%
      expect(conversion.conversionRate).toBe(100);
    });
  });

  describe('Corpus Report & Linguistic Aggregates', () => {
    it('trả về trạng thái empty khi chưa có ngữ liệu', async () => {
      const report = await service.getCorpusReport();
      expect(report.totalDatasets).toBe(0);
      expect(report.totalDocuments).toBe(0);
      expect(report.totalVocabOccurrences).toBe(0);
      expect(report.corpusHealthStatus).toBe('empty');
      expect(report.levelAggregates.length).toBe(5); // N1 to N5
    });

    it('tổng hợp chính xác số lượng tài liệu, từ vựng, ngữ pháp và kanji theo cấp độ', async () => {
      const datasetId = generateUuidV7();
      await dbClient.db.insert(schema.datasets).values({
        id: datasetId,
        name: 'JLPT Real Corpus 2026',
        version: 'v1.0.0',
      });

      await dbClient.db.insert(schema.datasetDocuments).values([
        {
          id: generateUuidV7(),
          datasetId,
          documentHash: 'hash_doc_1',
          content: '日本語能力試験N1の読解問題',
        },
        {
          id: generateUuidV7(),
          datasetId,
          documentHash: 'hash_doc_2',
          content: '日本語能力試験N2の聴解問題',
        },
      ]);

      const entryId = generateUuidV7();
      await dbClient.db.insert(schema.lexicalEntries).values({
        id: entryId,
        term: '怠る',
        level: 'N1',
        partOfSpeech: 'verb',
      });

      await dbClient.db.insert(schema.vocabOccurrences).values({
        id: generateUuidV7(),
        datasetId,
        entryId,
        count: 15,
      });

      await dbClient.db.insert(schema.corpusAggregates).values([
        {
          id: generateUuidV7(),
          level: 'N1',
          aggregateType: 'frequency',
          payload: { vocabCount: 1500, grammarCount: 120, kanjiCount: 800 },
          calculatedAt: new Date(),
        },
        {
          id: generateUuidV7(),
          level: 'N2',
          aggregateType: 'frequency',
          payload: { vocabCount: 2200, grammarCount: 150, kanjiCount: 600 },
          calculatedAt: new Date(),
        },
      ]);

      const report = await service.getCorpusReport();

      expect(report.totalDatasets).toBe(1);
      expect(report.totalDocuments).toBe(2);
      expect(report.totalVocabOccurrences).toBe(15);
      expect(report.corpusHealthStatus).toBe('healthy');

      const n1 = report.levelAggregates.find((l) => l.level === 'N1');
      expect(n1?.vocabCount).toBe(1500);
      expect(n1?.grammarCount).toBe(120);
      expect(n1?.kanjiCount).toBe(800);

      const n2 = report.levelAggregates.find((l) => l.level === 'N2');
      expect(n2?.vocabCount).toBe(2200);
    });
  });
});
