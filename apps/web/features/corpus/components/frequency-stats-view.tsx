'use client';

import React, { useState, useEffect } from 'react';
import { Card, Button, Badge, Alert, Spinner } from '@jlpt/ui';
import { CorpusClient } from '../services/corpus-client';
import type {
  CorpusFrequencyStatDto,
  LevelComparisonItemDto,
  YearlyTrendItemDto,
} from '../types';
import { useI18n } from '../../../lib/i18n';

export interface FrequencyStatsViewProps {
  className?: string;
}

const DEFAULT_FREQUENCY_STATS: CorpusFrequencyStatDto[] = [
  {
    term: '徹底',
    reading: 'てってい',
    meaning: 'Triệt để, thấu đáo',
    level: 'N2',
    occurrences: 142,
    relativeFrequencyPerThousand: 4.8,
  },
  {
    term: '納得',
    reading: 'なっとく',
    meaning: 'Thấu hiểu, đồng ý',
    level: 'N3',
    occurrences: 198,
    relativeFrequencyPerThousand: 6.2,
  },
  {
    term: '曖昧',
    reading: 'あいまい',
    meaning: 'Mơ hồ, lập lờ',
    level: 'N1',
    occurrences: 96,
    relativeFrequencyPerThousand: 3.1,
  },
  {
    term: '複雑',
    reading: 'ふくざつ',
    meaning: 'Phức tạp',
    level: 'N4',
    occurrences: 215,
    relativeFrequencyPerThousand: 7.4,
  },
  {
    term: '案内',
    reading: 'あんない',
    meaning: 'Hướng dẫn, thông báo',
    level: 'N5',
    occurrences: 320,
    relativeFrequencyPerThousand: 10.5,
  },
];

const DEFAULT_LEVEL_COMPARISONS: LevelComparisonItemDto[] = [
  { term: '徹底', counts: { N1: 28, N2: 84, N3: 30 } },
  { term: '納得', counts: { N1: 15, N2: 65, N3: 118 } },
  { term: '曖昧', counts: { N1: 68, N2: 24, N3: 4 } },
];

const DEFAULT_YEARLY_TRENDS: YearlyTrendItemDto[] = [
  { year: 2021, term: '徹底', count: 24 },
  { year: 2022, term: '徹底', count: 35 },
  { year: 2023, term: '徹底', count: 42 },
  { year: 2024, term: '徹底', count: 41 },
];

