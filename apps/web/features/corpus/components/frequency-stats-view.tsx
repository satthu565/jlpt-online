'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@jlpt/ui/components/card';
import { Button } from '@jlpt/ui/components/button';
import { Badge } from '@jlpt/ui/components/badge';
import { Alert } from '@jlpt/ui/components/alert';
import { Spinner } from '@jlpt/ui/components/spinner';
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

export function FrequencyStatsView({
  className = '',
}: FrequencyStatsViewProps): React.JSX.Element {
  const { t } = useI18n();
  const [client] = useState(() => new CorpusClient());
  const [datasetId, setDatasetId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [frequencyStats, setFrequencyStats] = useState<CorpusFrequencyStatDto[]>([]);
  const [levelComparisons, setLevelComparisons] = useState<LevelComparisonItemDto[]>([]);
  const [yearlyTrends, setYearlyTrends] = useState<YearlyTrendItemDto[]>([]);

  const [generatingStudyList, setGeneratingStudyList] = useState(false);
  const [studyListNotice, setStudyListNotice] = useState<string | null>(null);
  const [studyListError, setStudyListError] = useState<string | null>(null);

  // 1. Fetch real dataset ID dynamically from API (no hardcoded IDs)
  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setLoadError(null);
    client
      .listDatasets()
      .then((res) => {
        if (active) {
          if (res.items && res.items.length > 0) {
            setDatasetId(res.items[0]!.id);
          } else {
            setIsLoading(false);
          }
        }
      })
      .catch((err) => {
        if (active) {
          setLoadError(err instanceof Error ? err.message : 'Không thể tải danh sách tập ngữ liệu');
          setIsLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [client]);

  // 2. Fetch frequency stats, comparisons, and trends using the real datasetId
  useEffect(() => {
    if (!datasetId) return;
    let active = true;
    setIsLoading(true);
    setLoadError(null);

    Promise.all([
      client.getFrequencyRanking(datasetId, 50).then((data) => {
        if (active) setFrequencyStats(data || []);
      }),
      client.compareLevels(datasetId).then((data) => {
        if (active) setLevelComparisons(data || []);
      }),
      client.getYearlyTrends(datasetId).then((data) => {
        if (active) setYearlyTrends(data || []);
      }),
    ])
      .catch((err) => {
        if (active) {
          setLoadError(err instanceof Error ? err.message : 'Không thể tải dữ liệu thống kê từ vựng');
          setFrequencyStats([]);
          setLevelComparisons([]);
          setYearlyTrends([]);
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [client, datasetId]);

  const handleCreateStudyList = async () => {
    if (!datasetId) return;
    try {
      setGeneratingStudyList(true);
      setStudyListNotice(null);
      setStudyListError(null);
      const res = await client.createStudyList(datasetId, 'ALL', 50);
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
              href={datasetId ? `/api/v1/datasets/${datasetId}/export?format=csv` : undefined}
              download={datasetId ? 'jlpt-frequent-vocabulary.csv' : undefined}
              aria-disabled={!datasetId}
              style={{ textDecoration: 'none' }}
            >
              <Button
                type="button"
                variant="outline"
                size="sm"
                data-testid="export-csv-btn"
                disabled={!datasetId}
              >
                📥 {t('seo.corpus.exportCsv')}
              </Button>
            </a>

            <a
              href={datasetId ? `/api/v1/datasets/${datasetId}/export?format=excel` : undefined}
              download={datasetId ? 'jlpt-frequent-vocabulary.xlsx' : undefined}
              aria-disabled={!datasetId}
              style={{ textDecoration: 'none' }}
            >
              <Button
                type="button"
                variant="outline"
                size="sm"
                data-testid="export-excel-btn"
                disabled={!datasetId}
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