export function FrequencyStatsView({
  className = '',
}: FrequencyStatsViewProps): React.JSX.Element {
  const { t } = useI18n();
  const [client] = useState(() => new CorpusClient());
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [frequencyStats, setFrequencyStats] = useState<CorpusFrequencyStatDto[]>(DEFAULT_FREQUENCY_STATS);
  const [levelComparisons, setLevelComparisons] = useState<LevelComparisonItemDto[]>(DEFAULT_LEVEL_COMPARISONS);
  const [yearlyTrends, setYearlyTrends] = useState<YearlyTrendItemDto[]>(DEFAULT_YEARLY_TRENDS);

  const [generatingStudyList, setGeneratingStudyList] = useState(false);
  const [studyListNotice, setStudyListNotice] = useState<string | null>(null);
  const [studyListError, setStudyListError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setLoadError(null);

    Promise.all([
      client.getFrequencyRanking('jlpt-official', 50).then((data) => {
        if (active) setFrequencyStats(data || []);
      }),
      client.compareLevels('jlpt-official').then((data) => {
        if (active) setLevelComparisons(data || []);
      }),
      client.getYearlyTrends('jlpt-official').then((data) => {
        if (active) setYearlyTrends(data || []);
      }),
    ])
      .catch((err) => {
        if (active) {
          setLoadError(err instanceof Error ? err.message : 'Không thể tải dữ liệu thống kê từ vựng');
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [client]);

  const handleCreateStudyList = async () => {
    try {
      setGeneratingStudyList(true);
      setStudyListNotice(null);
      setStudyListError(null);
      const res = await client.createStudyList('jlpt-official', 'ALL', 50);
      setStudyListNotice(
        `Đã tạo thành công danh sách ôn tập gồm ${res.items?.length || 50} từ thường gặp nhất!`,
      );
    } catch {
      setStudyListError('Không thể tạo danh sách ôn tập. Vui lòng thử lại sau.');
    } finally {
      setGeneratingStudyList(false);
    }
  };

  return (
    <div
      data-testid="frequency-stats-view"
      className={`jlpt-frequency-stats space-y-6 ${className}`}
    >
      {/* Action Bar: Study list creation & CSV Export (DATA-18, SEO-04) */}
      <Card className="p-6 bg-blue-50/40 dark:bg-slate-900/60 border border-blue-200 dark:border-blue-900/60">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {t('seo.corpus.studyListTitle')}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              Hệ thống tự động phân tích ma trận đề thi để trích xuất các từ vựng xuất hiện nhiều nhất theo từng cấp độ.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              type="button"
              variant="primary"
              size="sm"
              loading={generatingStudyList}
              onClick={handleCreateStudyList}
              data-testid="create-study-list-btn"
            >
              📚 {t('seo.corpus.createStudyList')}
            </Button>

            <a
              href="/api/v1/datasets/jlpt-official/export?format=csv"
              download="jlpt-frequent-vocabulary.csv"
              style={{ textDecoration: 'none' }}
            >
              <Button
                type="button"
                variant="outline"
                size="sm"
                data-testid="export-csv-btn"
              >
                📥 {t('seo.corpus.exportCsv')}
              </Button>
            </a>

            <a
              href="/api/v1/datasets/jlpt-official/export?format=excel"
              download="jlpt-frequent-vocabulary.xlsx"
              style={{ textDecoration: 'none' }}
            >
              <Button
                type="button"
                variant="outline"
                size="sm"
                data-testid="export-excel-btn"
              >
                📊 {t('seo.corpus.exportExcel')}
              </Button>
            </a>
          </div>
        </div>

        {studyListNotice && (
          <Alert variant="success" className="mt-4 text-xs" data-testid="study-list-notice">
            {studyListNotice}
          </Alert>
        )}

        {studyListError && (
          <Alert variant="error" className="mt-4 text-xs" data-testid="study-list-error">
            {studyListError}
          </Alert>
        )}
      </Card>

      {isLoading && (
        <div className="flex justify-center items-center py-6" data-testid="frequency-loading-spinner">
          <Spinner size="md" aria-label="Đang tải dữ liệu thống kê từ vựng..." />
        </div>
      )}

      {loadError && (
        <Alert variant="error" className="text-xs" data-testid="frequency-load-error">
          {loadError}
        </Alert>
      )}

      {/* 1. Frequency Ranking Table */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>📈</span> Bảng xếp hạng từ vựng có tần suất xuất hiện cao nhất
          </h3>
          <span className="text-xs text-slate-400">
            Dữ liệu tổng hợp từ kỳ thi JLPT 2010–2024
          </span>
        </div>

        <div className="overflow-x-auto">
          <table
            className="w-full text-left text-xs"
            data-testid="frequency-table"
            style={{ borderCollapse: 'collapse' }}
          >
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase tracking-wider">
                <th className="py-2.5 px-3">Từ vựng (Kanji)</th>
                <th className="py-2.5 px-3">Cách đọc (Hiragana)</th>
                <th className="py-2.5 px-3">Ý nghĩa tiếng Việt</th>
                <th className="py-2.5 px-3">Cấp độ</th>
                <th className="py-2.5 px-3 text-right">Số lần xuất hiện</th>
                <th className="py-2.5 px-3 text-right">Tần suất tương đối</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {frequencyStats.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    Chưa có dữ liệu tần suất từ vựng
                  </td>
                </tr>
              ) : (
                frequencyStats.map((item) => (
                  <tr key={item.term} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-3 font-japanese font-bold text-sm text-slate-900 dark:text-slate-100">
                      {item.term}
                    </td>
                    <td className="py-3 px-3 font-japanese text-slate-600 dark:text-slate-400">
                      {item.reading}
                    </td>
                    <td className="py-3 px-3 text-slate-700 dark:text-slate-300">
                      {item.meaning}
                    </td>
                    <td className="py-3 px-3">
                      <Badge variant="primary" size="sm">
                        {item.level}
                      </Badge>
                    </td>
                    <td className="py-3 px-3 text-right font-extrabold text-blue-600 dark:text-blue-400">
                      {item.occurrences} lần
                    </td>
                    <td className="py-3 px-3 text-right text-slate-500">
                      {item.relativeFrequencyPerThousand} ‰
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 2. Grid: Cross-Level Comparison & Trends */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cross Level Comparison */}
        <Card className="p-6 space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>⚖️</span> So sánh phân bổ từ vựng qua các cấp độ (N1–N5)
          </h3>
          <div className="space-y-3" data-testid="cross-level-list">
            {levelComparisons.map((comp) => (
              <div
                key={comp.term}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 text-xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-japanese font-bold text-base text-slate-900 dark:text-slate-100">
                    {comp.term}
                  </span>
                </div>
                <div className="flex gap-2">
                  {Object.entries(comp.counts).map(([lvl, cnt]) => (
                    <div
                      key={lvl}
                      className="flex-1 text-center p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60"
                    >
                      <span className="block font-bold text-slate-500 text-[10px]">{lvl}</span>
                      <span className="font-extrabold text-blue-600 dark:text-blue-400 text-sm">
                        {cnt}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Yearly Trends */}
        <Card className="p-6 space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>📊</span> Xu hướng xuất hiện qua các năm
          </h3>
          <div className="space-y-3" data-testid="yearly-trends-list">
            {yearlyTrends.map((trend, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 font-bold">
                    {trend.year}
                  </span>
                  <span className="font-japanese font-bold text-slate-800 dark:text-slate-200">
                    {trend.term}
                  </span>
                </div>
                <span className="font-extrabold text-blue-600 dark:text-blue-400">
                  {trend.count} lần
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
